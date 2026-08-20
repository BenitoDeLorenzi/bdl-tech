with demo(placa, prefixo, marca, modelo, ano, tipo, versao, combustivel, secretaria, renavam, status) as (
  values
    ('SAB4I14', 'ADM-01', 'Mitsubishi', 'Outlander', 2022, 'Utilitário', 'HPE-S', 'Gasolina', 'Administração', '01295830709', 'active'),
    ('ABC1D23', 'SAU-02', 'Fiat', 'Fiorino', 2021, 'Utilitário', 'Endurance', 'Flex', 'Saúde', '12345678901', 'active'),
    ('DEF2G34', 'EDU-03', 'Volkswagen', 'Gol', 2020, 'Passeio', '1.0', 'Flex', 'Educação', '23456789012', 'active'),
    ('GHI3J45', 'OBR-04', 'Ford', 'Ranger', 2023, 'Caminhonete', 'XLS', 'Diesel', 'Obras', '34567890123', 'maintenance'),
    ('JKL4M56', 'AGR-05', 'Chevrolet', 'S10', 2022, 'Caminhonete', 'LT', 'Diesel', 'Agricultura', '45678901234', 'active'),
    ('MNO5P67', 'TRA-06', 'Mercedes-Benz', 'Sprinter', 2021, 'Van', '415 CDI', 'Diesel', 'Transporte', '56789012345', 'active'),
    ('PQR6S78', 'AMB-07', 'Renault', 'Master', 2020, 'Ambulância', 'L2H2', 'Diesel', 'Saúde', '67890123456', 'active'),
    ('STU7V89', 'EDU-08', 'Marcopolo', 'Volare', 2019, 'Ônibus', 'V8L', 'Diesel', 'Educação', '78901234567', 'active'),
    ('VWX8Y90', 'LIM-09', 'Volkswagen', 'Delivery', 2018, 'Caminhão', '11.180', 'Diesel', 'Limpeza Urbana', '89012345678', 'maintenance'),
    ('YZA9B01', 'GAB-10', 'Toyota', 'Corolla', 2022, 'Passeio', 'XEI', 'Flex', 'Gabinete', '90123456789', 'active'),
    ('BCD0E12', 'SEG-11', 'Honda', 'CG 160', 2023, 'Motocicleta', 'Cargo', 'Flex', 'Segurança', '11223344556', 'active'),
    ('EFG1H23', 'ASS-12', 'Citroen', 'Jumper', 2019, 'Van', 'Minibus', 'Diesel', 'Assistência Social', '22334455667', 'inactive'),
    ('HIJ2K34', 'ESP-13', 'Fiat', 'Toro', 2021, 'Caminhonete', 'Freedom', 'Flex', 'Esportes', '33445566778', 'active'),
    ('KLM3N45', 'MAQ-14', 'Caterpillar', 'Retroescavadeira', 2017, 'Máquina pesada', '416F2', 'Diesel', 'Obras', '44556677889', 'active'),
    ('NOP4Q56', 'AMB-15', 'Peugeot', 'Partner', 2020, 'Utilitário', 'Furgão', 'Flex', 'Saúde', '55667788990', 'active')
),
target_prefeitura as (
  select id
  from public.prefeituras
  where status = 'active'
  order by created_at
  limit 1
)
insert into public.frota_veiculos (
  prefeitura_id,
  placa,
  prefixo,
  marca,
  modelo,
  ano,
  tipo,
  versao,
  combustivel,
  secretaria,
  renavam,
  status
)
select
  target_prefeitura.id,
  demo.placa,
  demo.prefixo,
  demo.marca,
  demo.modelo,
  demo.ano,
  demo.tipo,
  demo.versao,
  demo.combustivel,
  demo.secretaria,
  demo.renavam,
  demo.status
from demo
cross join target_prefeitura
on conflict (prefeitura_id, placa) do update
set
  prefixo = excluded.prefixo,
  marca = excluded.marca,
  modelo = excluded.modelo,
  ano = excluded.ano,
  tipo = excluded.tipo,
  versao = excluded.versao,
  combustivel = excluded.combustivel,
  secretaria = excluded.secretaria,
  renavam = excluded.renavam,
  status = excluded.status;

