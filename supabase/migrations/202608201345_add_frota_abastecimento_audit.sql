alter table public.frota_abastecimentos
add column if not exists print_count integer not null default 0,
add column if not exists last_printed_at timestamptz,
add column if not exists motivo_cancelamento text,
add column if not exists cancelled_at timestamptz;

create unique index if not exists frota_abastecimentos_one_pending_per_vehicle_idx
on public.frota_abastecimentos (veiculo_id)
where status = 'issued';
