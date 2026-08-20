create table if not exists public.frota_debito_consultas (
  id uuid primary key default gen_random_uuid(),
  prefeitura_id uuid not null references public.prefeituras(id) on delete cascade,
  veiculo_id uuid not null references public.frota_veiculos(id) on delete cascade,
  provider text not null default 'celcoin',
  client_request_id text not null unique,
  id_consult text,
  status text not null default 'pending' check (status in ('pending', 'processing', 'success', 'error', 'disabled')),
  state text not null default 'SC',
  license_plate text not null,
  renavam text not null,
  request_payload jsonb,
  response_payload jsonb,
  error_code text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists frota_debito_consultas_veiculo_id_idx
on public.frota_debito_consultas (veiculo_id);

create index if not exists frota_debito_consultas_id_consult_idx
on public.frota_debito_consultas (id_consult);

create table if not exists public.frota_debitos_veiculares (
  id uuid primary key default gen_random_uuid(),
  consulta_id uuid not null references public.frota_debito_consultas(id) on delete cascade,
  prefeitura_id uuid not null references public.prefeituras(id) on delete cascade,
  veiculo_id uuid not null references public.frota_veiculos(id) on delete cascade,
  provider text not null default 'celcoin',
  provider_debit_id text not null,
  type text,
  title text,
  description text,
  amount numeric(12,2) not null default 0,
  due_date timestamptz,
  expiration_date timestamptz,
  is_expired boolean not null default false,
  required boolean not null default false,
  year integer,
  depends_on jsonb not null default '[]'::jsonb,
  distinct_items jsonb not null default '[]'::jsonb,
  raw_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (consulta_id, provider_debit_id)
);

create index if not exists frota_debitos_veiculares_veiculo_id_idx
on public.frota_debitos_veiculares (veiculo_id);
