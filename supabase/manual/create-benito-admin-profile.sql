-- Primeiro crie o usuário no Supabase Auth com:
-- E-mail: 07572251951@usuarios.bdltech.com.br
-- Senha: defina manualmente no painel do Supabase
--
-- Depois rode este SQL para vincular o Auth ao perfil do app.

insert into public.perfis (
  id,
  nome,
  cpf,
  email,
  username,
  role,
  prefeitura_id,
  ativo
)
select
  auth.users.id,
  'Benito de Lorenzi',
  '07572251951',
  null,
  null,
  'bdl_admin',
  null,
  true
from auth.users
where auth.users.email = '07572251951@usuarios.bdltech.com.br'
on conflict (id) do update
set
  nome = excluded.nome,
  cpf = excluded.cpf,
  email = excluded.email,
  username = excluded.username,
  role = excluded.role,
  prefeitura_id = excluded.prefeitura_id,
  ativo = excluded.ativo;
