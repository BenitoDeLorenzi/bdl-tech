alter table public.frota_veiculos
  add column if not exists lugares text,
  add column if not exists cor text,
  add column if not exists carroceria text,
  add column if not exists categoria text,
  add column if not exists ano_fabricacao integer,
  add column if not exists ano_modelo integer,
  add column if not exists data_aquisicao date,
  add column if not exists municipio_emplacamento text,
  add column if not exists situacao_veicular text,
  add column if not exists proprietario_atual text,
  add column if not exists proprietario_anterior text,
  add column if not exists restricao_venda text,
  add column if not exists restricoes text,
  add column if not exists licenciado text,
  add column if not exists origem_dados text,
  add column if not exists principal_condutor text,
  add column if not exists especie text,
  add column if not exists consulta_raw jsonb;

update public.frota_veiculos
set ano_modelo = coalesce(ano_modelo, ano),
    ano_fabricacao = coalesce(ano_fabricacao, ano)
where ano is not null;
