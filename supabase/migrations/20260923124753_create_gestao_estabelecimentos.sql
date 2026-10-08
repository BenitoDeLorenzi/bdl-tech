-- Vibe Gestão: isolated tenant data; all mutations go through a service-only,
-- security-invoker transaction with an explicitly verified active actor.
create table public.gestao_empresas (
 id uuid primary key default gen_random_uuid(), nome text not null check(length(trim(nome)) between 2 and 120),
 ativo boolean not null default true, created_at timestamptz not null default now()
);
create table public.gestao_membros (
 empresa_id uuid not null references public.gestao_empresas(id),
 usuario_id uuid not null references public.perfis(id),
 papel text not null check(papel in ('gestor','operador')),
 primary key(empresa_id,usuario_id)
);
create index gestao_membros_usuario_idx on public.gestao_membros(usuario_id);
create table public.gestao_unidades (
 id uuid primary key default gen_random_uuid(), empresa_id uuid not null references public.gestao_empresas(id),
 nome text not null check(length(trim(nome)) between 2 and 120), unique(empresa_id,id), unique(empresa_id,nome)
);
create table public.gestao_produtos (
 id uuid primary key default gen_random_uuid(), empresa_id uuid not null,
 unidade_id uuid not null, nome text not null check(length(trim(nome)) between 2 and 120),
 categoria text not null default '', unidade text not null check(unidade in ('un','kg','g','l','ml')),
 preco numeric(12,2) not null check(preco >= 0), minimo numeric(14,3) not null default 0 check(minimo >= 0),
 saldo numeric(14,3) not null default 0, ativo boolean not null default true,
 foreign key(empresa_id,unidade_id) references public.gestao_unidades(empresa_id,id),
 unique(unidade_id,nome), unique(empresa_id,unidade_id,id)
);
create table public.gestao_fechamentos (
 id uuid primary key, empresa_id uuid not null, unidade_id uuid not null, data date not null,
 turno text not null check(length(trim(turno)) between 1 and 80),
 origem text not null check(length(trim(origem)) between 1 and 120),
 status text not null default 'rascunho' check(status in ('rascunho','conferido')),
 itens jsonb not null default '[]', pagamentos jsonb not null default '[]',
 observacoes text not null default '', total numeric(14,2) not null default 0 check(total >= 0),
 versao integer not null default 1, criado_por uuid not null references public.perfis(id),
 confirmado_por uuid references public.perfis(id), confirmado_em timestamptz,
 created_at timestamptz not null default now(),
 foreign key(empresa_id,unidade_id) references public.gestao_unidades(empresa_id,id),
 unique(unidade_id,data,turno,origem), unique(empresa_id,unidade_id,id),
 check(jsonb_typeof(itens) = 'array' and jsonb_typeof(pagamentos) = 'array')
);
create index gestao_fechamentos_unidade_data_idx on public.gestao_fechamentos(unidade_id,data desc);
create table public.gestao_movimentos (
 id uuid primary key default gen_random_uuid(), empresa_id uuid not null, unidade_id uuid not null,
 produto_id uuid not null, quantidade numeric(14,3) not null check(quantidade <> 0),
 tipo text not null check(tipo in ('entrada','perda','consumo','ajuste','venda','estorno')),
 motivo text not null check(length(trim(motivo)) between 3 and 500),
 fechamento_id uuid, criado_por uuid not null references public.perfis(id), created_at timestamptz not null default now(),
 foreign key(empresa_id,unidade_id,produto_id) references public.gestao_produtos(empresa_id,unidade_id,id),
 foreign key(empresa_id,unidade_id,fechamento_id) references public.gestao_fechamentos(empresa_id,unidade_id,id)
);
create index gestao_movimentos_unidade_idx on public.gestao_movimentos(unidade_id,created_at desc);
create index gestao_movimentos_produto_idx on public.gestao_movimentos(produto_id);
create index gestao_movimentos_fechamento_idx on public.gestao_movimentos(fechamento_id);
create table public.gestao_auditoria (
 id uuid primary key default gen_random_uuid(), empresa_id uuid not null references public.gestao_empresas(id),
 usuario_id uuid not null references public.perfis(id), acao text not null, registro_id uuid not null,
 dados jsonb not null default '{}', created_at timestamptz not null default now()
);
create index gestao_auditoria_empresa_idx on public.gestao_auditoria(empresa_id,created_at desc);

create schema if not exists gestao_private;
revoke all on schema gestao_private from public;
grant usage on schema gestao_private to authenticated;
-- Internal membership lookup avoids recursive membership RLS. No writable JWT metadata.
create function gestao_private.empresas_acessiveis() returns setof uuid
language sql stable security definer set search_path = '' as $$
 select e.id from public.gestao_empresas e
 where auth.uid() is not null and e.ativo and exists (
 select 1 from public.perfis p where p.id=auth.uid() and p.ativo
 and (p.role::text='bdl_admin' or exists (
 select 1 from public.gestao_membros m where m.empresa_id=e.id and m.usuario_id=p.id)))
