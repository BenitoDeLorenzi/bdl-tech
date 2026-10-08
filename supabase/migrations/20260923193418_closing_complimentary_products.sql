alter table public.gestao_movimentos drop constraint gestao_movimentos_tipo_check;
alter table public.gestao_movimentos add constraint gestao_movimentos_tipo_check check(tipo in ('entrada','perda','consumo','ajuste','venda','cortesia','estorno'));

create or replace function gestao_private.fechamento_base(p_ator uuid,p_acao text,p_dados jsonb)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
 v_cortesia numeric; v_vendidos numeric;
 v_taxa numeric; v_taxa_valor numeric; v_pagamentos jsonb := '[]'; v_despesas jsonb := '[]'; v_despesa jsonb;
 v_admin boolean; v_gestor boolean; v_empresa uuid; v_unidade uuid; v_id uuid;
 v_f public.gestao_fechamentos%rowtype; v_p public.gestao_produtos%rowtype;
 v_item jsonb; v_pag jsonb; v_itens jsonb := '[]'; v_q numeric; v_valor numeric;
 v_preco numeric; v_custo numeric; v_total numeric := 0; v_recebido numeric := 0; v_nome text;
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
   insert into public.gestao_movimentos(empresa_id,unidade_id,produto_id,quantidade,tipo,motivo,criado_por,custo_unitario)
   values(v_empresa,v_unidade,v_id,v_q,p_dados->>'tipo',trim(p_dados->>'motivo'),p_ator,v_custo);
   update public.gestao_produtos set saldo=saldo+v_q where id=v_id;
 elsif p_acao='salvar' then
   v_id := (p_dados->>'id')::uuid;
   -- Serialize concurrent creates/updates of this client-generated identity.
   perform pg_advisory_xact_lock(hashtextextended(v_id::text,0));
   if exists(select 1 from public.gestao_auditoria where registro_id=v_id and acao='excluir_rascunho') then
     raise exception 'Este rascunho foi excluído. Atualize a página.';
   end if;
   select * into v_f from public.gestao_fechamentos where id=v_id for update;
   if found then
     if v_f.unidade_id<>v_unidade then raise exception 'Fechamento de outra unidade.'; end if;
     if v_f.status<>'rascunho' then raise exception 'Fechamento já conferido. Reabra com justificativa para corrigir.'; end if;
     if v_f.versao is distinct from (p_dados->>'versao')::integer then raise exception 'Outro usuário alterou este fechamento. Atualize a página antes de editar.'; end if;
   end if;
   if jsonb_typeof(p_dados->'itens') is distinct from 'array' or jsonb_array_length(p_dados->'itens') not between 0 and 500
   then raise exception 'Informe até 500 produtos.'; end if;
   if (select count(*)<>count(distinct value->>'produto_id') from jsonb_array_elements(p_dados->'itens')) then raise exception 'Há produtos repetidos.'; end if;
   for v_item in select value from jsonb_array_elements(p_dados->'itens') loop
     select * into v_p from public.gestao_produtos where id=(v_item->>'produto_id')::uuid and unidade_id=v_unidade and ativo for share;
     if not found then raise exception 'Produto inválido ou de outra unidade.'; end if;
     v_q := (v_item->>'quantidade')::numeric; v_valor := (v_item->>'total')::numeric;
     v_cortesia := coalesce((v_item->>'cortesia')::numeric,0);
     if v_q is null or v_q<0 or v_q>999999999 or v_q<>round(v_q,3)
        or v_valor is null or v_valor<0 or v_valor>999999999 or v_valor<>round(v_valor,2)
        or v_q::text in ('NaN','Infinity','-Infinity') or v_valor::text in ('NaN','Infinity','-Infinity')
        or v_cortesia<0 or v_cortesia>999999999 or v_cortesia<>round(v_cortesia,3) or v_cortesia::text in ('NaN','Infinity','-Infinity')
        or v_q+v_cortesia<=0 or (v_q=0 and v_valor<>0)
     then raise exception 'Quantidade ou valor inválido.'; end if;
     v_preco:=case when v_q>0 then nullif(v_item->>'preco_unitario','')::numeric else null end;
     if v_preco is not null and (v_preco<0 or v_preco>=1000000000 or v_preco<>round(v_preco,2) or v_preco::text in ('NaN','Infinity','-Infinity')) then
       raise exception 'Informe um preço unitário válido, com até duas casas decimais.';
     end if;
     v_itens := v_itens || jsonb_build_array(jsonb_build_object('produto_id',v_p.id,'nome',v_p.nome,'quantidade',v_q,'cortesia',v_cortesia,'total',v_valor,'preco_unitario',v_preco,'controlar_estoque',v_p.controlar_estoque));
     v_total := v_total+v_valor;
   end loop;
   if jsonb_typeof(p_dados->'pagamentos') is distinct from 'array' or jsonb_array_length(p_dados->'pagamentos')>100 then raise exception 'Pagamentos inválidos.'; end if;
   for v_pag in select value from jsonb_array_elements(p_dados->'pagamentos') loop
     v_valor := (v_pag->>'valor')::numeric;
     if v_valor is null or v_valor<=0 or v_valor>999999999 or v_valor<>round(v_valor,2) or v_valor::text in ('NaN','Infinity','-Infinity')
     or coalesce(v_pag->>'forma','') not in ('Dinheiro','Pix','Débito','Crédito','Outros')
     or length(trim(coalesce(v_pag->>'origem',''))) not between 1 and 120 then raise exception 'Informe forma, origem e valor válido para cada recebimento.'; end if;
     v_taxa := coalesce(nullif(v_pag->>'taxa_percentual','')::numeric,0);
     if v_taxa::text in ('NaN','Infinity','-Infinity') or v_taxa<0 or v_taxa>100 or v_taxa<>round(v_taxa,2) then
       raise exception 'Informe uma taxa entre 0 e 100%%, com até duas casas decimais.';
     end if;
     v_taxa_valor := round(v_valor*v_taxa/100,2);
     v_pagamentos := v_pagamentos || jsonb_build_array(jsonb_build_object(
       'forma',v_pag->>'forma','origem',trim(v_pag->>'origem'),'valor',v_valor,
       'taxa_percentual',v_taxa,'valor_taxa',v_taxa_valor,'valor_liquido',v_valor-v_taxa_valor));
   end loop;
   if jsonb_typeof(coalesce(p_dados->'despesas','[]'::jsonb)) is distinct from 'array' or jsonb_array_length(coalesce(p_dados->'despesas','[]'::jsonb))>100 then
     raise exception 'Informe no máximo 100 despesas.';
   end if;
   for v_despesa in select value from jsonb_array_elements(coalesce(p_dados->'despesas','[]'::jsonb)) loop
     v_valor := (v_despesa->>'valor')::numeric;
     v_nome := trim(coalesce(v_despesa->>'descricao',''));
     if length(v_nome) not between 2 and 200 or v_valor is null or v_valor<=0 or v_valor>=1000000000
        or v_valor::text in ('NaN','Infinity','-Infinity') or v_valor<>round(v_valor,2) then
       raise exception 'Informe descrição (2 a 200 caracteres) e valor positivo para cada despesa.';
     end if;
     v_despesas := v_despesas || jsonb_build_array(jsonb_build_object('descricao',v_nome,'valor',v_valor));
   end loop;
   insert into public.gestao_fechamentos(id,empresa_id,unidade_id,data,turno,origem,itens,pagamentos,despesas,observacoes,total,criado_por)
   values(v_id,v_empresa,v_unidade,(p_dados->>'data')::date,lower(trim(p_dados->>'turno')),lower(trim(p_dados->>'origem')),
    v_itens,v_pagamentos,v_despesas,coalesce(p_dados->>'observacoes',''),v_total,p_ator)
   on conflict(id) do update set data=excluded.data,turno=excluded.turno,origem=excluded.origem,itens=excluded.itens,
    pagamentos=excluded.pagamentos,despesas=excluded.despesas,observacoes=excluded.observacoes,total=excluded.total,versao=public.gestao_fechamentos.versao+1;
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
     if p_acao='confirmar' and (v_item->>'quantidade')::numeric>0 and nullif(v_item->>'preco_unitario','') is not null then
       select * into v_p from public.gestao_produtos where id=(v_item->>'produto_id')::uuid and unidade_id=v_unidade for update;
       if not found then raise exception 'Produto indisponível.'; end if;
       v_preco:=(v_item->>'preco_unitario')::numeric;
       if v_p.preco is distinct from v_preco then
         update public.gestao_produtos set preco=v_preco,versao=versao+1 where id=v_p.id;
         insert into public.gestao_auditoria(empresa_id,usuario_id,acao,registro_id,dados)
         values(v_empresa,p_ator,'preco_fechamento',v_p.id,jsonb_build_object('fechamento_id',v_id,'anterior',v_p.preco,'atual',v_preco));
       end if;
     end if;
     if not coalesce((v_item->>'controlar_estoque')::boolean,true) then continue; end if;
     v_vendidos := (v_item->>'quantidade')::numeric;
     v_cortesia := coalesce((v_item->>'cortesia')::numeric,0);
     v_q := (v_vendidos+v_cortesia) * case when p_acao='confirmar' then -1 else 1 end;
     update public.gestao_produtos set saldo=saldo+v_q where id=(v_item->>'produto_id')::uuid and unidade_id=v_unidade;
     if not found then raise exception 'Produto indisponível.'; end if;
     if v_vendidos>0 then
       insert into public.gestao_movimentos(empresa_id,unidade_id,produto_id,quantidade,tipo,motivo,fechamento_id,criado_por)
       values(v_empresa,v_unidade,(v_item->>'produto_id')::uuid,v_vendidos * case when p_acao='confirmar' then -1 else 1 end,
         case when p_acao='confirmar' then 'venda' else 'estorno' end,
         case when p_acao='confirmar' then 'Fechamento confirmado' else trim(p_dados->>'motivo') end,v_id,p_ator);
     end if;
     if v_cortesia>0 then
       insert into public.gestao_movimentos(empresa_id,unidade_id,produto_id,quantidade,tipo,motivo,fechamento_id,criado_por)
       values(v_empresa,v_unidade,(v_item->>'produto_id')::uuid,v_cortesia * case when p_acao='confirmar' then -1 else 1 end,
         case when p_acao='confirmar' then 'cortesia' else 'estorno' end,
         case when p_acao='confirmar' then 'Cortesia do fechamento' else left('Estorno de cortesia: '||trim(p_dados->>'motivo'),500) end,v_id,p_ator);
     end if;
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
revoke all on function gestao_private.fechamento_base(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function gestao_private.fechamento_base(uuid,text,jsonb) to service_role;



