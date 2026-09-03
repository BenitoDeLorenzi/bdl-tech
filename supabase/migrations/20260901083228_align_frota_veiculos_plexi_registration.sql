alter table public.frota_veiculos
  alter column prefixo drop not null,
  alter column secretaria drop not null;

comment on table public.frota_veiculos is
  'Veiculos da frota. Os dados cadastrais seguem o retorno da Plexi/Detran SC; campos operacionais permanecem em tabelas especificas do modulo.';

comment on column public.frota_veiculos.placa is 'Plexi: placa';
comment on column public.frota_veiculos.renavam is 'Plexi: renavam';
comment on column public.frota_veiculos.lugares is 'Plexi: lugares';
comment on column public.frota_veiculos.tipo is 'Plexi: tipo';
comment on column public.frota_veiculos.cor is 'Plexi: cor';
comment on column public.frota_veiculos.combustivel is 'Plexi: combustivel';
comment on column public.frota_veiculos.carroceria is 'Plexi: carroceria';
comment on column public.frota_veiculos.categoria is 'Plexi: categoria';
comment on column public.frota_veiculos.ano_fabricacao is 'Plexi: anoFabricacao';
comment on column public.frota_veiculos.ano_modelo is 'Plexi: anoModelo';
comment on column public.frota_veiculos.data_aquisicao is 'Plexi: dataAquisicao';
comment on column public.frota_veiculos.municipio_emplacamento is 'Plexi: municipioEmplacamento';
comment on column public.frota_veiculos.situacao_veicular is 'Plexi: situacao';
comment on column public.frota_veiculos.marca is 'Plexi: marca';
comment on column public.frota_veiculos.modelo is 'Plexi: modelo';
comment on column public.frota_veiculos.proprietario_atual is 'Plexi: proprietarioAtual';
comment on column public.frota_veiculos.proprietario_anterior is 'Plexi: proprietarioAnterior';
comment on column public.frota_veiculos.restricao_venda is 'Plexi: restricaoVenda';
comment on column public.frota_veiculos.restricoes is 'Plexi: restricoes';
comment on column public.frota_veiculos.licenciado is 'Plexi: licenciado';
comment on column public.frota_veiculos.origem_dados is 'Plexi: origemDados';
comment on column public.frota_veiculos.principal_condutor is 'Plexi: principalCondutor';
comment on column public.frota_veiculos.especie is 'Plexi: especie';
