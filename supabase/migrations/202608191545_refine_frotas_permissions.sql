delete from public.permissoes
where modulo_id in (
  select id from public.modulos where slug = 'frotas-publicas'
);

insert into public.permissoes (modulo_id, chave, nome, descricao)
select
  modulos.id,
  permissoes.chave,
  permissoes.nome,
  permissoes.descricao
from public.modulos
cross join (
  values
    ('vehicles.create', 'Cadastrar veículos', 'Permite cadastrar veículos no módulo Frotas Públicas.'),
    ('vehicles.update', 'Editar veículos', 'Permite editar veículos no módulo Frotas Públicas.'),
    ('vehicles.delete', 'Excluir veículos', 'Permite excluir veículos no módulo Frotas Públicas.'),
    ('vehicles.manage', 'Gerenciamento de veículos', 'Permite acessar recursos de gerenciamento de veículos.'),
    ('vehicles.read', 'Visualizar veículos', 'Permite visualizar veículos no módulo Frotas Públicas.'),
    ('expirations.manage', 'Gerenciamento de vencimentos (Seguro, IPVA)', 'Permite gerenciar vencimentos de seguro e IPVA.'),
    ('expirations.read', 'Visualizar vencimentos', 'Permite visualizar vencimentos de seguro e IPVA.')
) as permissoes(chave, nome, descricao)
where modulos.slug = 'frotas-publicas'
on conflict (modulo_id, chave) do update
set nome = excluded.nome,
    descricao = excluded.descricao;
