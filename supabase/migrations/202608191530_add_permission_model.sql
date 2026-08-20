do $$
begin
  if not exists (
    select 1
    from pg_enum
    where enumlabel = 'municipal_admin'
      and enumtypid = 'public.app_role'::regtype
  ) then
    alter type public.app_role add value 'municipal_admin';
  end if;
end $$;

update public.perfis
set role = 'bdl_admin'
where role::text = 'bdl_partner';

create table if not exists public.permissoes (
  id uuid primary key default gen_random_uuid(),
  modulo_id uuid not null references public.modulos(id) on delete cascade,
  chave text not null,
  nome text not null,
  descricao text,
  created_at timestamptz not null default now(),
  unique (modulo_id, chave)
);

create table if not exists public.usuario_modulos (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.perfis(id) on delete cascade,
  prefeitura_id uuid not null references public.prefeituras(id) on delete cascade,
  modulo_id uuid not null references public.modulos(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (usuario_id, prefeitura_id, modulo_id)
);

create table if not exists public.usuario_permissoes (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.perfis(id) on delete cascade,
  permissao_id uuid not null references public.permissoes(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (usuario_id, permissao_id)
);

insert into public.permissoes (modulo_id, chave, nome, descricao)
select
  modulos.id,
  permissoes.chave,
  permissoes.nome,
  permissoes.descricao
from public.modulos
cross join (
  values
    ('vehicles.create', 'Cadastrar veículos', 'Permite cadastrar veículos no módulo Frotas Públicas.'),
    ('vehicles.update', 'Editar veículos', 'Permite editar veículos no módulo Frotas Públicas.'),
    ('vehicles.delete', 'Excluir veículos', 'Permite excluir veículos no módulo Frotas Públicas.'),
    ('vehicles.manage', 'Gerenciamento de veículos', 'Permite acessar recursos de gerenciamento de veículos.'),
    ('vehicles.read', 'Visualizar veículos', 'Permite visualizar veículos no módulo Frotas Públicas.'),
    ('expirations.manage', 'Gerenciamento de vencimentos (Seguro, IPVA)', 'Permite gerenciar vencimentos de seguro e IPVA.'),
    ('expirations.read', 'Visualizar vencimentos', 'Permite visualizar vencimentos de seguro e IPVA.')
) as permissoes(chave, nome, descricao)
where modulos.slug = 'frotas-publicas'
on conflict (modulo_id, chave) do nothing;
