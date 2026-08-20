alter table public.frota_veiculos
add column if not exists foto_url text,
add column if not exists foto_path text;
