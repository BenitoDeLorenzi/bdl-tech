delete from public.frota_motoristas
where cpf is null or cpf = '';

alter table public.frota_motoristas
  alter column cpf set not null;

insert into public.permissoes (modulo_id, chave, nome, descricao)
select m.id, p.chave, p.nome, p.descricao
from public.modulos m
cross join (
  values
    ('drivers.read', 'Visualizar motoristas', 'Permite consultar motoristas cadastrados.'),
    ('drivers.manage', 'Gerenciar motoristas', 'Permite cadastrar, editar, ativar e inativar motoristas.')
) as p(chave, nome, descricao)
where m.slug = 'frotas-publicas'
on conflict (modulo_id, chave) do update
set nome = excluded.nome,
    descricao = excluded.descricao;
