create table if not exists public.frota_relatorios (
  id uuid primary key default gen_random_uuid(),
  prefeitura_id uuid not null references public.prefeituras(id) on delete cascade,
  tipo text not null check (tipo in ('vehicles', 'fuel', 'maintenance', 'expirations')),
  titulo text not null,
  periodo_inicio date,
  periodo_fim date,
  filtros jsonb not null default '{}'::jsonb,
  total_registros integer not null default 0,
  valor_total numeric(14,2) not null default 0,
  status text not null default 'generated' check (status in ('generated', 'archived', 'cancelled')),
  criado_por uuid references public.perfis(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists frota_relatorios_prefeitura_id_idx
on public.frota_relatorios(prefeitura_id);

create index if not exists frota_relatorios_tipo_idx
on public.frota_relatorios(tipo);

create index if not exists frota_relatorios_created_at_idx
on public.frota_relatorios(created_at desc);
