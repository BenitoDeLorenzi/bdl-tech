alter table public.frota_postos_credenciados
  add column if not exists senha_hash text;

create unique index if not exists frota_postos_credenciados_cnpj_key
on public.frota_postos_credenciados (cnpj)
where cnpj is not null;
