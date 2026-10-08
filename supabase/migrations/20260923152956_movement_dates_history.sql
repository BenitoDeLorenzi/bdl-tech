alter table public.gestao_movimentos add column data_movimento date, add column criado_por_nome text;
update public.gestao_movimentos m set
 data_movimento=case when m.tipo='venda' then coalesce((select f.data from public.gestao_fechamentos f where f.id=m.fechamento_id),(m.created_at at time zone 'America/Sao_Paulo')::date) else (m.created_at at time zone 'America/Sao_Paulo')::date end,
 criado_por_nome=coalesce((select p.nome from public.perfis p where p.id=m.criado_por),'Usuário');
alter table public.gestao_movimentos alter column data_movimento set not null, alter column criado_por_nome set not null;
create function gestao_private.preparar_movimento() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if new.tipo='venda' and new.fechamento_id is not null then
   select data into new.data_movimento from public.gestao_fechamentos where id=new.fechamento_id;
 end if;
 new.data_movimento:=coalesce(new.data_movimento,(now() at time zone 'America/Sao_Paulo')::date);
 if new.data_movimento<'1900-01-01'::date or new.data_movimento>(now() at time zone 'America/Sao_Paulo')::date then
   raise exception 'Informe uma data de movimentação válida, até hoje.';
 end if;
 select coalesce(nome,'Usuário') into new.criado_por_nome from public.perfis where id=new.criado_por;
 return new;
end $$;
revoke all on function gestao_private.preparar_movimento() from public,anon,authenticated;
grant execute on function gestao_private.preparar_movimento() to service_role;
create trigger gestao_movimentos_preparar before insert on public.gestao_movimentos
 for each row execute function gestao_private.preparar_movimento();
create index gestao_movimentos_historico_idx on public.gestao_movimentos(unidade_id,data_movimento desc,created_at desc,id desc);
create index gestao_movimentos_produto_data_idx on public.gestao_movimentos(unidade_id,produto_id,data_movimento desc);
create or replace function public.gestao_operar(p_ator uuid,p_acao text,p_dados jsonb)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
 v_admin boolean; v_gestor boolean; v_empresa uuid; v_unidade uuid; v_id uuid;
 v_f public.gestao_fechamentos%rowtype; v_p public.gestao_produtos%rowtype;
 v_item jsonb; v_pag jsonb; v_itens jsonb := '[]'; v_q numeric; v_valor numeric;
 v_custo numeric; v_total numeric := 0; v_recebido numeric := 0; v_nome text;
