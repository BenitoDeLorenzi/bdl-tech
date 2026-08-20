alter table public.frota_vencimento_pagamentos
add column if not exists exercicio integer,
add column if not exists valor_total numeric(12,2),
add column if not exists forma_pagamento text check (forma_pagamento in ('cota_unica', 'parcelado')),
add column if not exists quantidade_parcelas integer not null default 1,
add column if not exists parcelas_pagas integer not null default 1,
add column if not exists status text not null default 'paid' check (status in ('pending', 'partial', 'paid')),
add column if not exists observacoes text;

create table if not exists public.frota_vencimento_pagamento_parcelas (
  id uuid primary key default gen_random_uuid(),
  pagamento_id uuid not null references public.frota_vencimento_pagamentos(id) on delete cascade,
  numero integer not null,
  valor numeric(12,2) not null,
  data_vencimento date not null,
  data_pagamento date,
  status text not null default 'pending' check (status in ('pending', 'paid', 'overdue')),
  created_at timestamptz not null default now(),
  unique (pagamento_id, numero)
);

create index if not exists frota_vencimento_pagamento_parcelas_pagamento_id_idx
on public.frota_vencimento_pagamento_parcelas (pagamento_id);
