alter table public.frota_abastecimentos
add column if not exists expires_at timestamptz;

update public.frota_abastecimentos
set expires_at = created_at + interval '48 hours'
where expires_at is null;

alter table public.frota_abastecimentos
alter column expires_at set default (now() + interval '48 hours');

alter table public.frota_abastecimentos
drop constraint if exists frota_abastecimentos_status_check;

alter table public.frota_abastecimentos
add constraint frota_abastecimentos_status_check
check (status in ('issued', 'completed', 'cancelled', 'expired'));
