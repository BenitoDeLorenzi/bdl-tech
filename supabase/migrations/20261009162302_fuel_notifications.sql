alter table public.frota_abastecimentos add column atividade_por text;
-- Access is exclusively through authenticated, tenant-scoped server endpoints.
create table public.frota_notificacoes (
  id bigint generated always as identity primary key,
  prefeitura_id uuid not null references public.empresas(id) on delete cascade,
  ordem_id uuid references public.frota_abastecimentos(id) on delete set null,
  evento text not null check (evento in ('issued','completed','cancelled')),
  numero_ordem text not null,
  veiculo text not null,
  posto text,
  responsavel text,
  created_at timestamptz not null default now()
);
create index frota_notificacoes_empresa_id on public.frota_notificacoes(prefeitura_id, id desc);
create table public.frota_notificacao_leituras (
  usuario_id uuid not null references public.perfis(id) on delete cascade,
  notificacao_id bigint not null references public.frota_notificacoes(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(usuario_id, notificacao_id)
);
create index frota_notificacao_leituras_notificacao on public.frota_notificacao_leituras(notificacao_id);
alter table public.frota_notificacoes enable row level security;
alter table public.frota_notificacao_leituras enable row level security;
revoke all on public.frota_notificacoes, public.frota_notificacao_leituras from anon, authenticated;
grant all on public.frota_notificacoes, public.frota_notificacao_leituras to service_role;
grant usage, select on sequence public.frota_notificacoes_id_seq to service_role;

create function public.registrar_notificacao_abastecimento() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if new.status not in ('issued','completed','cancelled') then return new; end if;
  if TG_OP = 'UPDATE' then
    if new.status is not distinct from old.status then return new; end if;
  end if;
  insert into public.frota_notificacoes(prefeitura_id,ordem_id,evento,numero_ordem,veiculo,posto,responsavel)
  select new.prefeitura_id,new.id,new.status,new.numero_ordem,
    concat_ws(' · ',v.modelo,v.placa),new.fornecedor,
    case when new.status='issued' then new.emitido_por else new.atividade_por end
  from public.frota_veiculos v where v.id=new.veiculo_id;
  return new;
end;
$$;
revoke all on function public.registrar_notificacao_abastecimento() from public, anon, authenticated;
grant execute on function public.registrar_notificacao_abastecimento() to service_role;
create trigger frota_abastecimento_notificacao after insert or update of status on public.frota_abastecimentos
for each row execute function public.registrar_notificacao_abastecimento();

create function public.listar_frota_notificacoes(p_empresa uuid,p_usuario uuid,p_before bigint default null)
returns jsonb language sql stable security invoker set search_path = '' as $$
select jsonb_build_object(
  'unread', (select count(*) from public.frota_notificacoes n where n.prefeitura_id=p_empresa
    and not exists(select 1 from public.frota_notificacao_leituras r where r.usuario_id=p_usuario and r.notificacao_id=n.id)),
  'items', coalesce((select jsonb_agg(to_jsonb(t) order by t.id desc) from (
    select n.*, exists(select 1 from public.frota_notificacao_leituras r where r.usuario_id=p_usuario and r.notificacao_id=n.id) as lida
    from public.frota_notificacoes n where n.prefeitura_id=p_empresa and (p_before is null or n.id<p_before)
    order by n.id desc limit 30
  ) t),'[]'::jsonb)
);
$$;
revoke all on function public.listar_frota_notificacoes(uuid,uuid,bigint) from public,anon,authenticated;
grant execute on function public.listar_frota_notificacoes(uuid,uuid,bigint) to service_role;
alter publication supabase_realtime add table public.frota_notificacoes, public.frota_notificacao_leituras;
