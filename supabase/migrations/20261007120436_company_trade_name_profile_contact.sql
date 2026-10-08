alter table public.empresas add column nome_fantasia text
  check (nome_fantasia is null or (nome_fantasia = btrim(nome_fantasia) and length(nome_fantasia) between 2 and 80));
alter table public.perfis add column email_contato text
  check (email_contato is null or (length(email_contato) <= 254 and email_contato ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'));
comment on column public.perfis.email_contato is 'Contact only; never used as login identity or authorization.';
