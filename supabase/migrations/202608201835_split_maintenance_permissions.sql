delete from public.usuario_permissoes
where permissao_id in (
  select id
  from public.permissoes
  where chave in ('maintenance.manage', 'maintenance.delete')
);

delete from public.permissoes
where chave in ('maintenance.manage', 'maintenance.delete')
  and modulo_id in (
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
    ('maintenance.complete', 'Concluir manutenção', 'Permite concluir manutenções abertas.'),
    ('maintenance.cancel', 'Cancelar manutenção', 'Permite cancelar manutenções abertas.')
) as permissoes(chave, nome, descricao)
where modulos.slug = 'frotas-publicas'
on conflict (modulo_id, chave) do update
set nome = excluded.nome,
    descricao = excluded.descricao;
