create table if not exists public.frota_veiculo_anexos (
  id uuid primary key default gen_random_uuid(),
  prefeitura_id uuid not null references public.prefeituras(id) on delete cascade,
  veiculo_id uuid not null references public.frota_veiculos(id) on delete cascade,
  file_name text not null,
  file_path text not null,
  file_type text,
  file_size integer,
  created_at timestamptz not null default now()
);

create index if not exists frota_veiculo_anexos_veiculo_id_idx
on public.frota_veiculo_anexos (veiculo_id);
