# Oficinas

- Cadastro em `/frotas/oficinas`, com edição e ativação/inativação pelo formulário.
- Permissões: `workshops.read` e `workshops.manage`. Master e administrador da empresa seguem o acesso integral existente; outros usuários recebem acesso na configuração de permissões.
- Oficinas pertencem a uma empresa. CPF/CNPJ é opcional e, quando preenchido, não pode se repetir na mesma empresa.
- Novas manutenções exigem uma oficina ativa da empresa do veículo. O servidor consulta o nome cadastrado e grava `oficina_id` e uma cópia do nome em `oficina`.
- Manutenções antigas conservam o texto anterior. Para corrigir uma ordem, cancele e registre uma nova; a edição de manutenções está bloqueada. Oficinas posteriormente inativadas permanecem nos registros existentes.
- A chave estrangeira composta `(oficina_id, prefeitura_id)` impede vínculos entre empresas diferentes no banco.
- A tabela tem RLS ativado e acesso direto revogado para `anon` e `authenticated`. O acesso ocorre pelas ações no servidor, com validação de permissões e empresa, usando o cliente de serviço já adotado pelo projeto. O aviso informativo `rls_enabled_no_policy` é esperado nesse modelo de acesso exclusivo pelo servidor.
- Migração: `supabase/migrations/20261008163200_create_frota_oficinas.sql`.
- Testes: `node scripts/oficinas.test.cjs`. A verificação de inserção/edição no banco foi executada dentro de uma transação revertida, sem deixar registros de teste.
