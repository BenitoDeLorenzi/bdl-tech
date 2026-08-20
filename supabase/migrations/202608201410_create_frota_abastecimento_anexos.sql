create table if not exists public.frota_abastecimento_anexos (
  id uuid primary key default gen_random_uuid(),
  abastecimento_id uuid not null references public.frota_abastecimentos(id) on delete cascade,
  prefeitura_id uuid not null references public.prefeituras(id) on delete cascade,
  veiculo_id uuid not null references public.frota_veiculos(id) on delete cascade,
  file_name text not null,
  file_path text not null,
  file_type text,
  file_size integer,
  created_at timestamptz not null default now()
);

create index if not exists frota_abastecimento_anexos_abastecimento_id_idx
on public.frota_abastecimento_anexos (abastecimento_id);

create index if not exists frota_abastecimento_anexos_veiculo_id_idx
on public.frota_abastecimento_anexos (veiculo_id);
