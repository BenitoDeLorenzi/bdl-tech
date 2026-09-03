insert into public.permissoes (modulo_id, chave, nome, descricao)
select
  modulos.id,
  'reports.read',
  'Visualizar relatórios',
  'Permite consultar relatórios gerenciais do módulo de frotas.'
from public.modulos
where modulos.slug = 'frotas-publicas'
on conflict (modulo_id, chave) do update
set nome = excluded.nome,
    descricao = excluded.descricao;
