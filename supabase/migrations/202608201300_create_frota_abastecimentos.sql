create table if not exists public.frota_abastecimentos (
  id uuid primary key default gen_random_uuid(),
  prefeitura_id uuid not null references public.prefeituras(id) on delete cascade,
  veiculo_id uuid not null references public.frota_veiculos(id) on delete cascade,
  numero_ordem text not null unique,
  data_abastecimento date not null default current_date,
  motorista text not null,
  fornecedor text,
  combustivel text not null,
  quilometragem integer not null,
  litros numeric(10,3),
  valor_litro numeric(10,3),
  valor_total numeric(12,2),
  status text not null default 'issued' check (status in ('issued', 'completed', 'cancelled')),
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists frota_abastecimentos_prefeitura_id_idx
on public.frota_abastecimentos (prefeitura_id);

create index if not exists frota_abastecimentos_veiculo_id_idx
on public.frota_abastecimentos (veiculo_id);
