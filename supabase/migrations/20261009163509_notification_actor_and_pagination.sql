alter table public.frota_abastecimentos add column atividade_usuario_id uuid references public.perfis(id) on delete set null;
alter table public.frota_notificacoes add column autor_id uuid references public.perfis(id) on delete set null;
create index frota_abastecimentos_atividade_usuario on public.frota_abastecimentos(atividade_usuario_id);
create index frota_notificacoes_autor on public.frota_notificacoes(autor_id);
-- Historical emission snapshots can be resolved only when exactly one eligible profile matches.
update public.frota_notificacoes n set autor_id=(
  select p.id from public.perfis p where p.nome=n.responsavel
    and (p.prefeitura_id=n.prefeitura_id or p.role='bdl_admin') limit 1
) where n.evento='issued' and (select count(*) from public.perfis p where p.nome=n.responsavel
    and (p.prefeitura_id=n.prefeitura_id or p.role='bdl_admin'))=1;
create or replace function public.registrar_notificacao_abastecimento() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if new.status not in ('issued','completed','cancelled') then return new; end if;
  if TG_OP = 'UPDATE' then
    if new.status is not distinct from old.status then return new; end if;
  end if;
  insert into public.frota_notificacoes(prefeitura_id,ordem_id,evento,numero_ordem,veiculo,posto,responsavel,autor_id)
  select new.prefeitura_id,new.id,new.status,new.numero_ordem,
    concat_ws(' · ',v.modelo,v.placa),new.fornecedor,
    case when new.status='issued' then new.emitido_por else new.atividade_por end,new.atividade_usuario_id
  from public.frota_veiculos v where v.id=new.veiculo_id;
  return new;
end;
$$;
create or replace function public.listar_frota_notificacoes(p_empresa uuid,p_usuario uuid,p_before bigint default null)
returns jsonb language sql stable security invoker set search_path = '' as $$
select jsonb_build_object(
  'hasMore', (select count(*)>30 from (select 1 from public.frota_notificacoes where prefeitura_id=p_empresa and (p_before is null or id<p_before) limit 31) page),
  'unread', (select count(*) from public.frota_notificacoes n where n.prefeitura_id=p_empresa and n.autor_id is distinct from p_usuario
    and not exists(select 1 from public.frota_notificacao_leituras r where r.usuario_id=p_usuario and r.notificacao_id=n.id)),
  'items', coalesce((select jsonb_agg(to_jsonb(t) order by t.id desc) from (
    select n.*, (n.autor_id=p_usuario or exists(select 1 from public.frota_notificacao_leituras r where r.usuario_id=p_usuario and r.notificacao_id=n.id)) is true as lida
    from public.frota_notificacoes n where n.prefeitura_id=p_empresa and (p_before is null or n.id<p_before)
    order by n.id desc limit 30
  ) t),'[]'::jsonb)
);
$$;
