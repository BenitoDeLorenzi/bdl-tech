create table if not exists public.frota_veiculos (
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

create table if not exists public.frota_vencimentos (
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
