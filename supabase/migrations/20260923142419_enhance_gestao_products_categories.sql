
-- Categories are shared by units of the same company, never between tenants.
create table public.gestao_categorias (
 id uuid primary key default gen_random_uuid(),
 empresa_id uuid not null references public.empresas(id),
 nome text not null check(length(trim(nome)) between 2 and 80),
 descricao text not null default '' check(length(descricao)<=500),
 ativo boolean not null default true,
 versao integer not null default 1,
 created_at timestamptz not null default now(),
 unique(empresa_id,id)
);
create unique index gestao_categorias_nome_idx on public.gestao_categorias(empresa_id,lower(trim(nome)));
alter table public.gestao_categorias enable row level security;
revoke all on public.gestao_categorias from anon,authenticated;
grant select on public.gestao_categorias to authenticated;
grant all on public.gestao_categorias to service_role;
create policy gestao_leitura on public.gestao_categorias for select to authenticated
 using(empresa_id in(select gestao_private.empresas_acessiveis()));

create function gestao_private.categorias_base(p_empresa uuid) returns void
language sql security invoker set search_path='' as $$
 insert into public.gestao_categorias(empresa_id,nome)
 select p_empresa,nome from unnest(array[
 'Águas e refrigerantes','Sucos e energéticos','Cervejas e chopes','Vinhos e espumantes',
 'Destilados','Drinks e coquetéis','Petiscos e porções','Lanches e sanduíches',
 'Pratos e refeições','Sobremesas','Ingredientes e insumos','Descartáveis e embalagens',
 'Limpeza e higiene']) nome
 on conflict do nothing
$$;
revoke all on function gestao_private.categorias_base(uuid) from public,anon,authenticated;
grant execute on function gestao_private.categorias_base(uuid) to service_role;
do $$ declare e uuid; begin
 for e in select distinct empresa_id from public.gestao_unidades loop
 perform gestao_private.categorias_base(e);
 end loop;
end $$;
create function gestao_private.categorias_nova_unidade() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 -- Seed once per company. Adding a unit must not recreate renamed base categories.
 if not exists(select 1 from public.gestao_categorias where empresa_id=new.empresa_id) then
   perform gestao_private.categorias_base(new.empresa_id);
 end if;
 return new;
end $$;
revoke all on function gestao_private.categorias_nova_unidade() from public,anon,authenticated;
create trigger gestao_unidade_categorias after insert on public.gestao_unidades
 for each row execute function gestao_private.categorias_nova_unidade();

alter table public.gestao_produtos
 add column categoria_id uuid,
 add column codigo bigint generated always as identity unique,
 add column custo numeric(12,2) not null default 0 check(custo>=0 and custo<1000000000),
 add column controlar_estoque boolean not null default true,
 add column observacoes text not null default '' check(length(observacoes)<=2000),
 add column versao integer not null default 1;
grant usage,select on sequence public.gestao_produtos_codigo_seq to service_role;
insert into public.gestao_categorias(empresa_id,nome)
 select distinct empresa_id,coalesce(nullif(trim(categoria),''),'Sem categoria') from public.gestao_produtos
 on conflict do nothing;
update public.gestao_produtos p set categoria_id=c.id from public.gestao_categorias c
 where c.empresa_id=p.empresa_id and lower(trim(c.nome))=lower(coalesce(nullif(trim(p.categoria),''),'Sem categoria'));
alter table public.gestao_produtos alter column categoria_id set not null;
alter table public.gestao_produtos add constraint gestao_produtos_categoria_fkey
 foreign key(empresa_id,categoria_id) references public.gestao_categorias(empresa_id,id);
create index gestao_produtos_categoria_idx on public.gestao_produtos(empresa_id,categoria_id);
alter table public.gestao_produtos add constraint gestao_produtos_sem_estoque check(controlar_estoque or (saldo=0 and minimo=0));

-- Catalog writes use the same trusted actor, licence and role checks as operational writes.
create function gestao_private.catalogo(p_ator uuid,p_acao text,p_dados jsonb)
returns uuid language plpgsql security invoker set search_path='' as $$
declare e uuid; u uuid; v_id uuid; c public.gestao_categorias%rowtype; p public.gestao_produtos%rowtype;
 cat uuid; nome_cat text; controle boolean; anterior jsonb;