begin
 if p_acao in ('categoria','produto') then return gestao_private.catalogo(p_ator,p_acao,p_dados); end if;
 select p.role::text='bdl_admin' into v_admin from public.perfis p where p.id=p_ator and p.ativo;
 if not found then raise exception 'Acesso não autorizado.'; end if;
 if p_acao in ('empresa','membro') then raise exception 'Gerencie empresas e usuários no painel administrativo.'; end if;
 v_unidade := (p_dados->>'unidade_id')::uuid;
 select u.empresa_id into v_empresa from public.gestao_unidades u join public.empresas e on e.id=u.empresa_id and e.status='active' where u.id=v_unidade;
 if not found then raise exception 'Unidade indisponível.'; end if;
 if gestao_private.papel_gestao(p_ator,v_empresa) is null then raise exception 'Empresa ou módulo sem acesso vigente.'; end if;
 v_gestor := gestao_private.papel_gestao(p_ator,v_empresa)='gestor';
 if p_acao not in ('salvar') and not v_gestor then raise exception 'Esta ação exige acesso de gestor.'; end if;
 if p_acao='movimento' then
   v_id := (p_dados->>'produto_id')::uuid;
   select * into v_p from public.gestao_produtos where id=v_id and unidade_id=v_unidade for update;
   if not found then raise exception 'Produto não encontrado nesta unidade.'; end if;
   if not v_p.controlar_estoque then raise exception 'Este produto não controla estoque.'; end if;
   v_q := (p_dados->>'quantidade')::numeric;
   if v_q is null or v_q=0 or v_q::text in ('NaN','Infinity','-Infinity') or v_q<>round(v_q,3) then raise exception 'Quantidade inválida.'; end if;
   if p_dados->>'tipo' not in ('entrada','perda','consumo','ajuste') then raise exception 'Tipo de movimento inválido.'; end if;
   if p_dados->>'tipo'='entrada' and v_q<0 then raise exception 'A entrada deve ser positiva.'; end if;
   if p_dados->>'tipo' in ('perda','consumo') and v_q>0 then v_q := -v_q; end if;
   v_custo:=nullif(trim(p_dados->>'custo_unitario'),'')::numeric;
   if v_custo is not null and (p_dados->>'tipo' is distinct from 'entrada' or v_custo::text in ('NaN','Infinity','-Infinity') or v_custo<0 or v_custo>=1000000000 or v_custo<>round(v_custo,2)) then
     raise exception 'Informe um custo unitário válido, com até duas casas decimais, somente nas entradas.';
   end if;
   insert into public.gestao_movimentos(empresa_id,unidade_id,produto_id,quantidade,tipo,motivo,criado_por,custo_unitario,data_movimento)
   values(v_empresa,v_unidade,v_id,v_q,p_dados->>'tipo',trim(p_dados->>'motivo'),p_ator,v_custo,coalesce(nullif(p_dados->>'data_movimento','')::date,(now() at time zone 'America/Sao_Paulo')::date));
   update public.gestao_produtos set saldo=saldo+v_q where id=v_id;
 elsif p_acao='salvar' then
   v_id := (p_dados->>'id')::uuid;
   -- Serialize concurrent creates/updates of this client-generated identity.
   perform pg_advisory_xact_lock(hashtextextended(v_id::text,0));
   select * into v_f from public.gestao_fechamentos where id=v_id for update;
   if found then
     if v_f.unidade_id<>v_unidade then raise exception 'Fechamento de outra unidade.'; end if;
     if v_f.status<>'rascunho' then raise exception 'Fechamento já conferido. Reabra com justificativa para corrigir.'; end if;
     if v_f.versao is distinct from (p_dados->>'versao')::integer then raise exception 'Outro usuário alterou este fechamento. Atualize a página antes de editar.'; end if;
   end if;
   if jsonb_typeof(p_dados->'itens') is distinct from 'array' or jsonb_array_length(p_dados->'itens') not between 1 and 500
   then raise exception 'Informe de 1 a 500 produtos.'; end if;
   if (select count(*)<>count(distinct value->>'produto_id') from jsonb_array_elements(p_dados->'itens')) then raise exception 'Há produtos repetidos.'; end if;
   for v_item in select value from jsonb_array_elements(p_dados->'itens') loop
     select * into v_p from public.gestao_produtos where id=(v_item->>'produto_id')::uuid and unidade_id=v_unidade and ativo for share;
     if not found then raise exception 'Produto inválido ou de outra unidade.'; end if;
     v_q := (v_item->>'quantidade')::numeric; v_valor := (v_item->>'total')::numeric;
     if v_q is null or v_q<=0 or v_q>999999999 or v_q<>round(v_q,3)
        or v_valor is null or v_valor<0 or v_valor>999999999 or v_valor<>round(v_valor,2)
        or v_q::text in ('NaN','Infinity','-Infinity') or v_valor::text in ('NaN','Infinity','-Infinity')
     then raise exception 'Quantidade ou valor inválido.'; end if;
     v_itens := v_itens || jsonb_build_array(jsonb_build_object('produto_id',v_p.id,'nome',v_p.nome,'quantidade',v_q,'total',v_valor,'controlar_estoque',v_p.controlar_estoque));
     v_total := v_total+v_valor;
   end loop;
   if jsonb_typeof(p_dados->'pagamentos') is distinct from 'array' or jsonb_array_length(p_dados->'pagamentos')>100 then raise exception 'Pagamentos inválidos.'; end if;
   for v_pag in select value from jsonb_array_elements(p_dados->'pagamentos') loop
     v_valor := (v_pag->>'valor')::numeric;
     if v_valor is null or v_valor<=0 or v_valor>999999999 or v_valor<>round(v_valor,2) or v_valor::text in ('NaN','Infinity','-Infinity')
     or coalesce(v_pag->>'forma','') not in ('Dinheiro','Pix','Débito','Crédito','Outros')
     or length(trim(coalesce(v_pag->>'origem',''))) not between 1 and 120 then raise exception 'Informe forma, origem e valor válido para cada recebimento.'; end if;
   end loop;
   insert into public.gestao_fechamentos(id,empresa_id,unidade_id,data,turno,origem,itens,pagamentos,observacoes,total,criado_por)
   values(v_id,v_empresa,v_unidade,(p_dados->>'data')::date,lower(trim(p_dados->>'turno')),lower(trim(p_dados->>'origem')),
    v_itens,p_dados->'pagamentos',coalesce(p_dados->>'observacoes',''),v_total,p_ator)
   on conflict(id) do update set data=excluded.data,turno=excluded.turno,origem=excluded.origem,itens=excluded.itens,
    pagamentos=excluded.pagamentos,observacoes=excluded.observacoes,total=excluded.total,versao=public.gestao_fechamentos.versao+1;
 elsif p_acao in ('confirmar','reabrir') then
   v_id := (p_dados->>'id')::uuid;
   select * into v_f from public.gestao_fechamentos where id=v_id and unidade_id=v_unidade for update;
   if not found then raise exception 'Fechamento não encontrado.'; end if;
   if p_acao='confirmar' and v_f.status='conferido' then return v_id; end if;
   if p_acao='reabrir' and v_f.status='rascunho' then return v_id; end if;
   if v_f.versao is distinct from (p_dados->>'versao')::integer then raise exception 'O fechamento foi alterado. Atualize antes de continuar.'; end if;
   if p_acao='confirmar' then
     select coalesce(sum((value->>'valor')::numeric),0) into v_recebido from jsonb_array_elements(v_f.pagamentos);
     if v_recebido<>v_f.total then raise exception 'Os recebimentos não conferem com o total dos produtos.'; end if;
   elsif length(trim(coalesce(p_dados->>'motivo','')))<5 then raise exception 'Justifique a reabertura com pelo menos 5 caracteres.';
   end if;
   -- Deterministic row lock ordering prevents deadlocks across simultaneous closings.
   for v_item in select value from jsonb_array_elements(v_f.itens) order by value->>'produto_id' loop
     if not coalesce((v_item->>'controlar_estoque')::boolean,true) then continue; end if;
     v_q := (v_item->>'quantidade')::numeric * case when p_acao='confirmar' then -1 else 1 end;
     update public.gestao_produtos set saldo=saldo+v_q where id=(v_item->>'produto_id')::uuid and unidade_id=v_unidade;
     if not found then raise exception 'Produto indisponível.'; end if;
     insert into public.gestao_movimentos(empresa_id,unidade_id,produto_id,quantidade,tipo,motivo,fechamento_id,criado_por)
     values(v_empresa,v_unidade,(v_item->>'produto_id')::uuid,v_q,
       case when p_acao='confirmar' then 'venda' else 'estorno' end,
       case when p_acao='confirmar' then 'Fechamento confirmado' else trim(p_dados->>'motivo') end,v_id,p_ator);
   end loop;
   update public.gestao_fechamentos set status=case when p_acao='confirmar' then 'conferido' else 'rascunho' end,
   confirmado_por=case when p_acao='confirmar' then p_ator end,
   confirmado_em=case when p_acao='confirmar' then now() end,versao=versao+1 where id=v_id;
 else raise exception 'Operação desconhecida.';
 end if;
 insert into public.gestao_auditoria(empresa_id,usuario_id,acao,registro_id,dados)
 values(v_empresa,p_ator,p_acao,v_id,jsonb_build_object('anterior',case when v_f.id is not null then to_jsonb(v_f) else null end,'solicitacao',p_dados));
 return v_id;
end $$;
revoke all on function public.gestao_operar(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.gestao_operar(uuid,text,jsonb) to service_role;
