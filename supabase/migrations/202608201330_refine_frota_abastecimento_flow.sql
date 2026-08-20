create table if not exists public.frota_postos_credenciados (
  id uuid primary key default gen_random_uuid(),
  prefeitura_id uuid not null references public.prefeituras(id) on delete cascade,
  nome text not null,
  cnpj text,
  endereco text,
  telefone text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists frota_postos_credenciados_prefeitura_id_idx
on public.frota_postos_credenciados (prefeitura_id);

alter table public.frota_abastecimentos
add column if not exists posto_id uuid references public.frota_postos_credenciados(id) on delete set null,
add column if not exists emitido_por text,
add column if not exists concluido_por text,
add column if not exists numero_nota_fiscal text,
add column if not exists completed_at timestamptz,
alter column quilometragem drop not null;
