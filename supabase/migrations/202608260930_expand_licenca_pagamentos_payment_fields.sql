alter table public.licenca_pagamentos
  add column if not exists forma_pagamento text,
  add column if not exists documento text;
