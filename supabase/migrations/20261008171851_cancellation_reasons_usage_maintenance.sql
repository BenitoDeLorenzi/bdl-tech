alter table public.frota_manutencoes
  add column if not exists cancelled_at timestamptz,
  add column if not exists motivo_cancelamento text;
alter table public.frota_uso_veiculos
  add column if not exists cancelled_at timestamptz,
  add column if not exists motivo_cancelamento text;
