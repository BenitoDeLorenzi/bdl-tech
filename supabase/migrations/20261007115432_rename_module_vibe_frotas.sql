-- Rename the brand without changing module identity, licenses or permission keys.
update public.modulos
set nome = 'Vibe Frotas'
where slug = 'frotas-publicas';

update public.permissoes
set descricao = regexp_replace(descricao, 'Frotas P[uú]blicas', 'Vibe Frotas', 'gi')
where modulo_id in (select id from public.modulos where slug = 'frotas-publicas')
  and descricao ~* 'Frotas P[uú]blicas';
