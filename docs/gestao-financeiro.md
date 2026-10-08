# Financeiro do Vibe Gestão

## Acesso

Exclusivo do Master (`bdl_admin`): navegação, páginas, indicadores financeiros novos, Server Actions e leitura no banco (RLS com views `security_invoker`). Todas as operações verificam licença vigente e unidade. Administradores continuam salvando/confirmando fechamentos, cuja integração usa as contas padrão; não podem definir vínculos financeiros nem chamar a RPC financeira.

## Início

Em `/gestao/financeiro/contas`, configurar a data de início e os saldos de Caixa, Banco e Sistema de cobrança. Nenhuma empresa é ativada automaticamente pela migration. O saldo inicial do sistema inclui valores líquidos que a empresa de cobrança já guarda.

Os fechamentos já confirmados na ativação são marcados como históricos. Não são importados nem passam a movimentar contas ao serem reabertos; os saldos iniciais devem refletir seus movimentos. Fechamentos anteriores à data de início também não movimentam o financeiro. Correções exigem ajustes com justificativa. A data operacional é `gestao_fin_config.inicio`, não `created_at`.

## Fluxos

- `/gestao/financeiro/contas`: contas, saldos, reservas, solicitações, transferências realizadas, aportes, retiradas e ajustes. “Ver extrato” abre a rota de Extratos filtrada pela conta.
- `/gestao/financeiro/extratos`: extrato paginado de 50 linhas, filtro de conta no cabeçalho, histórico por compromisso e estornos. Acesso exclusivo do Master, como todo o financeiro.
- `/gestao/financeiro/pagar`: descrição, categoria, fornecedor opcional, valor, vencimento e observação. Cadastrar não movimenta saldo. Pagamentos parciais/totais debitam a conta escolhida, inclusive o sistema diretamente, sem entrada fictícia no banco. Cancelar exige ausência de pagamentos ativos e de solicitações pendentes.
- Fechamento: rascunho não movimenta contas. Confirmar envia Dinheiro ao Caixa e Pix, Débito, Crédito e Outros ao Sistema de cobrança, líquidos das taxas. Despesas e pagamentos efetivos da equipe são gerados atomicamente com estoque/equipe. Não cria outra dívida para o saldo da equipe.
- Master define as contas do tipo correto e vincula despesas a compromissos existentes na última etapa. Outros perfis usam o primeiro Caixa/Sistema ativo; despesas/equipe usam Caixa. Não há depósito automático nem prazo presumido de liquidação.
- Despesas no fechamento representam pagamentos já realizados. Se o sistema pagou diretamente, o Master seleciona essa origem. Vincular um compromisso evita duplicá-lo.
- Transferência registra duas partidas atômicas. Aportes/retiradas/ajustes não são vendas. O sistema não pode ficar negativo em nenhuma data do histórico diário nem comprometer saldo reservado. Caixa/banco negativos continuam visíveis para conferência.
- Reabrir/excluir fechamento reverte seus movimentos atomicamente, bloqueando se remover receitas deixa o sistema negativo/reservas descobertas ou se há pagamentos posteriores vinculados. Estornar/cancelar dependências primeiro. O histórico financeiro é preservado após exclusão.
- Operações usam trava por unidade e requisição idempotente. Reversões de transferências atuam no grupo inteiro.

## Solicitações ao sistema

Controle manual: o Vibe Gestão não envia pedidos à empresa de cobrança nem consulta execução externa.

1. **Solicitar repasse**, em Contas e saldos: sistema de origem, banco de destino, valor e observação. **Solicitar ao sistema**, em Contas a pagar: vincula o pedido ao compromisso.
2. Enquanto pendente, reserva o valor no sistema e no compromisso. Não altera saldo contábil nem marca a conta como paga.
3. **Concluir** exige a data de execução, entre solicitação e hoje. Repasse debita sistema e credita banco; pagamento debita apenas sistema e baixa a conta a pagar.
4. **Cancelar** exige justificativa e libera a reserva. O histórico permanece.
5. Estornar pelo Extrato reverte o grupo e marca a solicitação concluída como estornada, sem reabrir o pedido.

Solicitações parciais são permitidas. Se a execução tiver outro valor, cancelar o pedido pendente e registrar os valores efetivos. O sistema é um fundo comum, sem conciliação individual de cada transação da maquininha.

A migração adapta a conta antiga Cartões a receber para Sistema de cobrança e reclassifica Pix/Outros de fechamentos anteriormente atribuídos ao Banco, com auditoria. Estoque, equipe e valores das vendas não mudam. Recebíveis antigos ficam no histórico e não são somados novamente ao saldo.

## Painel

Master vê caixa/bancos, saldo no sistema (com reservas), compromissos vencidos/a vencer em sete dias e equipe pendente. A posição após compromissos soma caixa/bancos/sistema e desconta compromissos próximos e equipe; não é previsão de depósito. Reservas de pagamento já pertencem às contas a pagar, sem desconto duplo. Indicadores atuais independem do filtro de período operacional.

## Verificação

`supabase/tests/gestao_financeiro_contas.sql`: regressão da integração, pagamentos parciais, taxas, reabertura/exclusão, equipe, RLS e fechamento por Administrador. `supabase/tests/gestao_cobranca.sql`: saldo inicial no sistema, Pix/cartões, reservas, limites, pagamento direto, conclusão/cancelamento/estorno, reenvio e saldo histórico. Ambos usam transação com rollback, sem deixar empresas de teste. `scripts/gestao-contas.test.mjs` verifica cálculos em centavos e reservas.

Validação do navegador: página/modal de ativação, navegação do Master, ausência do menu e recusa de URL financeira para Administrador. Nenhum saldo de empresa real foi alterado nesses testes.
