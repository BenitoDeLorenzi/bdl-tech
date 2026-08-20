alter table public.prefeituras
  add column if not exists brasao_url text,
  add column if not exists brasao_path text;
