alter table public.frota_manutencoes
  add column atividade_por text,
  add column atividade_usuario_id uuid references public.perfis(id) on delete set null;
alter table public.frota_uso_veiculos
  add column atividade_por text,
  add column atividade_usuario_id uuid references public.perfis(id) on delete set null;
create index frota_manutencoes_atividade_usuario on public.frota_manutencoes(atividade_usuario_id);
create index frota_uso_atividade_usuario on public.frota_uso_veiculos(atividade_usuario_id);

alter table public.frota_notificacoes
  add column tipo text not null default 'abastecimento' check (tipo in ('abastecimento','manutencao','uso_veiculo')),
  add column manutencao_id uuid references public.frota_manutencoes(id) on delete set null,
  add column uso_id uuid references public.frota_uso_veiculos(id) on delete set null,
  add constraint frota_notificacoes_referencia_tipo check (
    (tipo='abastecimento' and manutencao_id is null and uso_id is null) or
    (tipo='manutencao' and ordem_id is null and uso_id is null) or
    (tipo='uso_veiculo' and ordem_id is null and manutencao_id is null)
  );
create index frota_notificacoes_manutencao on public.frota_notificacoes(manutencao_id);
create index frota_notificacoes_uso on public.frota_notificacoes(uso_id);
create index frota_notificacoes_empresa_tipo_id on public.frota_notificacoes(prefeitura_id,tipo,id desc);

-- Normalize lifecycle events; the UI labels them according to the activity type.
create function public.registrar_notificacao_operacao() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare
  atividade text := TG_ARGV[0];
  evento text;
begin
  if TG_OP='UPDATE' then
    if new.status is not distinct from old.status then return new; end if;
  end if;
  evento := case
    when new.status in ('open','in_use') then 'issued'
    when new.status in ('completed','returned') then 'completed'
    when new.status='cancelled' then 'cancelled'
  end;
  if evento is null then return new; end if;
  insert into public.frota_notificacoes
    (prefeitura_id,tipo,manutencao_id,uso_id,evento,numero_ordem,veiculo,responsavel,autor_id)
  select new.prefeitura_id,atividade,
    case when atividade='manutencao' then new.id end,
    case when atividade='uso_veiculo' then new.id end,
    evento,new.id::text,concat_ws(' · ',v.modelo,v.placa),new.atividade_por,new.atividade_usuario_id
  from public.frota_veiculos v where v.id=new.veiculo_id;
  return new;
end;
$$;
revoke all on function public.registrar_notificacao_operacao() from public,anon,authenticated;
grant execute on function public.registrar_notificacao_operacao() to service_role;
create trigger notificar_manutencao after insert or update of status on public.frota_manutencoes
for each row execute function public.registrar_notificacao_operacao('manutencao');
create trigger notificar_uso_veiculo after insert or update of status on public.frota_uso_veiculos
for each row execute function public.registrar_notificacao_operacao('uso_veiculo');

-- The server supplies categories from the authenticated user's permissions.
drop function public.listar_frota_notificacoes(uuid,uuid,bigint);
create function public.listar_frota_notificacoes(p_empresa uuid,p_usuario uuid,p_before bigint default null,p_tipos text[] default array['abastecimento'])
returns jsonb language sql stable security invoker set search_path = '' as $$
select jsonb_build_object(
  'hasMore', (select count(*)>30 from (select 1 from public.frota_notificacoes where prefeitura_id=p_empresa and tipo=any(p_tipos) and (p_before is null or id<p_before) limit 31) page),
  'unread', (select count(*) from public.frota_notificacoes n where n.prefeitura_id=p_empresa and n.tipo=any(p_tipos) and n.autor_id is distinct from p_usuario
    and not exists(select 1 from public.frota_notificacao_leituras r where r.usuario_id=p_usuario and r.notificacao_id=n.id)),
  'items', coalesce((select jsonb_agg(to_jsonb(t) order by t.id desc) from (
    select n.*, (n.autor_id=p_usuario or exists(select 1 from public.frota_notificacao_leituras r where r.usuario_id=p_usuario and r.notificacao_id=n.id)) is true as lida
    from public.frota_notificacoes n where n.prefeitura_id=p_empresa and n.tipo=any(p_tipos) and (p_before is null or n.id<p_before)
    order by n.id desc limit 30
  ) t),'[]'::jsonb)
);
$$;
revoke all on function public.listar_frota_notificacoes(uuid,uuid,bigint,text[]) from public,anon,authenticated;
grant execute on function public.listar_frota_notificacoes(uuid,uuid,bigint,text[]) to service_role;
