alter table public.frota_veiculos
  drop constraint if exists frota_veiculos_status_check;

alter table public.frota_veiculos
  add constraint frota_veiculos_status_check
  check (status in ('active', 'maintenance', 'inactive', 'processing', 'consult_error'));
