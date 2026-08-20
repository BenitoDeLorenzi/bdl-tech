create table if not exists public.frota_vencimento_pagamentos (
  id uuid primary key default gen_random_uuid(),
  prefeitura_id uuid not null references public.prefeituras(id) on delete cascade,
  veiculo_id uuid not null references public.frota_veiculos(id) on delete cascade,
  vencimento_id uuid not null references public.frota_vencimentos(id) on delete cascade,
  tipo text not null check (tipo in ('seguro', 'ipva', 'licenciamento')),
  data_vencimento_pago date not null,
  data_pagamento date not null default current_date,
  proximo_vencimento date not null,
  created_at timestamptz not null default now()
);

create index if not exists frota_vencimento_pagamentos_vencimento_id_idx
on public.frota_vencimento_pagamentos (vencimento_id);
