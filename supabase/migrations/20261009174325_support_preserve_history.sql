alter table public.suporte_conversas add column solicitante_nome text;
update public.suporte_conversas c set solicitante_nome=p.nome from public.perfis p where p.id=c.usuario_id;
alter table public.suporte_conversas
  alter column solicitante_nome set not null,
  alter column usuario_id drop not null,
  drop constraint suporte_conversas_usuario_id_fkey,
  add constraint suporte_conversas_usuario_id_fkey foreign key(usuario_id) references public.perfis(id) on delete set null;
alter table public.suporte_mensagens
  alter column autor_id drop not null,
  drop constraint suporte_mensagens_autor_id_fkey,
  add constraint suporte_mensagens_autor_id_fkey foreign key(autor_id) references public.perfis(id) on delete set null;

create or replace function public.suporte_enviar(p_usuario uuid,p_master boolean,p_empresa uuid,p_conversa uuid,p_request uuid,p_assunto text,p_texto text,p_anexos jsonb,p_origem text)
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
    insert into public.suporte_conversas(id,empresa_id,usuario_id,solicitante_nome,assunto,origem)
    values(p_conversa,p_empresa,p_usuario,perfil.nome,p_assunto,p_origem) on conflict(id) do nothing;
  end if;
  select * into conversa from public.suporte_conversas where id=p_conversa for update;
  if conversa.id is null or (not p_master and (conversa.usuario_id is distinct from p_usuario or conversa.empresa_id<>p_empresa)) then raise exception 'Acesso negado'; end if;
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

create or replace function public.suporte_status(p_usuario uuid,p_master boolean,p_empresa uuid,p_conversa uuid,p_status text)
returns void language plpgsql security invoker set search_path='' as $$
declare perfil public.perfis%rowtype; conversa public.suporte_conversas%rowtype;
begin
  select * into perfil from public.perfis where id=p_usuario and ativo is distinct from false;
  if perfil.id is null or (p_master and perfil.role<>'bdl_admin') then raise exception 'Acesso negado'; end if;
  select * into conversa from public.suporte_conversas where id=p_conversa for update;
  if conversa.id is null or (not p_master and (conversa.usuario_id is distinct from p_usuario or conversa.empresa_id<>p_empresa or (perfil.role<>'bdl_admin' and perfil.prefeitura_id is distinct from p_empresa))) then raise exception 'Acesso negado'; end if;
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

create or replace function public.suporte_listar(p_usuario uuid,p_master boolean,p_empresa uuid default null,p_status text default null,p_busca text default '',p_page int default 1)
returns jsonb language sql stable security invoker set search_path='' as $$
with autorizadas as (
  select c.*,e.nome as empresa,coalesce(p.nome,c.solicitante_nome) as usuario,
    (select count(*) from public.suporte_mensagens m where m.conversa_id=c.id and m.autor_id is distinct from p_usuario
      and m.id>coalesce((select l.ultima_id from public.suporte_leituras l where l.conversa_id=c.id and l.usuario_id=p_usuario),0)) as novas
  from public.suporte_conversas c join public.empresas e on e.id=c.empresa_id left join public.perfis p on p.id=c.usuario_id
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
