import { getFinanceiroData } from "@/lib/gestao-contas-data";
import { getEquipeData } from "@/lib/gestao-equipe-data";
import { saldoColaborador } from "@/lib/gestao-equipe";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ClipboardCheck,
  Pencil,
  Wallet,
  TrendingUp,
  ArrowDownRight,
  Users,
  CircleCheck,
  CircleAlert,
} from "lucide-react";
import {
  getGestaoContext,
  getFechamento,
  getProdutos,
} from "@/lib/gestao-data";
import { recebimentoLiquido } from "@/lib/gestao-fechamento";
import { dataBR, dinheiro, quantidade } from "@/lib/gestao-types";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { GestaoShell } from "../../gestao-shell";
import { Panel, Status } from "../../ui";
import { FechamentoForm } from "../fechamento-form";
import { ResumoAcoes } from "../resumo-acoes";
import { ExcluirFechamentoButton } from "../excluir-rascunho-button";

export default async function FechamentoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ editar?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const [{ unidade, gestor, profile }, fechamento] = await Promise.all([
    getGestaoContext(),
    getFechamento(id),
  ]);
  if (!fechamento || !unidade) notFound();
  const financeiro =
    profile.role === "bdl_admin" ? await getFinanceiroData() : undefined;
  const conferido = fechamento.status === "conferido";
  const editar = query.editar === "1" && !conferido;
  const produtos = editar ? await getProdutos() : [];
  const equipeData =
    editar && gestor
      ? await getEquipeData()
      : { colaboradores: [], extrato: [] };
  const equipe = fechamento.equipe ?? [];
  const equipePaga = equipe.reduce(
    (sum, p) => sum + Math.round(Number(p.valor_pago) * 100),
    0,
  );
  const recebido = fechamento.pagamentos.reduce(
    (sum, p) => sum + Math.round(Number(p.valor) * 100),
    0,
  );
  const taxas = fechamento.pagamentos.reduce(
    (sum, p) =>
      sum +
      recebimentoLiquido(Number(p.valor), Number(p.taxa_percentual ?? 0)).taxa,
    0,
  );
  const despesas = fechamento.despesas ?? [];
  const totalDespesas = despesas.reduce(
    (sum, d) => sum + Math.round(Number(d.valor) * 100),
    0,
  );
  const diferenca = Math.round(Number(fechamento.total) * 100) - recebido;
  const identificacao = `${dataBR(fechamento.data)} · ${fechamento.turno} · ${fechamento.origem}`;
  const horario = (value: string) =>
    new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
      timeZone: "America/Sao_Paulo",
    }).format(new Date(value));
  return (
    <GestaoShell
      title={editar ? "Editar rascunho" : "Resumo do fechamento"}
      icon={ClipboardCheck}
      actions={
        <Link
          href={editar ? `/gestao/fechamentos/${id}` : "/gestao/fechamentos"}
          className={buttonVariants({
            variant: "outline",
            className: "h-9 gap-2",
          })}
        >
          <ArrowLeft className="size-4" />
          {editar ? "Voltar ao resumo" : "Voltar"}
        </Link>
      }
    >
      {editar ? (
        <Panel title="Editar rascunho" description={identificacao}>
          <FechamentoForm
            key={id + "-" + fechamento.versao}
            id={id}
            unidadeId={unidade.id}
            financeiro={financeiro}
            produtos={produtos}
            colaboradores={equipeData.colaboradores.map((c) => ({
              ...c,
              saldo: saldoColaborador(equipeData.extrato, c.id),
            }))}
            fechamento={fechamento}
            gestor={gestor}
            master={profile.role === "bdl_admin"}
          />
        </Panel>
      ) : (
        <div className="space-y-4">
          <Panel
            title={dataBR(fechamento.data)}
            description={`${unidade.nome} · ${fechamento.turno} · ${fechamento.origem}`}
            metrics={<Status status={fechamento.status} />}
          >
            <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr]">
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
                <p className="flex items-center gap-2 text-sm font-medium">
                  <Wallet className="size-4" />
                  {gestor
                    ? "Saldo do fechamento"
                    : "Saldo antes dos pagamentos da equipe"}
                </p>
                <p
                  className={`mt-3 text-3xl font-semibold tracking-tight tabular-nums ${recebido - taxas - totalDespesas - equipePaga < 0 ? "text-destructive" : ""}`}
                >
                  {dinheiro(
                    (recebido - taxas - totalDespesas - equipePaga) / 100,
                  )}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {conferido
                    ? "Resultado dos valores registrados neste fechamento."
                    : "Prévia do rascunho · ainda não compõe o saldo da empresa."}
                </p>
                <div
                  className={`mt-5 flex items-start gap-2 border-t pt-3 text-sm ${diferenca !== 0 ? "text-destructive" : "text-muted-foreground"}`}
                >
                  {diferenca === 0 ? (
                    <CircleCheck className="mt-0.5 size-4 shrink-0" />
                  ) : (
                    <CircleAlert className="mt-0.5 size-4 shrink-0" />
                  )}
                  <div>
                    {diferenca === 0
                      ? "Vendas e recebimentos conciliados"
                      : `Diferença a conferir: ${dinheiro(diferenca / 100)}`}
                    {diferenca !== 0 && (
                      <p className="mt-1 text-xs">
                        Vendas menos recebimentos brutos. Revise antes de
                        confirmar.
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <div className="py-1">
                <h3 className="mb-4 text-sm font-semibold">
                  Composição do saldo
                </h3>
                <dl className="space-y-3 text-sm">
                  {[
                    ["Recebimentos brutos", recebido],
                    ["Taxas dos recebimentos", -taxas],
                    ["Despesas", -totalDespesas],
                    ...(gestor ? [["Pagamentos à equipe", -equipePaga]] : []),
                  ].map(([label, value]) => (
                    <div
                      key={String(label)}
                      className="flex justify-between gap-3"
                    >
                      <dt className="text-muted-foreground">{label}</dt>
                      <dd className="font-medium tabular-nums">
                        {dinheiro((Number(value) || 0) / 100)}
                      </dd>
                    </div>
                  ))}
                  <div className="flex justify-between gap-3 border-t pt-3 font-semibold">
                    <dt>
                      {gestor ? "Saldo resultante" : "Subtotal antes da equipe"}
                    </dt>
                    <dd className="tabular-nums">
                      {dinheiro(
                        (recebido - taxas - totalDespesas - equipePaga) / 100,
                      )}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
              <p className="text-xs text-muted-foreground">
                {conferido && fechamento.confirmado_em
                  ? `Confirmado em ${horario(fechamento.confirmado_em)}`
                  : `Criado em ${horario(fechamento.created_at)} · Aguardando confirmação`}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {profile.role === "bdl_admin" && (
                  <ExcluirFechamentoButton
                    unidadeId={unidade.id}
                    id={id}
                    versao={fechamento.versao}
                    identificacao={identificacao}
                    voltarParaLista
                  />
                )}
                {!conferido && (
                  <>
                    <Link
                      href={`/gestao/fechamentos/${id}?editar=1`}
                      className={buttonVariants({ variant: "outline" })}
                    >
                      <Pencil className="size-4" />
                      Editar rascunho
                    </Link>
                  </>
                )}
                {gestor && (
                  <ResumoAcoes
                    key={`${id}-${fechamento.versao}`}
                    id={id}
                    unidadeId={unidade.id}
                    versao={fechamento.versao}
                    conferido={conferido}
                    conciliado={diferenca === 0}
                  />
                )}
              </div>
            </div>
          </Panel>
          <section
            className={`grid gap-3 sm:grid-cols-2 ${gestor ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}
            aria-label="Indicadores do fechamento"
          >
            {[
              {
                label: "Total vendido",
                value: dinheiro(fechamento.total),
                icon: TrendingUp,
                note: `${fechamento.itens.filter((i) => Number(i.quantidade) > 0).length} produtos vendidos · cortesias excluídas`,
              },
              {
                label: "Recebimentos líquidos",
                value: dinheiro((recebido - taxas) / 100),
                icon: Wallet,
                note: "Após as taxas das formas de pagamento",
              },
              {
                label: "Despesas",
                value: dinheiro(totalDespesas / 100),
                icon: ArrowDownRight,
                note: `${despesas.length} despesas registradas`,
              },
              ...(gestor
                ? [
                    {
                      label: "Equipe paga",
                      value: dinheiro(equipePaga / 100),
                      icon: Users,
                      note: `${equipe.filter((c) => c.presente).length} colaboradores presentes`,
                    },
                  ]
                : []),
            ].map(({ label, value, icon: Icon, note }) => (
              <Card key={label} className="py-4">
                <CardContent className="px-4">
                  <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>{label}</span>
                    <Icon className="size-4" />
                  </div>
                  <p className="mt-3 text-xl font-semibold tabular-nums">
                    {value}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">{note}</p>
                </CardContent>
              </Card>
            ))}
          </section>
          <Panel
            title="Recebimentos"
            description="Distribuição por forma de pagamento e origem."
            metrics={
              <span className="text-sm font-semibold tabular-nums">
                Líquido: {dinheiro((recebido - taxas) / 100)}
              </span>
            }
          >
            {fechamento.pagamentos.length ? (
              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Forma de pagamento</TableHead>
                      <TableHead>Maquininha / conta / caixa</TableHead>
                      <TableHead className="text-right">Taxa (%)</TableHead>
                      <TableHead className="text-right">Valor bruto</TableHead>
                      <TableHead className="text-right">
                        Taxa descontada
                      </TableHead>
                      <TableHead className="text-right">
                        Valor líquido
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fechamento.pagamentos.map((p, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{p.forma}</TableCell>
                        <TableCell>{p.origem}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {Number(p.taxa_percentual ?? 0).toLocaleString(
                            "pt-BR",
                            { maximumFractionDigits: 2 },
                          )}
                          %
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {dinheiro(p.valor)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {dinheiro(
                            recebimentoLiquido(
                              Number(p.valor),
                              Number(p.taxa_percentual ?? 0),
                            ).taxa / 100,
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {dinheiro(
                            recebimentoLiquido(
                              Number(p.valor),
                              Number(p.taxa_percentual ?? 0),
                            ).liquido / 100,
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhum recebimento informado.
              </p>
            )}
          </Panel>
          <Panel
            title="Produtos do fechamento"
            description={`${fechamento.itens.length} produtos registrados · cortesias reduzem somente o estoque`}
            metrics={
              <span className="text-sm font-semibold tabular-nums">
                {dinheiro(fechamento.total)}
              </span>
            }
          >
            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Produto</TableHead>
                    <TableHead className="text-right">Vendidos</TableHead>
                    <TableHead className="text-right">Cortesia</TableHead>
                    <TableHead className="text-right">Preço unitário</TableHead>
                    <TableHead className="text-right">Total vendido</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!fechamento.itens.length && (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="h-20 text-center text-muted-foreground"
                      >
                        Nenhum produto registrado neste fechamento.
                      </TableCell>
                    </TableRow>
                  )}
                  {fechamento.itens.map((item) => (
                    <TableRow key={item.produto_id}>
                      <TableCell className="font-medium">{item.nome}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {quantidade(item.quantidade)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {quantidade(item.cortesia ?? 0)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {item.preco_unitario == null
                          ? "—"
                          : dinheiro(item.preco_unitario)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {dinheiro(item.total)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Panel>
          <Panel
            title="Despesas"
            description="Gastos registrados neste fechamento."
          >
            {despesas.length ? (
              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {despesas.map((d, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">
                          {d.descricao}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {dinheiro(d.valor)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhuma despesa registrada.
              </p>
            )}
          </Panel>
          {gestor && (
            <Panel
              title="Equipe do dia"
              description="Presença, valores gerados e pagamentos registrados neste fechamento."
              metrics={
                <span className="text-sm">
                  Total pago: <strong>{dinheiro(equipePaga / 100)}</strong>
                </span>
              }
            >
              {equipe.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Colaborador</TableHead>
                      <TableHead>Presente</TableHead>
                      <TableHead className="text-right">Trabalho</TableHead>
                      <TableHead className="text-right">
                        Saldo anterior
                      </TableHead>
                      <TableHead className="text-right">Pago</TableHead>
                      <TableHead className="text-right">
                        Saldo após este registro
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {equipe.map((c) => (
                      <TableRow key={c.colaborador_id}>
                        <TableCell>{c.nome}</TableCell>
                        <TableCell>{c.presente ? "Sim" : "Não"}</TableCell>
                        <TableCell className="text-right">
                          {dinheiro(c.valor_trabalho)}
                        </TableCell>
                        <TableCell className="text-right">
                          {!conferido || c.saldo_anterior == null
                            ? "—"
                            : dinheiro(c.saldo_anterior)}
                        </TableCell>
                        <TableCell className="text-right">
                          {dinheiro(c.valor_pago)}
                        </TableCell>
                        <TableCell className="text-right">
                          {!conferido || c.saldo_final == null
                            ? "A confirmar"
                            : dinheiro(c.saldo_final)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nenhum lançamento de equipe neste fechamento.
                </p>
              )}
            </Panel>
          )}
          {fechamento.observacoes && (
            <Panel title="Observações">
              <p className="whitespace-pre-wrap break-words text-sm">
                {fechamento.observacoes}
              </p>
            </Panel>
          )}
        </div>
      )}
    </GestaoShell>
  );
}