begin
 u:=(p_dados->>'unidade_id')::uuid;
 select empresa_id into e from public.gestao_unidades where id=u;
 if e is null or gestao_private.papel_gestao(p_ator,e) is distinct from 'gestor' then
   raise exception 'Esta ação exige acesso de gestor à empresa com licença vigente.';
 end if;
 v_id:=nullif(p_dados->>'id','')::uuid;
 if p_acao='categoria' then
   if v_id is not null then
     select * into c from public.gestao_categorias where id=v_id and empresa_id=e for update;
     if not found then raise exception 'Categoria não encontrada nesta empresa.'; end if;
     if c.versao is distinct from (p_dados->>'versao')::integer then raise exception 'Outro usuário alterou a categoria. Atualize a página.'; end if;
     anterior:=to_jsonb(c);
     update public.gestao_categorias set nome=trim(p_dados->>'nome'),descricao=coalesce(p_dados->>'descricao',''),
       ativo=(p_dados->>'ativo')::boolean,versao=versao+1 where id=v_id;
   else
     insert into public.gestao_categorias(empresa_id,nome,descricao,ativo)
       values(e,trim(p_dados->>'nome'),coalesce(p_dados->>'descricao',''),coalesce((p_dados->>'ativo')::boolean,true))
       returning id into v_id;
   end if;
 elsif p_acao='produto' then
   if v_id is not null then
     select * into p from public.gestao_produtos where id=v_id and unidade_id=u for update;
     if not found then raise exception 'Produto não encontrado nesta unidade.'; end if;
     if p.versao is distinct from (p_dados->>'versao')::integer then raise exception 'Outro usuário alterou o produto. Atualize a página.'; end if;
     anterior:=to_jsonb(p);
   end if;
   cat:=nullif(p_dados->>'categoria_id','')::uuid;
   select nome into nome_cat from public.gestao_categorias where id=cat and empresa_id=e
     and (ativo or cat=p.categoria_id) for share;
   if not found then raise exception 'Selecione uma categoria ativa desta empresa.'; end if;
   controle:=coalesce((p_dados->>'controlar_estoque')::boolean,true);
   if v_id is not null and (p.unidade is distinct from p_dados->>'unidade' or p.controlar_estoque is distinct from controle)
      and (p.saldo<>0 or exists(select 1 from public.gestao_movimentos where produto_id=v_id)
      or exists(select 1 from public.gestao_fechamentos where unidade_id=u and itens @> jsonb_build_array(jsonb_build_object('produto_id',v_id)))) then
     raise exception 'A unidade e o controle de estoque não podem mudar após movimentações ou uso em fechamentos. Cadastre outro produto.';
   end if;
   if v_id is null then
     insert into public.gestao_produtos(empresa_id,unidade_id,nome,categoria,categoria_id,unidade,custo,preco,minimo,controlar_estoque,observacoes,ativo)
     values(e,u,trim(p_dados->>'nome'),nome_cat,cat,p_dados->>'unidade',(p_dados->>'custo')::numeric,
       (p_dados->>'preco')::numeric,case when controle then (p_dados->>'minimo')::numeric else 0 end,
       controle,coalesce(p_dados->>'observacoes',''),coalesce((p_dados->>'ativo')::boolean,true)) returning id into v_id;
   else
     update public.gestao_produtos set nome=trim(p_dados->>'nome'),categoria=nome_cat,categoria_id=cat,
       unidade=p_dados->>'unidade',custo=(p_dados->>'custo')::numeric,preco=(p_dados->>'preco')::numeric,
       minimo=case when controle then (p_dados->>'minimo')::numeric else 0 end,controlar_estoque=controle,
       observacoes=coalesce(p_dados->>'observacoes',''),ativo=(p_dados->>'ativo')::boolean,versao=versao+1 where id=v_id;
   end if;
 else raise exception 'Operação de cadastro inválida.'; end if;
 insert into public.gestao_auditoria(empresa_id,usuario_id,acao,registro_id,dados)
 values(e,p_ator,p_acao,v_id,jsonb_build_object('anterior',anterior,'solicitacao',p_dados));
 return v_id;
end $$;
revoke all on function gestao_private.catalogo(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function gestao_private.catalogo(uuid,text,jsonb) to service_role;

create or replace function public.gestao_operar(p_ator uuid,p_acao text,p_dados jsonb)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
 v_admin boolean; v_gestor boolean; v_empresa uuid; v_unidade uuid; v_id uuid;
 v_f public.gestao_fechamentos%rowtype; v_p public.gestao_produtos%rowtype;
 v_item jsonb; v_pag jsonb; v_itens jsonb := '[]'; v_q numeric; v_valor numeric;
 v_total numeric := 0; v_recebido numeric := 0; v_nome text;
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
   insert into public.gestao_movimentos(empresa_id,unidade_id,produto_id,quantidade,tipo,motivo,criado_por)
   values(v_empresa,v_unidade,v_id,v_q,p_dados->>'tipo',trim(p_dados->>'motivo'),p_ator);
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
