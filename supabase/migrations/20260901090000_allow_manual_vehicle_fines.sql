alter table public.frota_multas_veiculares
  alter column consulta_id drop not null;

alter table public.frota_multas_veiculares
  drop constraint if exists frota_multas_veiculares_origem_check;

alter table public.frota_multas_veiculares
  add constraint frota_multas_veiculares_origem_check
  check (origem in ('historico', 'manual', 'pagar'));

create unique index if not exists frota_multas_veiculares_manual_auto_idx
on public.frota_multas_veiculares (veiculo_id, numero_auto)
where origem = 'manual';
