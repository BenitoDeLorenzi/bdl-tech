alter table public.gestao_produtos alter column preco drop not null;
alter table public.gestao_produtos alter column preco drop default;
create table gestao_private.codigos_reservados (
 id uuid primary key default gen_random_uuid(),
 codigo bigint not null unique,
 usuario_id uuid not null references public.perfis(id) on delete cascade,
 unidade_id uuid not null references public.gestao_unidades(id) on delete cascade,
 criado_em timestamptz not null default now()
);
alter table gestao_private.codigos_reservados enable row level security;
revoke all on gestao_private.codigos_reservados from public,anon,authenticated;
grant all on gestao_private.codigos_reservados to service_role;
create index codigos_reservados_criado_idx on gestao_private.codigos_reservados(criado_em);
create function public.gestao_reservar_codigo(p_ator uuid,p_unidade uuid) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare e uuid; r gestao_private.codigos_reservados%rowtype;
begin
 select empresa_id into e from public.gestao_unidades where id=p_unidade;
 if e is null or gestao_private.papel_gestao(p_ator,e) is distinct from 'gestor' then
 raise exception 'Sem permissão para cadastrar produtos nesta empresa.'; end if;
 delete from gestao_private.codigos_reservados where criado_em<now()-interval '1 day';
 insert into gestao_private.codigos_reservados(codigo,usuario_id,unidade_id)
 values(nextval('public.gestao_produtos_codigo_seq'),p_ator,p_unidade) returning * into r;
 return jsonb_build_object('reserva_id',r.id,'codigo',r.codigo);
end $$;
revoke all on function public.gestao_reservar_codigo(uuid,uuid) from public,anon,authenticated;
grant execute on function public.gestao_reservar_codigo(uuid,uuid) to service_role;
create or replace function gestao_private.catalogo(p_ator uuid,p_acao text,p_dados jsonb)
returns uuid language plpgsql security invoker set search_path='' as $$
declare e uuid; u uuid; v_id uuid; c public.gestao_categorias%rowtype; p public.gestao_produtos%rowtype;
 cat uuid; nome_cat text; controle boolean; anterior jsonb; v_codigo bigint;
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
     if nullif(p_dados->>'reserva_id','') is not null then
       delete from gestao_private.codigos_reservados where id=(p_dados->>'reserva_id')::uuid
         and usuario_id=p_ator and unidade_id=u and criado_em>=now()-interval '1 day'
         returning codigo into v_codigo;
       if v_codigo is null then raise exception 'Código indisponível. Abra novamente o cadastro para gerar outro código.'; end if;
     else
       v_codigo:=nextval('public.gestao_produtos_codigo_seq');
     end if;
     insert into public.gestao_produtos(codigo,empresa_id,unidade_id,nome,categoria,categoria_id,unidade,preco,minimo,controlar_estoque,observacoes,ativo) overriding system value
     values(v_codigo,e,u,trim(p_dados->>'nome'),nome_cat,cat,p_dados->>'unidade',
       nullif(trim(p_dados->>'preco'),'')::numeric,case when controle then (p_dados->>'minimo')::numeric else 0 end,
       controle,coalesce(p_dados->>'observacoes',''),coalesce((p_dados->>'ativo')::boolean,true)) returning id into v_id;
   else
     update public.gestao_produtos set nome=trim(p_dados->>'nome'),categoria=nome_cat,categoria_id=cat,
       unidade=p_dados->>'unidade',preco=nullif(trim(p_dados->>'preco'),'')::numeric,
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

