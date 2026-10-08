# Vibe Gestão — primeira entrega

Módulo em `/gestao`, acessível pelo portal. As vendas acontecem em outro sistema: uma linha por produto vendido no dia/turno, com quantidade e valor líquido efetivo. Os pagamentos são a distribuição dessas vendas, nunca uma segunda receita.

## Padrão visual obrigatório

Seguir o módulo Vibe Frotas: composição de SidebarProvider/SidebarInset, sidebar recolhível com grupos, seletor no topo e usuário no rodapé; cabeçalho de 64px com ações; listagens em Card/Table e cadastros em Dialog. Usar os mesmos componentes de interface, espaçamentos, botões e modais. Não adicionar loading.tsx, skeleton ou tela de carregamento entre rotas. Indicadores de processamento ficam apenas nas ações de salvar/confirmar.

## Disponível

- Cadastro central em /empresas. Uma licença ativa do Vibe Gestão cria a primeira unidade automaticamente; seleção de unidade no módulo.
- Usuários cadastrados por CPF em /usuarios e vinculados à empresa. Administrador da empresa administra os módulos licenciados; usuário da empresa recebe módulos e permissões individuais. No Gestão, o módulo habilita operação de fechamentos e a permissão gestao.manage libera administração.
- Cadastro de produtos e unidades de medida, preço de referência e estoque mínimo.
- Entradas, ajustes, perdas e consumo interno com motivo e responsável.
- Fechamento por produto e distribuição por forma de pagamento e maquininha/conta.
- Rascunho editável; confirmação por gestor com valores reconciliados.
- Reabertura justificada com estorno e histórico imutável de movimentações.
- Painel e histórico dos últimos 100 fechamentos/movimentações.

## Regras

- Rascunho não baixa estoque. Confirmar baixa uma vez; reabrir devolve uma vez. Cada reconfirmação após edição gera novas movimentações rastreáveis.
- Conferir significa validar os números informados; não confirma liquidação bancária.
- Pagamentos são brutos antes de taxas. Totais dos itens já incluem descontos/cancelamentos do relatório externo.
- Quantidades têm até três casas; valores monetários, duas. O banco usa numeric e a interface soma valores monetários em centavos.
- Estoque negativo é permitido para registrar vendas reais ainda sem todas as entradas, mas aparece como pendência de conferência.
- Cada produto é baixado diretamente na sua unidade de controle. Não há conversão de embalagem ou ficha técnica nesta entrega.
- A revisão do fechamento bloqueia sobrescrita de alterações concorrentes. Chave de unidade/data/turno/origem impede repetição de um relatório.
- Acesso de gestor/operador vale para todas as unidades da empresa. O administrador Vibe tem acesso transversal às empresas com licença vigente do Gestão. Empresa e módulo precisam estar ativos e a licença dentro da vigência. Suspensão retém os dados, mas bloqueia acesso.
- Leitura usa sessão autenticada e RLS. Escrita usa RPC restrita a service_role, executada no servidor após autenticação; a RPC valida perfil ativo, empresa e papel novamente e executa cada alteração em uma transação.
- Não alterar saldo diretamente: usar o registro de movimento para preservar rastreabilidade.

## Verificação

`npm run build`; `npx eslint src/app/gestao src/lib/gestao-data.ts src/lib/gestao-types.ts`.

`supabase/tests/gestao_core.sql` executa fixtures dentro de transação e termina com ROLLBACK. Cobre segregação, permissões, estoque, conferência, estorno, concorrência otimista e acesso anônimo.

`node --env-file=.env.local scripts/gestao-browser-fixture.mjs setup` cria uma empresa e usuário temporários para teste visual. A sessão fica no diretório temporário do sistema, fora do repositório. Sempre executar `cleanup` ao terminar. Não usar contas reais nos testes.

## Próximas entregas acordadas

Compras e fornecedores; financeiro e recebíveis com taxas/prazos; equipe, diárias e escalas; fichas técnicas; inventário completo; anexos; importação de planilhas; relatórios gerenciais; administração de mais unidades. O ciclo comercial de licenças já usa o painel central. Essas funcionalidades ainda não estão implementadas. Operação atual exige internet.

## Catálogo de produtos e categorias

