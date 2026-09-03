create table if not exists public.licenca_pagamentos (
  id uuid primary key default gen_random_uuid(),
  licenca_id uuid not null references public.licencas(id) on delete cascade,
  prefeitura_id uuid not null references public.prefeituras(id) on delete cascade,
  modulo_id uuid not null references public.modulos(id) on delete restrict,
  numero_parcela integer not null check (numero_parcela between 1 and 12),
  competencia date not null,
  vencimento date not null,
  valor numeric(12, 2) not null default 0,
  status text not null default 'open' check (status in ('open', 'paid', 'overdue', 'cancelled')),
  pago_em date,
  valor_pago numeric(12, 2),
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (licenca_id, numero_parcela)
);

create index if not exists licenca_pagamentos_licenca_id_idx
  on public.licenca_pagamentos (licenca_id);

create index if not exists licenca_pagamentos_prefeitura_id_idx
  on public.licenca_pagamentos (prefeitura_id);

create index if not exists licenca_pagamentos_status_idx
  on public.licenca_pagamentos (status);

insert into public.licenca_pagamentos (
  licenca_id,
  prefeitura_id,
  modulo_id,
  numero_parcela,
  competencia,
  vencimento,
  valor,
  status
)
select
  licencas.id,
  licencas.prefeitura_id,
  licencas.modulo_id,
  parcelas.numero_parcela,
  (
    licencas.inicio
    + ((parcelas.numero_parcela - 1)::text || ' month')::interval
  )::date as competencia,
  (
    licencas.inicio
    + ((parcelas.numero_parcela - 1)::text || ' month')::interval
  )::date as vencimento,
  round(coalesce(licencas.valor_anual, 0) / 12, 2) as valor,
  case
    when (
      licencas.inicio
      + ((parcelas.numero_parcela - 1)::text || ' month')::interval
    )::date < current_date then 'overdue'
    else 'open'
  end as status
from public.licencas
cross join generate_series(1, 12) as parcelas(numero_parcela)
on conflict (licenca_id, numero_parcela) do nothing;
