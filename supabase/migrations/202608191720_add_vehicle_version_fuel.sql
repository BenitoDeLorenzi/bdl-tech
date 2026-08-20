alter table public.frota_veiculos
add column if not exists versao text,
add column if not exists combustivel text;