- Cadastros → Categorias (`/gestao/categorias`): nome, descrição, situação e edição. Compartilhadas somente entre unidades da mesma empresa.
- 13 categorias-base provisionadas pela migration `20260923142419_enhance_gestao_products_categories.sql` nas empresas existentes do Gestão e, automaticamente, na primeira unidade de novas empresas. Renomear/inativar não faz a base reaparecer ao adicionar unidades.
- Produtos: código automático `PROD-000001` (sequência não necessariamente contínua), categoria obrigatória, unidade, preço opcional de referência, controle de estoque, mínimo, situação e observações. Sem fotos ou Finalidade.
- Preço de venda é opcional: vazio é NULL e R$ 0,00 é zero explícito. O fechamento registra o valor efetivo da venda. Custo e margem foram retirados do cadastro e da listagem de produtos; custos existentes são preservados e não podem mais ser alterados por esse formulário.
- Categorias inativas não podem ser atribuídas a novos produtos; os vínculos atuais são preservados. Produtos inativos não entram em novos fechamentos e permanecem no histórico.
- Código e saldo não são editáveis. Unidade e controle de estoque não podem mudar após movimentações ou uso em fechamentos; isso protege a interpretação de quantidades antigas.
- Produtos sem controle de estoque aparecem nas vendas, mas não geram movimentos de baixa/estorno nem alertas de reposição. Movimentos manuais também são bloqueados.
- Categoria/produto possuem revisão para impedir sobrescrita de edições concorrentes. Escritas validam papel de gestor, licença e empresa no banco.
- Valores monetários do Gestão (preço, total vendido e recebimentos) usam máscara BRL e enviam números decimais canônicos. O custo unitário opcional é informado por entrada; o total é calculado no banco e exibido no histórico. Não há cálculo de custo médio do estoque.
- Verificações adicionais: `supabase/tests/gestao_catalogo.sql` e `node --experimental-strip-types scripts/gestao-money.test.mjs`.

### Reformulação do cadastro
O código é reservado ao clicar em Novo produto e já aparece no input, somente leitura. A reserva pertence ao usuário e à unidade, expira em 24 horas e é consumida na mesma transação que cria o produto. Falha ao salvar preserva a reserva; cancelar pode deixar lacunas na sequência. Preço em branco permanece não informado. Custo em entradas é registrado no movimento, sem alterar o catálogo. Teste: supabase/tests/gestao_cadastro_produto.sql.
O formulário de produto usa React Hook Form, sem validação nativa do navegador, com mensagens associadas a cada campo e validação compartilhada no servidor.

### Exclusão segura de produtos
A lixeira abre uma confirmação com opção de inativar. A exclusão exige gestor com licença vigente, versão atual do cadastro, saldo zero e ausência de movimentações e fechamentos (inclusive rascunhos e itens removidos posteriormente, encontrados na auditoria). O banco bloqueia o produto durante a verificação para serializar com estoque e gravação de fechamentos. A exclusão guarda uma auditoria com o cadastro anterior; inativar preserva saldo e histórico. Migration: `20260923144834_safe_product_deletion.sql`; teste transacional: `supabase/tests/gestao_exclusao_produto.sql`.

### Estoque: busca e custo
O movimento usa Combobox shadcn com busca por nome (ignorando acentos) ou código, unidade e saldo. O formulário usa React Hook Form. Entradas aceitam custo unitário opcional em BRL: branco é NULL, zero é explícito. O total usa quantidade × custo com arredondamento para centavos no banco; entradas antigas mantêm seu custo original. Perdas, consumo, ajustes, vendas e estornos não recebem custo de compra. Migration: `20260923150421_stock_movement_cost.sql`. Teste: `supabase/tests/gestao_custo_movimento.sql`.

Todos os selects visíveis usam shadcn (Produtos, Categorias, Movimentações e Fechamentos). A regra permanente está em AGENTS.md.

### Estorno de movimentações manuais
No histórico, gestores podem estornar entradas, perdas, consumo e ajustes com justificativa de 3 a 500 caracteres. O banco cria uma linha inversa vinculada à original, registra autor e data, marca o original como estornado e preserva a auditoria. Entradas com custo geram custo total inverso; o custo original não é apagado. A operação é atômica, bloqueia o movimento e o produto e admite apenas um estorno por original, inclusive em novas tentativas. Não permite estornar estornos ou movimentos de fechamento (use a reabertura do fechamento). Estornos que retirariam quantidade deixando saldo negativo são bloqueados. Para corrigir dados, estorne e registre o movimento correto. Migration: `20260923152321_reverse_stock_movement.sql`. Teste: `supabase/tests/gestao_estorno_movimento.sql`.

### Fechamento por etapas e preço unitário
O formulário usa quatro etapas: Identificação, Produtos, Recebimentos e Observações/conferência. React Hook Form preserva os dados ao navegar e valida antes de avançar. Os totais e ações finais ficam na última etapa. Cada produto exige preço unitário em BRL, sugerido pelo catálogo quando disponível. Quantidade × preço preenche o total, que pode ser ajustado para descontos. O preço unitário é salvo no item; só a confirmação atualiza o preço de referência do produto, inclusive sem controle de estoque, na mesma transação da baixa e com auditoria. Rascunhos não alteram o catálogo. Reabrir reverte o estoque, mantendo o último preço confirmado como referência; uma nova confirmação aplica os preços corrigidos. Fechamentos antigos sem preço unitário armazenado não alteram o catálogo ao serem confirmados diretamente; na edição, o campo é sugerido pelo total/quantidade antigo. Migration: `20260923154639_closing_product_unit_prices.sql`. Teste: `supabase/tests/gestao_preco_fechamento.sql`.
