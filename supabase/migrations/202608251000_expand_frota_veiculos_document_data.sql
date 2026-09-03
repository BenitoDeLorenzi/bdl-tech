alter table public.frota_veiculos
  add column if not exists exercicio integer,
  add column if not exists placa_anterior text,
  add column if not exists chassi text,
  add column if not exists capacidade text,
  add column if not exists potencia text,
  add column if not exists cilindrada text,
  add column if not exists motor text,
  add column if not exists cmt text,
  add column if not exists eixos text,
  add column if not exists lotacao text,
  add column if not exists proprietario_documento text,
  add column if not exists local_registro text,
  add column if not exists data_documento date;

update public.frota_veiculos
set exercicio = coalesce(exercicio, ano_modelo, ano),
    lotacao = coalesce(lotacao, lugares),
    local_registro = coalesce(local_registro, municipio_emplacamento),
    data_documento = coalesce(data_documento, data_aquisicao)
where exercicio is null
   or lotacao is null
   or local_registro is null
   or data_documento is null;
