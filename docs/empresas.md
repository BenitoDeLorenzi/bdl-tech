# Empresas e acesso aos módulos

O cadastro central é `/empresas`, com dados cadastrais, logotipo, licenças e usuários. Atende empresas privadas e órgãos públicos. As rotas antigas `/prefeituras` redirecionam para Empresas.

## Usuários
Cadastro em `/usuarios`, login por CPF e senha. Cada usuário da empresa pertence a uma empresa. O administrador Vibe gerencia o painel; o administrador da empresa acessa os módulos licenciados; o usuário da empresa recebe módulos e permissões específicos. Trocar empresa ou perfil remove as permissões anteriores em uma transação. Novos acessos são configurados no botão de permissões.

## Licenças
O portal e as operações verificam empresa ativa, módulo ativo, licença ativa, início e fim (data de São Paulo), vínculo e permissão do usuário. O acesso do administrador Vibe ao painel permanece global. No Gestão, mesmo o suporte opera apenas empresas com licença vigente. Adicionar uma licença do Gestão provisiona a unidade Principal. Suspender a licença preserva o estoque e o histórico.

## Compatibilidade
A tabela central foi renomeada para `empresas`, preservando IDs e FKs. `prefeituras` é uma view de compatibilidade; `gestao_empresas` é uma projeção com RLS do mesmo cadastro. Os nomes internos `prefeitura_id`, `municipal_admin`, `municipal_user` e o bucket de imagens existente foram mantidos para preservar Frotas e integrações. Eles não representam cadastros separados. A tabela legada `gestao_membros` não concede mais acesso; o vínculo é central.

## Migrations
A migration `20260923124753_create_gestao_estabelecimentos.sql` já foi aplicada ao projeto BDL Tech. Rodá-la manualmente de novo causa **42P07: relation already exists**. Não remova tabelas nem repita CREATE para contornar esse erro.

A mudança de Empresas está na migration posterior `20260923134305_unify_empresas_module_access.sql`, também já aplicada. Use o histórico de migrations para aplicar somente as pendentes. Não execute novamente as migrations já registradas.

## Verificação
- `npm run build`
- ESLint dos arquivos alterados.
- `supabase/tests/gestao_core.sql`: estoque, fechamento, reconciliação, isolamento e RLS.
- `supabase/tests/empresas_acessos.sql`: concessão/revogação, transferência, licença suspensa/vencida/futura, empresa e módulo inativos.
Os testes SQL fazem ROLLBACK e não persistem fixtures.