with demo(placa, tipo, data_vencimento, status) as (
  values
    ('SAB4I14', 'ipva', '2026-08-25'::date, 'pending'),
    ('SAB4I14', 'licenciamento', '2026-09-10'::date, 'pending'),
    ('SAB4I14', 'seguro', '2026-12-15'::date, 'pending'),
    ('ABC1D23', 'ipva', '2026-07-12'::date, 'pending'),
    ('ABC1D23', 'licenciamento', '2026-08-20'::date, 'pending'),
    ('ABC1D23', 'seguro', '2027-01-30'::date, 'pending'),
    ('DEF2G34', 'ipva', '2026-10-05'::date, 'pending'),
    ('DEF2G34', 'licenciamento', '2026-10-20'::date, 'pending'),
    ('GHI3J45', 'ipva', '2026-08-18'::date, 'pending'),
    ('GHI3J45', 'licenciamento', '2026-09-02'::date, 'pending'),
    ('JKL4M56', 'ipva', '2026-11-11'::date, 'pending'),
    ('JKL4M56', 'licenciamento', '2026-11-25'::date, 'pending'),
    ('MNO5P67', 'ipva', '2026-06-30'::date, 'pending'),
    ('MNO5P67', 'licenciamento', '2026-08-28'::date, 'pending'),
    ('PQR6S78', 'ipva', '2026-09-15'::date, 'pending'),
    ('PQR6S78', 'licenciamento', '2026-09-30'::date, 'pending'),
    ('PQR6S78', 'seguro', '2026-08-21'::date, 'pending'),
    ('STU7V89', 'ipva', '2026-12-05'::date, 'pending'),
    ('STU7V89', 'licenciamento', '2027-01-05'::date, 'pending'),
    ('VWX8Y90', 'ipva', '2026-08-10'::date, 'pending'),
    ('VWX8Y90', 'licenciamento', '2026-08-19'::date, 'pending'),
    ('YZA9B01', 'ipva', '2027-02-14'::date, 'pending'),
    ('YZA9B01', 'licenciamento', '2027-02-28'::date, 'pending'),
    ('BCD0E12', 'ipva', '2026-09-01'::date, 'pending'),
    ('BCD0E12', 'licenciamento', '2026-09-18'::date, 'pending'),
    ('EFG1H23', 'ipva', '2026-05-22'::date, 'pending'),
    ('EFG1H23', 'licenciamento', '2026-06-22'::date, 'pending'),
    ('HIJ2K34', 'ipva', '2026-10-12'::date, 'pending'),
    ('HIJ2K34', 'licenciamento', '2026-10-26'::date, 'pending'),
    ('KLM3N45', 'ipva', '2026-08-22'::date, 'pending'),
    ('KLM3N45', 'licenciamento', '2026-09-22'::date, 'pending'),
    ('NOP4Q56', 'ipva', '2026-11-03'::date, 'pending'),
    ('NOP4Q56', 'licenciamento', '2026-11-17'::date, 'pending'),
    ('NOP4Q56', 'seguro', '2026-08-15'::date, 'pending')
),
target_prefeitura as (
  select id
  from public.prefeituras
  where status = 'active'
  order by created_at
  limit 1
),
target_veiculos as (
  select veiculos.id, veiculos.prefeitura_id, veiculos.placa
  from public.frota_veiculos veiculos
  join target_prefeitura on target_prefeitura.id = veiculos.prefeitura_id
)
insert into public.frota_vencimentos (
  prefeitura_id,
  veiculo_id,
  tipo,
  data_vencimento,
  status
)
select
  target_veiculos.prefeitura_id,
  target_veiculos.id,
  demo.tipo,
  demo.data_vencimento,
  demo.status
from demo
join target_veiculos on target_veiculos.placa = demo.placa
on conflict (veiculo_id, tipo) do update
set
  data_vencimento = excluded.data_vencimento,
  status = excluded.status;

with placas(placa) as (
  values
    ('SAB4I14'), ('ABC1D23'), ('DEF2G34'), ('GHI3J45'), ('JKL4M56'),
    ('MNO5P67'), ('PQR6S78'), ('STU7V89'), ('VWX8Y90'), ('YZA9B01'),
    ('BCD0E12'), ('EFG1H23'), ('HIJ2K34'), ('KLM3N45'), ('NOP4Q56')
),
target_prefeitura as (
  select id
  from public.prefeituras
  where status = 'active'
  order by created_at
  limit 1
),
demo_vencimentos as (
  select vencimentos.id
  from public.frota_vencimentos vencimentos
  join public.frota_veiculos veiculos on veiculos.id = vencimentos.veiculo_id
  join target_prefeitura on target_prefeitura.id = veiculos.prefeitura_id
  join placas on placas.placa = veiculos.placa
)
delete from public.frota_vencimento_pagamentos pagamentos
using demo_vencimentos
where pagamentos.vencimento_id = demo_vencimentos.id;

with target_prefeitura as (
  select id
  from public.prefeituras
  where status = 'active'
  order by created_at
  limit 1
),
pagamentos_demo(placa, tipo, data_vencimento_pago, data_pagamento, proximo_vencimento) as (
  values
    ('SAB4I14', 'ipva', '2025-08-25'::date, '2025-08-20'::date, '2026-08-25'::date),
    ('DEF2G34', 'licenciamento', '2025-10-20'::date, '2025-10-14'::date, '2026-10-20'::date),
    ('YZA9B01', 'ipva', '2026-02-14'::date, '2026-02-10'::date, '2027-02-14'::date),
    ('HIJ2K34', 'licenciamento', '2025-10-26'::date, '2025-10-25'::date, '2026-10-26'::date)
)
insert into public.frota_vencimento_pagamentos (
  prefeitura_id,
  veiculo_id,
  vencimento_id,
  tipo,
  data_vencimento_pago,
  data_pagamento,
  proximo_vencimento
)
select
  veiculos.prefeitura_id,
  veiculos.id,
  vencimentos.id,
  pagamentos_demo.tipo,
  pagamentos_demo.data_vencimento_pago,
  pagamentos_demo.data_pagamento,
  pagamentos_demo.proximo_vencimento
from pagamentos_demo
join target_prefeitura on true
join public.frota_veiculos veiculos
  on veiculos.prefeitura_id = target_prefeitura.id
  and veiculos.placa = pagamentos_demo.placa
join public.frota_vencimentos vencimentos
  on vencimentos.veiculo_id = veiculos.id
  and vencimentos.tipo = pagamentos_demo.tipo;
