alter table public.prefeituras
add column if not exists cep text,
add column if not exists endereco text;
