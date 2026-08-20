create type public.app_role as enum ('bdl_admin', 'municipal_admin', 'municipal_user');
create type public.subscription_status as enum ('active', 'implementation', 'suspended', 'expired', 'cancelled');

create table public.prefeituras (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cnpj text not null unique,
  cidade text,
  uf char(2),
  cep text,
  endereco text,
  status subscription_status not null default 'active',
  created_at timestamptz not null default now()
);

create table public.modulos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  slug text not null unique,
  subdominio text not null unique,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.perfis (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  email text,
  username text unique,
  role app_role not null default 'municipal_user',
  prefeitura_id uuid references public.prefeituras(id) on delete set null,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.licencas (
  id uuid primary key default gen_random_uuid(),
  prefeitura_id uuid not null references public.prefeituras(id) on delete cascade,
  modulo_id uuid not null references public.modulos(id) on delete restrict,
  status subscription_status not null default 'active',
  inicio date not null,
  fim date not null,
  valor_anual numeric(12, 2),
  created_at timestamptz not null default now(),
  unique (prefeitura_id, modulo_id)
);

create table public.permissoes (
  id uuid primary key default gen_random_uuid(),
  modulo_id uuid not null references public.modulos(id) on delete cascade,
  chave text not null,
  nome text not null,
  descricao text,
  created_at timestamptz not null default now(),
  unique (modulo_id, chave)
);

create table public.usuario_modulos (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.perfis(id) on delete cascade,
  prefeitura_id uuid not null references public.prefeituras(id) on delete cascade,
  modulo_id uuid not null references public.modulos(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (usuario_id, prefeitura_id, modulo_id)
);

create table public.usuario_permissoes (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.perfis(id) on delete cascade,
  permissao_id uuid not null references public.permissoes(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (usuario_id, permissao_id)
);

create table public.frota_veiculos (
  id uuid primary key default gen_random_uuid(),
  prefeitura_id uuid not null references public.prefeituras(id) on delete cascade,
  placa text not null,
  prefixo text not null,
  marca text not null,
  modelo text not null,
  ano integer not null,
  tipo text not null,
  versao text,
  combustivel text,
  secretaria text not null,
  renavam text,
  status text not null default 'active' check (status in ('active', 'maintenance', 'inactive')),
  observacoes text,
  foto_url text,
  foto_path text,
  created_at timestamptz not null default now(),
  unique (prefeitura_id, placa)
);

create table public.frota_vencimentos (
  id uuid primary key default gen_random_uuid(),
  prefeitura_id uuid not null references public.prefeituras(id) on delete cascade,
  veiculo_id uuid not null references public.frota_veiculos(id) on delete cascade,
  tipo text not null check (tipo in ('seguro', 'ipva', 'licenciamento')),
  data_vencimento date not null,
  status text not null default 'pending' check (status in ('pending', 'paid', 'expired')),
  observacoes text,
  created_at timestamptz not null default now(),
  unique (veiculo_id, tipo)
);

create table public.frota_vencimento_pagamentos (
  id uuid primary key default gen_random_uuid(),
  prefeitura_id uuid not null references public.prefeituras(id) on delete cascade,
  veiculo_id uuid not null references public.frota_veiculos(id) on delete cascade,
  vencimento_id uuid not null references public.frota_vencimentos(id) on delete cascade,
  tipo text not null check (tipo in ('seguro', 'ipva', 'licenciamento')),
  data_vencimento_pago date not null,
  data_pagamento date not null default current_date,
  proximo_vencimento date not null,
  created_at timestamptz not null default now()
);

create index frota_vencimento_pagamentos_vencimento_id_idx
on public.frota_vencimento_pagamentos (vencimento_id);

insert into public.modulos (nome, slug, subdominio)
values ('Frotas Públicas', 'frotas-publicas', 'frotaspublicas.bdltech.com.br')
on conflict (slug) do nothing;

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
