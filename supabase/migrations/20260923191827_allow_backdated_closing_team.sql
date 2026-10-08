create or replace function public.gestao_operar(p_ator uuid,p_acao text,p_dados jsonb) returns uuid
language plpgsql security invoker set search_path='' as $$
declare rid uuid; u uuid; e uuid; gestor boolean; f public.gestao_fechamentos%rowtype;
 c public.gestao_colaboradores%rowtype; item jsonb; linha public.gestao_fechamento_equipe%rowtype;
 trabalho numeric; pago numeric; saldo numeric; presenca boolean; ultimo bigint; lista jsonb;
begin
 if p_acao not in ('salvar','confirmar','reabrir') then return gestao_private.fechamento_base(p_ator,p_acao,p_dados);end if;
 u:=(p_dados->>'unidade_id')::uuid;rid:=(p_dados->>'id')::uuid;
 select empresa_id into e from public.gestao_unidades where id=u;
 if gestao_private.papel_gestao(p_ator,e) is null then raise exception 'Empresa ou módulo sem acesso vigente.';end if;
 gestor:=gestao_private.papel_gestao(p_ator,e)='gestor';
 perform pg_advisory_xact_lock(hashtextextended(rid::text,0));
 select * into f from public.gestao_fechamentos where id=rid for update;
 if found and f.unidade_id<>u then raise exception 'Fechamento de outra unidade.';end if;
 if p_acao='salvar' then
   -- Existing stock, sales, receipt and version checks stay in the original implementation.
   rid:=gestao_private.fechamento_base(p_ator,p_acao,p_dados);
   if not (p_dados ? 'equipe') then
     if jsonb_array_length(p_dados->'itens')=0 and jsonb_array_length(coalesce(p_dados->'despesas','[]'::jsonb))=0 and not exists(select 1 from public.gestao_fechamento_equipe where fechamento_id=rid) then
       raise exception 'Informe produtos vendidos, despesas ou lançamentos da equipe.';
     end if;
     return rid;
   end if;
   if not gestor then raise exception 'A equipe do fechamento deve ser gerenciada por um gestor.';end if;
   lista:=p_dados->'equipe';
   if jsonb_typeof(lista) is distinct from 'array' or jsonb_array_length(lista)>500 then raise exception 'Equipe inválida (máximo de 500 colaboradores).';end if;
   if (select count(*)<>count(distinct value->>'colaborador_id') from jsonb_array_elements(lista)) then raise exception 'Há colaboradores repetidos.';end if;
   delete from public.gestao_fechamento_equipe where fechamento_id=rid;
   for item in select value from jsonb_array_elements(lista) loop
     select * into c from public.gestao_colaboradores where id=(item->>'colaborador_id')::uuid and unidade_id=u;
     if not found then raise exception 'Colaborador não encontrado nesta unidade.';end if;
     presenca:=coalesce((item->>'presente')::boolean,false);
     trabalho:=coalesce((item->>'valor_trabalho')::numeric,0);pago:=coalesce((item->>'valor_pago')::numeric,0);
     if trabalho::text in ('NaN','Infinity','-Infinity') or pago::text in ('NaN','Infinity','-Infinity')
       or trabalho<0 or pago<0 or trabalho>=1000000000 or pago>=1000000000 or trabalho<>round(trabalho,2) or pago<>round(pago,2)
       or (presenca and trabalho<=0) or (not presenca and trabalho<>0) then raise exception 'Informe valores válidos para o trabalho e pagamento da equipe.';end if;
     if presenca and not c.ativo then raise exception 'Não é possível registrar presença para um colaborador inativo.';end if;
     if presenca or pago>0 then
       insert into public.gestao_fechamento_equipe(fechamento_id,empresa_id,unidade_id,colaborador_id,nome,presente,valor_trabalho,valor_pago)
       values(rid,e,u,c.id,c.nome,presenca,trabalho,pago);
     end if;
   end loop;
   if jsonb_array_length(p_dados->'itens')=0 and jsonb_array_length(coalesce(p_dados->'despesas','[]'::jsonb))=0 and not exists(select 1 from public.gestao_fechamento_equipe where fechamento_id=rid) then
     raise exception 'Informe produtos vendidos, despesas ou lançamentos da equipe.';
   end if;
   return rid;
 end if;
 if not gestor then raise exception 'Esta ação exige acesso de gestor.';end if;
 if f.id is null then raise exception 'Fechamento não encontrado.';end if;
 if (p_acao='confirmar' and f.status='conferido') or (p_acao='reabrir' and f.status='rascunho') then
   return gestao_private.fechamento_base(p_ator,p_acao,p_dados);
 end if;
 if f.versao is distinct from (p_dados->>'versao')::integer then raise exception 'O fechamento foi alterado. Atualize antes de continuar.';end if;
 -- Locks serialize balances across simultaneous closings and employee edits.
 for linha in select * from public.gestao_fechamento_equipe where fechamento_id=rid order by colaborador_id loop
   perform 1 from public.gestao_colaboradores where id=linha.colaborador_id for update;
 end loop;
 for linha in select * from public.gestao_fechamento_equipe where fechamento_id=rid order by colaborador_id loop
   if p_acao='confirmar' then
     if f.data>(now() at time zone 'America/Sao_Paulo')::date then raise exception 'A equipe só pode ser confirmada em fechamentos com data até hoje.';end if;
     if linha.presente and exists(select 1 from public.gestao_equipe_extrato where colaborador_id=linha.colaborador_id and tipo='trabalho' and not estornado and data=f.data) then
       raise exception 'A presença de % já foi registrada nesta data.',linha.nome;
     end if;
     if linha.presente and not (select ativo from public.gestao_colaboradores where id=linha.colaborador_id) then raise exception 'O colaborador % está inativo.',linha.nome;end if;
     select coalesce(sum(case when tipo='trabalho' then valor else -valor end),0) into saldo
     from public.gestao_equipe_extrato where colaborador_id=linha.colaborador_id and not estornado;
     if linha.valor_pago>saldo+linha.valor_trabalho then raise exception 'O pagamento de % supera o saldo disponível. Atualize o fechamento.',linha.nome;end if;
     -- Backdated work is allowed. A backdated payment cannot spend future earnings
     -- or consume a balance already needed by a subsequent confirmed payment.
     if linha.valor_pago>linha.valor_trabalho and exists(
       select 1 from (
         select dia, sum(delta) over(order by dia rows unbounded preceding) as acumulado
         from (
           select dia,sum(valor) as delta from (
             select data as dia,case when tipo='trabalho' then valor else -valor end as valor
             from public.gestao_equipe_extrato where colaborador_id=linha.colaborador_id and not estornado
             union all select f.data,linha.valor_trabalho-linha.valor_pago
           ) movimentos group by dia
         ) dias
       ) historico where dia>=f.data and acumulado<0
     ) then
       raise exception 'O pagamento de % deixaria o saldo negativo na data informada ou em um pagamento posterior. Confira a data e o valor.',linha.nome;
     end if;
     if linha.valor_trabalho>0 then
       insert into public.gestao_equipe_extrato(empresa_id,unidade_id,colaborador_id,fechamento_id,tipo,data,valor,nome,criado_por)
       values(e,u,linha.colaborador_id,rid,'trabalho',f.data,linha.valor_trabalho,linha.nome,p_ator);
     end if;
     if linha.valor_pago>0 then
       insert into public.gestao_equipe_extrato(empresa_id,unidade_id,colaborador_id,fechamento_id,tipo,data,valor,nome,criado_por)
       values(e,u,linha.colaborador_id,rid,'pagamento',f.data,linha.valor_pago,linha.nome,p_ator);
     end if;
     update public.gestao_fechamento_equipe set saldo_anterior=saldo,saldo_final=saldo+linha.valor_trabalho-linha.valor_pago where fechamento_id=rid and colaborador_id=linha.colaborador_id;
   else
     select max(id) into ultimo from public.gestao_equipe_extrato where fechamento_id=rid and colaborador_id=linha.colaborador_id and not estornado;
     if exists(select 1 from public.gestao_equipe_extrato where colaborador_id=linha.colaborador_id and not estornado and id>ultimo and fechamento_id is distinct from rid) then
       raise exception 'Existem lançamentos posteriores de %. Reabra primeiro os fechamentos posteriores para preservar o saldo.',linha.nome;
     end if;
     update public.gestao_equipe_extrato set estornado=true,motivo_estorno=trim(p_dados->>'motivo') where fechamento_id=rid and colaborador_id=linha.colaborador_id and not estornado;
   end if;
 end loop;
 -- Any failure (including stock, gross reconciliation or justification) rolls back payroll too.
 return gestao_private.fechamento_base(p_ator,p_acao,p_dados);
end $$;
revoke all on function public.gestao_operar(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.gestao_operar(uuid,text,jsonb) to service_role;
