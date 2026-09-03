create table if not exists public.licenca_renovacoes (
  id uuid primary key default gen_random_uuid(),
  licenca_id uuid not null references public.licencas(id) on delete cascade,
  prefeitura_id uuid not null references public.prefeituras(id) on delete cascade,
  modulo_id uuid not null references public.modulos(id) on delete restrict,
  inicio_anterior date not null,
  fim_anterior date not null,
  valor_anual_anterior numeric(12, 2),
  inicio_novo date not null,
  fim_novo date not null,
  valor_anual_novo numeric(12, 2),
  pagamentos_snapshot jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists licenca_renovacoes_licenca_id_idx
  on public.licenca_renovacoes (licenca_id);

create index if not exists licenca_renovacoes_prefeitura_id_idx
  on public.licenca_renovacoes (prefeitura_id);
