alter table public.frota_abastecimentos
add column if not exists arla_incluso boolean not null default false,
add column if not exists arla_litros numeric(10,3),
add column if not exists arla_valor_litro numeric(10,3),
add column if not exists arla_valor_total numeric(12,2);
