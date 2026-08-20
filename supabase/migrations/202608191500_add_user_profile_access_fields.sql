alter table public.perfis
add column if not exists email text,
add column if not exists username text unique,
add column if not exists ativo boolean not null default true;
