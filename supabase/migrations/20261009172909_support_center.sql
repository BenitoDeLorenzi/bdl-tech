create table public.suporte_conversas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id),
  usuario_id uuid not null references public.perfis(id),
  assunto text not null check (char_length(assunto) between 3 and 120),
  origem text not null default '/frotas/ajuda',
  status text not null default 'waiting' check (status in ('waiting','active','resolved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index suporte_conversas_usuario_empresa on public.suporte_conversas(usuario_id,empresa_id,updated_at desc);
create index suporte_conversas_empresa on public.suporte_conversas(empresa_id);
create index suporte_conversas_status on public.suporte_conversas(status,updated_at desc);
create table public.suporte_mensagens (
  id bigint generated always as identity primary key,
  conversa_id uuid not null references public.suporte_conversas(id) on delete cascade,
  autor_id uuid not null references public.perfis(id),
  autor_nome text not null,
  suporte boolean not null,
  tipo text not null default 'message' check (tipo in ('message','status')),
  texto text not null check (char_length(texto)<=5000),
  anexos jsonb not null default '[]'::jsonb check (jsonb_typeof(anexos)='array' and jsonb_array_length(anexos)<=3),
  request_id uuid not null unique,
  created_at timestamptz not null default now()
);
create index suporte_mensagens_conversa on public.suporte_mensagens(conversa_id,id desc);
create index suporte_mensagens_autor on public.suporte_mensagens(autor_id);
create table public.suporte_leituras (
  conversa_id uuid not null references public.suporte_conversas(id) on delete cascade,
  usuario_id uuid not null references public.perfis(id) on delete cascade,
  ultima_id bigint not null default 0,
  primary key(conversa_id,usuario_id)
);
create index suporte_leituras_usuario on public.suporte_leituras(usuario_id);
alter table public.suporte_conversas enable row level security;
alter table public.suporte_mensagens enable row level security;
alter table public.suporte_leituras enable row level security;
-- Server-only access: authenticated API handlers enforce role, ownership and module license.
revoke all on public.suporte_conversas,public.suporte_mensagens,public.suporte_leituras from anon,authenticated;
grant all on public.suporte_conversas,public.suporte_mensagens,public.suporte_leituras to service_role;
grant usage,select on sequence public.suporte_mensagens_id_seq to service_role;
alter publication supabase_realtime add table public.suporte_conversas,public.suporte_leituras;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('suporte-anexos','suporte-anexos',false,5242880,array['image/webp'])
on conflict(id) do nothing;

alter table public.frota_notificacoes
  drop constraint frota_notificacoes_tipo_check,
  drop constraint frota_notificacoes_referencia_tipo,
  add column suporte_id uuid references public.suporte_conversas(id) on delete set null,
  add column destinatario_id uuid references public.perfis(id) on delete cascade,
  add constraint frota_notificacoes_tipo_check check(tipo in ('abastecimento','manutencao','uso_veiculo','suporte')),
  add constraint frota_notificacoes_referencia_tipo check (
    (tipo='abastecimento' and manutencao_id is null and uso_id is null and suporte_id is null and destinatario_id is null) or
    (tipo='manutencao' and ordem_id is null and uso_id is null and suporte_id is null and destinatario_id is null) or
    (tipo='uso_veiculo' and ordem_id is null and manutencao_id is null and suporte_id is null and destinatario_id is null) or
    (tipo='suporte' and ordem_id is null and manutencao_id is null and uso_id is null and destinatario_id is not null)
  );
create index frota_notificacoes_suporte on public.frota_notificacoes(suporte_id);
create index frota_notificacoes_destinatario on public.frota_notificacoes(destinatario_id);

create function public.suporte_enviar(p_usuario uuid,p_master boolean,p_empresa uuid,p_conversa uuid,p_request uuid,p_assunto text,p_texto text,p_anexos jsonb,p_origem text)
returns bigint language plpgsql security invoker set search_path='' as $$
declare
  perfil public.perfis%rowtype;
  conversa public.suporte_conversas%rowtype;
  mensagem bigint;
begin
  select * into perfil from public.perfis where id=p_usuario and ativo is distinct from false;
  if perfil.id is null or (p_master and perfil.role<>'bdl_admin') then raise exception 'Acesso negado'; end if;
  if not p_master and perfil.role<>'bdl_admin' and perfil.prefeitura_id is distinct from p_empresa then raise exception 'Empresa inválida'; end if;
  if char_length(btrim(p_texto))>5000 or (btrim(p_texto)='' and jsonb_array_length(p_anexos)=0) then raise exception 'Mensagem inválida'; end if;
  if not p_master then
    insert into public.suporte_conversas(id,empresa_id,usuario_id,assunto,origem)
    values(p_conversa,p_empresa,p_usuario,p_assunto,p_origem) on conflict(id) do nothing;
  end if;
  select * into conversa from public.suporte_conversas where id=p_conversa for update;
  if conversa.id is null or (not p_master and (conversa.usuario_id<>p_usuario or conversa.empresa_id<>p_empresa)) then raise exception 'Acesso negado'; end if;
  select id into mensagem from public.suporte_mensagens where request_id=p_request and conversa_id=p_conversa and autor_id=p_usuario;
  if mensagem is not null then return mensagem; end if;
  if conversa.status='resolved' then raise exception 'Reabra o atendimento antes de enviar uma mensagem'; end if;
  insert into public.suporte_mensagens(conversa_id,autor_id,autor_nome,suporte,texto,anexos,request_id)
  values(p_conversa,p_usuario,perfil.nome,p_master,btrim(p_texto),p_anexos,p_request) returning id into mensagem;
  update public.suporte_conversas set updated_at=clock_timestamp(),status=case when p_master then 'active' else 'waiting' end where id=p_conversa;
  if p_master and p_usuario<>conversa.usuario_id then
    insert into public.frota_notificacoes(prefeitura_id,tipo,suporte_id,destinatario_id,evento,numero_ordem,veiculo,responsavel,autor_id)
    values(conversa.empresa_id,'suporte',conversa.id,conversa.usuario_id,'issued',conversa.assunto,'',perfil.nome,p_usuario);
  end if;
  return mensagem;
end;
$$;

create function public.suporte_status(p_usuario uuid,p_master boolean,p_empresa uuid,p_conversa uuid,p_status text)
returns void language plpgsql security invoker set search_path='' as $$
declare perfil public.perfis%rowtype; conversa public.suporte_conversas%rowtype;
begin
  select * into perfil from public.perfis where id=p_usuario and ativo is distinct from false;
  if perfil.id is null or (p_master and perfil.role<>'bdl_admin') then raise exception 'Acesso negado'; end if;
  select * into conversa from public.suporte_conversas where id=p_conversa for update;
  if conversa.id is null or (not p_master and (conversa.usuario_id<>p_usuario or conversa.empresa_id<>p_empresa or (perfil.role<>'bdl_admin' and perfil.prefeitura_id is distinct from p_empresa))) then raise exception 'Acesso negado'; end if;
  if p_status not in ('waiting','active','resolved') or (not p_master and not(conversa.status='resolved' and p_status='waiting')) then raise exception 'Alteração não permitida'; end if;
  if conversa.status=p_status then return; end if;
  update public.suporte_conversas set status=p_status,updated_at=clock_timestamp() where id=p_conversa;
  insert into public.suporte_mensagens(conversa_id,autor_id,autor_nome,suporte,tipo,texto,request_id)
  values(p_conversa,p_usuario,perfil.nome,p_master,'status',case p_status when 'resolved' then 'Atendimento resolvido' when 'active' then 'Atendimento iniciado' else 'Atendimento reaberto' end,gen_random_uuid());
  if p_master and p_status='resolved' and p_usuario<>conversa.usuario_id then
    insert into public.frota_notificacoes(prefeitura_id,tipo,suporte_id,destinatario_id,evento,numero_ordem,veiculo,responsavel,autor_id)
    values(conversa.empresa_id,'suporte',conversa.id,conversa.usuario_id,'completed',conversa.assunto,'',perfil.nome,p_usuario);
  end if;
end;
$$;

create function public.suporte_listar(p_usuario uuid,p_master boolean,p_empresa uuid default null,p_status text default null,p_busca text default '',p_page int default 1)
returns jsonb language sql stable security invoker set search_path='' as $$
with autorizadas as (
  select c.*,e.nome as empresa,p.nome as usuario,
    (select count(*) from public.suporte_mensagens m where m.conversa_id=c.id and m.autor_id<>p_usuario
      and m.id>coalesce((select l.ultima_id from public.suporte_leituras l where l.conversa_id=c.id and l.usuario_id=p_usuario),0)) as novas
  from public.suporte_conversas c join public.empresas e on e.id=c.empresa_id join public.perfis p on p.id=c.usuario_id
  where exists(select 1 from public.perfis a where a.id=p_usuario and a.ativo is distinct from false and
    ((p_master and a.role='bdl_admin') or (not p_master and c.usuario_id=p_usuario and c.empresa_id=p_empresa and (a.role='bdl_admin' or a.prefeitura_id=p_empresa))))
), filtradas as (
  select * from autorizadas where (p_status is null or status=p_status) and concat_ws(' ',assunto,empresa,usuario) ilike '%'||p_busca||'%'
)
select jsonb_build_object(
  'unread',coalesce((select sum(novas) from autorizadas),0),
  'total',(select count(*) from filtradas),
  'items',coalesce((select jsonb_agg(to_jsonb(t) order by t.updated_at desc,t.id desc) from
    (select * from filtradas order by updated_at desc,id desc limit 25 offset (greatest(1,least(p_page,10000))-1)*25) t),'[]'::jsonb)
);
$$;

create function public.suporte_ler(p_usuario uuid,p_master boolean,p_empresa uuid,p_conversa uuid,p_ultima bigint)
returns void language plpgsql security invoker set search_path='' as $$
declare ultima bigint;
begin
  if not exists(select 1 from public.suporte_conversas c join public.perfis p on p.id=p_usuario
    where c.id=p_conversa and p.ativo is distinct from false and ((p_master and p.role='bdl_admin') or
    (not p_master and c.usuario_id=p_usuario and c.empresa_id=p_empresa and (p.role='bdl_admin' or p.prefeitura_id=p_empresa)))) then raise exception 'Acesso negado'; end if;
  select max(id) into ultima from public.suporte_mensagens where conversa_id=p_conversa and id<=p_ultima;
  if ultima is null then return; end if;
  insert into public.suporte_leituras(conversa_id,usuario_id,ultima_id) values(p_conversa,p_usuario,ultima)
    on conflict(conversa_id,usuario_id) do update set ultima_id=excluded.ultima_id where public.suporte_leituras.ultima_id<excluded.ultima_id;
end;
$$;

revoke all on function public.suporte_enviar(uuid,boolean,uuid,uuid,uuid,text,text,jsonb,text),public.suporte_status(uuid,boolean,uuid,uuid,text),public.suporte_listar(uuid,boolean,uuid,text,text,int),public.suporte_ler(uuid,boolean,uuid,uuid,bigint) from public,anon,authenticated;
grant execute on function public.suporte_enviar(uuid,boolean,uuid,uuid,uuid,text,text,jsonb,text),public.suporte_status(uuid,boolean,uuid,uuid,text),public.suporte_listar(uuid,boolean,uuid,text,text,int),public.suporte_ler(uuid,boolean,uuid,uuid,bigint) to service_role;

create or replace function public.listar_frota_notificacoes(p_empresa uuid,p_usuario uuid,p_before bigint default null,p_tipos text[] default array['abastecimento'])
returns jsonb language sql stable security invoker set search_path='' as $$
with permitidas as (
  select * from public.frota_notificacoes where prefeitura_id=p_empresa and tipo=any(p_tipos) and (destinatario_id is null or destinatario_id=p_usuario)
)
select jsonb_build_object(
  'hasMore',(select count(*)>30 from (select 1 from permitidas where p_before is null or id<p_before limit 31) page),
  'unread',(select count(*) from permitidas n where n.autor_id is distinct from p_usuario and not exists(select 1 from public.frota_notificacao_leituras r where r.usuario_id=p_usuario and r.notificacao_id=n.id)),
  'items',coalesce((select jsonb_agg(to_jsonb(t) order by t.id desc) from (
    select n.*,(n.autor_id=p_usuario or exists(select 1 from public.frota_notificacao_leituras r where r.usuario_id=p_usuario and r.notificacao_id=n.id)) is true as lida
    from permitidas n where p_before is null or n.id<p_before order by n.id desc limit 30
  ) t),'[]'::jsonb)
);
$$;
