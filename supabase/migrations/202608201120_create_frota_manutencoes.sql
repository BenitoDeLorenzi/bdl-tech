create table if not exists public.frota_manutencoes (
  id uuid primary key default gen_random_uuid(),
  prefeitura_id uuid not null references public.prefeituras(id) on delete cascade,
  veiculo_id uuid not null references public.frota_veiculos(id) on delete cascade,
  tipo text not null,
  descricao text not null,
  oficina text,
  responsavel text,
  data_entrada date not null,
  data_saida date,
  valor numeric(12,2),
  quilometragem integer,
  status text not null default 'open' check (status in ('open', 'completed', 'cancelled')),
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists frota_manutencoes_prefeitura_id_idx
on public.frota_manutencoes (prefeitura_id);

create index if not exists frota_manutencoes_veiculo_id_idx
on public.frota_manutencoes (veiculo_id);

create table if not exists public.frota_manutencao_anexos (
  id uuid primary key default gen_random_uuid(),
  manutencao_id uuid not null references public.frota_manutencoes(id) on delete cascade,
  prefeitura_id uuid not null references public.prefeituras(id) on delete cascade,
  veiculo_id uuid not null references public.frota_veiculos(id) on delete cascade,
  file_name text not null,
  file_path text not null,
  file_type text,
  file_size integer,
  created_at timestamptz not null default now()
);

create index if not exists frota_manutencao_anexos_manutencao_id_idx
on public.frota_manutencao_anexos (manutencao_id);
