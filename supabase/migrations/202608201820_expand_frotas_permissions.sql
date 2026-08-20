insert into public.permissoes (modulo_id, chave, nome, descricao)
select
  modulos.id,
  permissoes.chave,
  permissoes.nome,
  permissoes.descricao
from public.modulos
cross join (
  values
    ('vehicles.create', 'Cadastrar veículos', 'Permite cadastrar veículos.'),
    ('vehicles.update', 'Editar veículos', 'Permite editar dados, foto e informações dos veículos.'),
    ('vehicles.delete', 'Excluir veículos', 'Permite excluir veículos e dados vinculados.'),
    ('vehicles.manage', 'Gerenciar veículos', 'Permite acessar recursos avançados de gestão dos veículos.'),
    ('vehicles.read', 'Visualizar veículos', 'Permite consultar veículos cadastrados.'),
    ('expirations.manage', 'Gerenciar vencimentos', 'Permite registrar e controlar vencimentos e pagamentos.'),
    ('expirations.read', 'Visualizar vencimentos', 'Permite consultar vencimentos dos veículos.'),
    ('maintenance.create', 'Registrar manutenção', 'Permite abrir registros de manutenção.'),
    ('maintenance.update', 'Editar manutenção', 'Permite editar dados, valores e anexos de manutenção.'),
    ('maintenance.complete', 'Concluir manutenção', 'Permite concluir manutenções abertas.'),
    ('maintenance.cancel', 'Cancelar manutenção', 'Permite cancelar manutenções abertas.'),
    ('maintenance.read', 'Visualizar manutenção', 'Permite consultar histórico de manutenção.'),
    ('fuel.create', 'Emitir ordem de abastecimento', 'Permite emitir ordens de abastecimento.'),
    ('fuel.complete', 'Concluir abastecimento', 'Permite preencher dados de conclusão de abastecimento.'),
    ('fuel.cancel', 'Cancelar ordem de abastecimento', 'Permite cancelar ordens pendentes.'),
    ('fuel.manage', 'Gerenciar abastecimento', 'Permite gerenciar ordens, impressões e fluxo de abastecimento.'),
    ('fuel.read', 'Visualizar abastecimento', 'Permite consultar ordens e histórico de abastecimento.'),
    ('fuel_stations.manage', 'Gerenciar postos', 'Permite cadastrar, editar, ativar e redefinir senhas de postos.'),
    ('fuel_stations.read', 'Visualizar postos', 'Permite consultar postos de combustível credenciados.')
) as permissoes(chave, nome, descricao)
where modulos.slug = 'frotas-publicas'
on conflict (modulo_id, chave) do update
set nome = excluded.nome,
    descricao = excluded.descricao;
