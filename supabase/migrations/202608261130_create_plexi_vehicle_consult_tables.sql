alter table public.frota_debito_consultas
  alter column provider set default 'plexi';

alter table public.frota_debito_consultas
  alter column veiculo_id drop not null;

alter table public.frota_debitos_veiculares
  alter column provider set default 'plexi';

create table if not exists public.frota_multas_veiculares (
  id uuid primary key default gen_random_uuid(),
  consulta_id uuid not null references public.frota_debito_consultas(id) on delete cascade,
  prefeitura_id uuid not null references public.prefeituras(id) on delete cascade,
  veiculo_id uuid not null references public.frota_veiculos(id) on delete cascade,
  origem text not null default 'historico' check (origem in ('historico', 'pagar')),
  numero_auto text not null,
  situacao text,
  descricao text,
  data_infracao date,
  hora text,
  local_complemento text,
  valor numeric(12,2) not null default 0,
  raw_payload jsonb,
  created_at timestamptz not null default now(),
  unique (consulta_id, origem, numero_auto)
);

create index if not exists frota_multas_veiculares_veiculo_id_idx
on public.frota_multas_veiculares (veiculo_id);

create table if not exists public.frota_recursos_infracao (
  id uuid primary key default gen_random_uuid(),
  consulta_id uuid not null references public.frota_debito_consultas(id) on delete cascade,
  prefeitura_id uuid not null references public.prefeituras(id) on delete cascade,
  veiculo_id uuid not null references public.frota_veiculos(id) on delete cascade,
  processo text,
  numero_auto text,
  detalhamento_infracao text,
  resultado_processo text,
  raw_payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists frota_recursos_infracao_veiculo_id_idx
on public.frota_recursos_infracao (veiculo_id);

create table if not exists public.frota_processos_veiculares (
  id uuid primary key default gen_random_uuid(),
  consulta_id uuid not null references public.frota_debito_consultas(id) on delete cascade,
  prefeitura_id uuid not null references public.prefeituras(id) on delete cascade,
  veiculo_id uuid not null references public.frota_veiculos(id) on delete cascade,
  processo text,
  inicio_em text,
  final_em text,
  interessado text,
  situacao text,
  servicos jsonb not null default '[]'::jsonb,
  raw_payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists frota_processos_veiculares_veiculo_id_idx
on public.frota_processos_veiculares (veiculo_id);