$$;
revoke all on function gestao_private.empresas_acessiveis() from public,anon;
grant execute on function gestao_private.empresas_acessiveis() to authenticated;
do $$
declare t text;
begin
 foreach t in array array['gestao_empresas','gestao_membros','gestao_unidades','gestao_produtos','gestao_fechamentos','gestao_movimentos','gestao_auditoria'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon, authenticated',t);
 execute format('grant select on public.%I to authenticated',t);
 execute format('grant all on public.%I to service_role',t);
 execute format('create policy gestao_leitura on public.%I for select to authenticated using (%I in (select gestao_private.empresas_acessiveis()))',t,case when t='gestao_empresas' then 'id' else 'empresa_id' end);
 end loop;
end $$;

create function public.gestao_operar(p_ator uuid,p_acao text,p_dados jsonb)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
 v_admin boolean; v_gestor boolean; v_empresa uuid; v_unidade uuid; v_id uuid;
 v_f public.gestao_fechamentos%rowtype; v_p public.gestao_produtos%rowtype;
 v_item jsonb; v_pag jsonb; v_itens jsonb := '[]'; v_q numeric; v_valor numeric;
 v_total numeric := 0; v_recebido numeric := 0; v_nome text;
begin
 select p.role::text='bdl_admin' into v_admin from public.perfis p where p.id=p_ator and p.ativo;
 if not found then raise exception 'Acesso não autorizado.'; end if;
 if p_acao='empresa' then
   if not v_admin then raise exception 'Somente a administração pode cadastrar empresas.'; end if;
   insert into public.gestao_empresas(nome) values(trim(p_dados->>'nome')) returning id into v_empresa;
   insert into public.gestao_unidades(empresa_id,nome) values(v_empresa,trim(p_dados->>'unidade')) returning id into v_id;
   insert into public.gestao_auditoria(empresa_id,usuario_id,acao,registro_id) values(v_empresa,p_ator,p_acao,v_id);
   return v_id;
 end if;
 v_unidade := (p_dados->>'unidade_id')::uuid;
 select u.empresa_id into v_empresa from public.gestao_unidades u join public.gestao_empresas e on e.id=u.empresa_id and e.ativo where u.id=v_unidade;
 if not found then raise exception 'Unidade indisponível.'; end if;
 select v_admin or exists(select 1 from public.gestao_membros where empresa_id=v_empresa and usuario_id=p_ator and papel='gestor') into v_gestor;
 if not v_admin and not exists(select 1 from public.gestao_membros where empresa_id=v_empresa and usuario_id=p_ator) then
   raise exception 'Acesso não autorizado a esta empresa.';
 end if;
 if p_acao not in ('salvar') and not v_gestor then raise exception 'Esta ação exige acesso de gestor.'; end if;
 if p_acao='membro' then
   select id into v_id from public.perfis where lower(email)=lower(trim(p_dados->>'email')) and ativo;
   if not found then raise exception 'Usuário ativo não encontrado. Cadastre o usuário no portal primeiro.'; end if;
   insert into public.gestao_membros(empresa_id,usuario_id,papel) values(v_empresa,v_id,p_dados->>'papel')
   on conflict(empresa_id,usuario_id) do update set papel=excluded.papel;
 elsif p_acao='produto' then
   insert into public.gestao_produtos(empresa_id,unidade_id,nome,categoria,unidade,preco,minimo)
   values(v_empresa,v_unidade,trim(p_dados->>'nome'),trim(p_dados->>'categoria'),p_dados->>'unidade',
   (p_dados->>'preco')::numeric,(p_dados->>'minimo')::numeric) returning id into v_id;
 elsif p_acao='movimento' then
   v_id := (p_dados->>'produto_id')::uuid;
   select * into v_p from public.gestao_produtos where id=v_id and unidade_id=v_unidade for update;
   if not found then raise exception 'Produto não encontrado nesta unidade.'; end if;
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
     if v_f.versao<>(p_dados->>'versao')::integer then raise exception 'Outro usuário alterou este fechamento. Atualize a página antes de editar.'; end if;
   end if;
   if jsonb_typeof(p_dados->'itens') is distinct from 'array' or jsonb_array_length(p_dados->'itens') not between 1 and 500
   then raise exception 'Informe de 1 a 500 produtos.'; end if;
   if (select count(*)<>count(distinct value->>'produto_id') from jsonb_array_elements(p_dados->'itens')) then raise exception 'Há produtos repetidos.'; end if;
   for v_item in select value from jsonb_array_elements(p_dados->'itens') loop
     select * into v_p from public.gestao_produtos where id=(v_item->>'produto_id')::uuid and unidade_id=v_unidade and ativo;
     if not found then raise exception 'Produto inválido ou de outra unidade.'; end if;
     v_q := (v_item->>'quantidade')::numeric; v_valor := (v_item->>'total')::numeric;
     if v_q is null or v_q<=0 or v_q>999999999 or v_q<>round(v_q,3)
        or v_valor is null or v_valor<0 or v_valor>999999999 or v_valor<>round(v_valor,2)
        or v_q::text in ('NaN','Infinity','-Infinity') or v_valor::text in ('NaN','Infinity','-Infinity')
     then raise exception 'Quantidade ou valor inválido.'; end if;
     v_itens := v_itens || jsonb_build_array(jsonb_build_object('produto_id',v_p.id,'nome',v_p.nome,'quantidade',v_q,'total',v_valor));
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
   if v_f.versao<>(p_dados->>'versao')::integer then raise exception 'O fechamento foi alterado. Atualize antes de continuar.'; end if;
   if p_acao='confirmar' then
     select coalesce(sum((value->>'valor')::numeric),0) into v_recebido from jsonb_array_elements(v_f.pagamentos);
     if v_recebido<>v_f.total then raise exception 'Os recebimentos não conferem com o total dos produtos.'; end if;
   elsif length(trim(coalesce(p_dados->>'motivo','')))<5 then raise exception 'Justifique a reabertura com pelo menos 5 caracteres.';
   end if;
   -- Deterministic row lock ordering prevents deadlocks across simultaneous closings.
   for v_item in select value from jsonb_array_elements(v_f.itens) order by value->>'produto_id' loop
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

insert into public.modulos(nome,slug,subdominio,ativo)
values('Vibe Gestão','gestao-estabelecimentos','gestao',true)
on conflict(slug) do nothing;
