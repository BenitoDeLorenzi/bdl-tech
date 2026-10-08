"use client";
import type { FinanceiroData } from "@/lib/gestao-contas";
import { FechamentoFinanceiro } from "./fechamento-financeiro";
import type { ColaboradorSaldo } from "@/lib/gestao-equipe";
import { FechamentoEquipe } from "./fechamento-equipe";
import { useState, useTransition, useId } from "react";
import {
  Controller,
  useFieldArray,
  useForm,
  useWatch,
  type FieldPath,
} from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  CheckCheck,
  Save,
  RotateCcw,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { FormSelect } from "@/components/form-select";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { dinheiro, type Fechamento, type Produto } from "@/lib/gestao-types";
import { excluirFechamento, operarGestao } from "../actions";
import { CurrencyInput } from "../currency-input";
import {
  produtosDoFechamento,
  recebimentosIniciais,
  recebimentoLiquido,
} from "@/lib/gestao-fechamento";
import { entryCostTotal } from "@/lib/gestao-money";
import { Status, inputClass } from "../ui";

export type Campos = {
  equipe_conta_id: string;
  equipe: {
    colaborador_id: string;
    presente: boolean;
    pagar: boolean;
    valor_trabalho: string;
    valor_pago: string;
  }[];
  data: string;
  turno: string;
  origem: string;
  observacoes: string;
  itens: {
    produto_id: string;
    quantidade: string;
    cortesia: string;
    preco_unitario: string;
    total: string;
  }[];
  pagamentos: {
    conta_id: string;
    forma: string;
    origem: string;
    valor: string;
    taxa_percentual: string;
  }[];
  despesas: {
    descricao: string;
    valor: string;
    conta_id: string;
    pagar_id: string;
  }[];
};
const cents = (v: string) => Math.round(Number(v || 0) * 100);
const valorValido = (v: string) =>
  /^\d+(\.\d{1,2})?$/.test(v) && Number(v) < 1e9;
const turnos = [
  { value: "dia completo", label: "Dia Completo" },
  { value: "manhã", label: "Manhã" },
  { value: "tarde", label: "Tarde" },
  { value: "noite", label: "Noite" },
];
const origens = [
  { value: "sistema de vendas", label: "Sistema de vendas" },
  { value: "relatório das maquininhas", label: "Relatório das maquininhas" },
  { value: "planilha", label: "Planilha" },
  { value: "outro", label: "Outro" },
];
function incluirValorAnterior(
  options: { value: string; label: string }[],
  value?: string,
) {
  return value && !options.some((option) => option.value === value)
    ? [...options, { value, label: value }]
    : options;
}
export function FechamentoForm({
  id,
  unidadeId,
  produtos,
  colaboradores = [],
  fechamento,
  gestor,
  master = false,
  taxasPadrao = {},
  financeiro,
}: {
  id: string;
  unidadeId: string;
  produtos: Produto[];
  colaboradores?: ColaboradorSaldo[];
  fechamento?: Fechamento;
  gestor: boolean;
  master?: boolean;
  taxasPadrao?: Record<string, number>;
  financeiro?: FinanceiroData;
}) {
  const router = useRouter();
  const fieldId = useId();
  const ultimaEtapa = gestor ? 5 : 4;
  const [etapa, setEtapa] = useState(fechamento ? ultimaEtapa : 0);
  const [visitada, setVisitada] = useState(fechamento ? ultimaEtapa : 0);
  const etapas = [
    "Identificação",
    "Produtos",
    "Recebimentos",
    "Despesas",
    ...(gestor ? ["Equipe do dia"] : []),
    "Observações",
  ];
  const catalogo = produtosDoFechamento(produtos, fechamento);
  const categorias = [...new Set(catalogo.map((p) => p.categoria))];
  const [categoriaFiltro, setCategoriaFiltro] = useState("todos");
  const [nomeFiltro, setNomeFiltro] = useState("");
  const normalizar = (v: string) =>
    v
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("pt-BR");
  const visivel = (p: (typeof catalogo)[number]) =>
    (categoriaFiltro === "todos" || p.categoria === categoriaFiltro) &&
    normalizar(p.nome).includes(normalizar(nomeFiltro.trim()));
  function limparFiltros() {
    setCategoriaFiltro("todos");
    setNomeFiltro("");
  }
  const [pending, startTransition] = useTransition();
  const [reabrindo, setReabrindo] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [excluirError, setExcluirError] = useState("");
  const [motivo, setMotivo] = useState("");
  const [reabrirError, setReabrirError] = useState("");
  const locked = fechamento?.status === "conferido";
  const form = useForm<Campos>({
    mode: "onSubmit",
    reValidateMode: "onSubmit",
    shouldFocusError: false,
    defaultValues: {
      equipe_conta_id:
        fechamento?.financeiro?.equipe_conta_id ??
        financeiro?.contas.find((c) => c.tipo === "caixa")?.id ??
        "",
      equipe: colaboradores.map((c) => {
        const salvo = fechamento?.equipe?.find(
          (i) => i.colaborador_id === c.id,
        );
        return {
          colaborador_id: c.id,
          presente: salvo?.presente ?? false,
          pagar: Number(salvo?.valor_pago ?? 0) > 0,
          valor_trabalho: String(
            salvo?.presente ? salvo.valor_trabalho : c.valor,
          ),
          valor_pago: salvo?.valor_pago ? String(salvo.valor_pago) : "",
        };
      }),
      data:
        fechamento?.data ??
        new Intl.DateTimeFormat("en-CA", {
          timeZone: "America/Sao_Paulo",
        }).format(new Date()),
      turno: fechamento?.turno ?? "dia completo",
      origem: fechamento?.origem ?? "sistema de vendas",
      observacoes: fechamento?.observacoes ?? "",
      itens: catalogo.map((p) => {
        const salvo = fechamento?.itens.find((i) => i.produto_id === p.id);
        return {
          produto_id: p.id,
          quantidade: salvo ? String(salvo.quantidade) : "",
          cortesia: salvo?.cortesia ? String(salvo.cortesia) : "",
          preco_unitario: salvo
            ? String(
                salvo.preco_unitario ??
                  (Number(salvo.quantidade) > 0
                    ? (Number(salvo.total) / Number(salvo.quantidade)).toFixed(
                        2,
                      )
                    : p.preco == null
                      ? ""
                      : String(p.preco)),
              )
            : p.preco == null
              ? ""
              : String(p.preco),
          total: salvo ? String(salvo.total) : "",
        };
      }),
      pagamentos: recebimentosIniciais(fechamento, taxasPadrao).map((p) => {
        const index =
          fechamento?.pagamentos.findIndex((item) => item.forma === p.forma) ??
          -1;
        const meta = fechamento?.financeiro?.recebimentos?.[index];
        const contasDestino =
          financeiro?.contas.filter(
            (c) =>
              c.ativo &&
              c.tipo === (p.forma === "Dinheiro" ? "caixa" : "cobranca"),
          ) ?? [];
        return {
          ...p,
          conta_id:
            contasDestino.find((c) => c.id === meta?.conta_id)?.id ??
            contasDestino[0]?.id ??
            "",
        };
      }),
      despesas: (fechamento?.despesas ?? []).map((d, index) => ({
        conta_id:
          fechamento?.financeiro?.despesas?.[index]?.conta_id ??
          financeiro?.contas.find((c) => c.tipo === "caixa")?.id ??
          "",
        pagar_id: fechamento?.financeiro?.despesas?.[index]?.pagar_id ?? "",
        descricao: d.descricao,
        valor: String(d.valor),
      })),
    },
  });
  const despesasArray = useFieldArray({
    control: form.control,
    name: "despesas",
  });
  const equipe = useWatch({ control: form.control, name: "equipe" });
  const totalEquipe = equipe.reduce(
    (sum, c) => sum + (c.pagar ? cents(c.valor_pago) : 0),
    0,
  );
  const despesas = useWatch({ control: form.control, name: "despesas" });
  const itens = useWatch({ control: form.control, name: "itens" });
  const pagamentos = useWatch({ control: form.control, name: "pagamentos" });
  const { errors, isSubmitting, isDirty } = form.formState;
  const busy = pending || isSubmitting;
  const total = itens.reduce(
    (s, i) => s + (Number(i.quantidade) > 0 ? cents(i.total) : 0),
    0,
  );
  const taxas = pagamentos.reduce(
    (s, p) =>
      s +
      recebimentoLiquido(
        Number(p.valor || 0),
        Number(p.taxa_percentual.replace(",", ".") || 0),
      ).taxa,
    0,
  );
  const totalDespesas = despesas.reduce((s, d) => s + cents(d.valor), 0);
  const recebido = pagamentos.reduce((s, p) => s + cents(p.valor), 0);
  const diferenca = total - recebido;
  const disabled = locked || busy;
  function revalidarErro(name: FieldPath<Campos>) {
    if (form.getFieldState(name).error) void form.trigger(name);
  }
  function alterarCampo(name: FieldPath<Campos>, value: string) {
    form.setValue(name, value, {
      shouldDirty: true,
      shouldValidate: Boolean(form.getFieldState(name).error),
    });
  }
  function recalcular(index: number, qtd: string, preco: string) {
    const calculado = entryCostTotal(qtd, preco);
    form.setValue(
      `itens.${index}.total`,
      calculado === null ? "" : calculado.toFixed(2),
      {
        shouldDirty: true,
        shouldValidate: Boolean(
          form.getFieldState(`itens.${index}.total`).error,
        ),
      },
    );
  }
  function validarProdutos() {
    const selecionados = form
      .getValues("itens")
      .filter((i) => Number(i.quantidade) > 0 || Number(i.cortesia) > 0);
    if (selecionados.length > 500) {
      form.setError("root.produtos", {
        message: "Informe no máximo 500 produtos.",
      });
      return false;
    }
    form.clearErrors("root.produtos");
    return true;
  }
  async function salvar(values: Campos) {
    form.clearErrors("root");
    if (!validarProdutos()) {
      setEtapa(1);
      return;
    }
    if (
      !values.itens.some(
        (i) => Number(i.quantidade) > 0 || Number(i.cortesia) > 0,
      ) &&
      !values.despesas.length &&
      !values.equipe.some((c) => c.presente || c.pagar) &&
      !fechamento?.equipe?.length
    ) {
      form.setError("root", {
        message:
          "Informe produtos vendidos, despesas ou lançamentos da equipe.",
      });
      return;
    }
    try {
      const result = await operarGestao("salvar", {
        id,
        unidade_id: unidadeId,
        versao: fechamento?.versao ?? 0,
        data: values.data,
        turno: values.turno.trim(),
        origem: values.origem.trim(),
        observacoes: values.observacoes,
        itens: values.itens
          .filter((i) => Number(i.quantidade) > 0 || Number(i.cortesia) > 0)
          .map((i) => ({
            produto_id: i.produto_id,
            quantidade: Number(i.quantidade),
            cortesia: Number(i.cortesia),
            preco_unitario:
              Number(i.quantidade) > 0 ? Number(i.preco_unitario) : null,
            total: Number(i.quantidade) > 0 ? Number(i.total) : 0,
          })),
        pagamentos: values.pagamentos
          .filter((p) => Number(p.valor) > 0)
          .map((p) => ({
            forma: p.forma,
            origem: p.origem.trim(),
            valor: Number(p.valor),
            taxa_percentual: Number(p.taxa_percentual.replace(",", ".") || 0),
          })),
        ...(gestor
          ? {
              equipe: values.equipe
                .filter((c) => c.presente || c.pagar)
                .map((c) => ({
                  colaborador_id: c.colaborador_id,
                  presente: c.presente,
                  valor_trabalho: c.presente ? Number(c.valor_trabalho) : 0,
                  valor_pago: c.pagar ? Number(c.valor_pago) : 0,
                })),
            }
          : {}),
        ...(master && financeiro?.inicio
          ? {
              financeiro: {
                equipe_conta_id: values.equipe_conta_id,
                recebimentos: values.pagamentos
                  .filter((p) => Number(p.valor) > 0)
                  .map((p) => ({
                    conta_id: p.conta_id,
                  })),
                despesas: values.despesas.map((d) => ({
                  conta_id: d.conta_id,
                  pagar_id: d.pagar_id,
                })),
              },
            }
          : {}),
        despesas: values.despesas.map((d) => ({
          descricao: d.descricao.trim(),
          valor: Number(d.valor),
        })),
      });
      if (result.error) {
        form.setError("root", { message: result.error });
        return;
      }
      toast.success("Rascunho salvo.");
      form.reset(values);
      router.replace("/gestao/fechamentos/" + id);
      router.refresh();
    } catch {
      form.setError("root", {
        message: "Não foi possível salvar. Seus dados continuam na tela.",
      });
    }
  }
  function executar(acao: "confirmar" | "reabrir") {
    form.clearErrors("root");
    setReabrirError("");
    startTransition(async () => {
      try {
        const result = await operarGestao(acao, {
          id,
          unidade_id: unidadeId,
          versao: fechamento?.versao,
          motivo,
        });
        if (result.error) {
          if (acao === "reabrir") setReabrirError(result.error);
          else form.setError("root", { message: result.error });
          return;
        }
        setReabrindo(false);
        toast.success(
          acao === "confirmar"
            ? "Fechamento confirmado."
            : "Fechamento reaberto.",
        );
        router.refresh();
      } catch {
        const message =
          "Não foi possível concluir. Atualize a página para conferir o estado do fechamento.";
        if (acao === "reabrir") setReabrirError(message);
        else form.setError("root", { message });
      }
    });
  }
  async function avancar() {
    const valid =
      locked ||
      (etapa === 0
        ? await form.trigger(["data", "turno", "origem"])
        : etapa === 1
          ? await form.trigger("itens")
          : etapa === 2
            ? await form.trigger("pagamentos")
            : etapa === 3
              ? await form.trigger("despesas")
              : await form.trigger("equipe"));
    if (etapa === 1 && !valid) limparFiltros();
    if (etapa === 1 && !validarProdutos()) return;
    if (!valid) return;
    setEtapa(etapa + 1);
    setVisitada(Math.max(visitada, etapa + 1));
  }
  function excluir() {
    if (!fechamento) return;
    setExcluirError("");
    startTransition(async () => {
      try {
        const result = await excluirFechamento(
          unidadeId,
          id,
          fechamento.versao,
        );
        if (result.error) {
          setExcluirError(result.error);
          return;
        }
        setExcluindo(false);
        toast.success("Rascunho excluído.");
        router.replace("/gestao/fechamentos");
        router.refresh();
      } catch {
        setExcluirError(
          "Não foi possível excluir. Atualize a página e tente novamente.",
        );
      }
    });
  }
  return (
    <div className="space-y-4">
      <form
        noValidate
        onSubmit={(event) => {
          if (etapa < ultimaEtapa) {
            event.preventDefault();
            void avancar();
            return;
          }
          void form.handleSubmit(salvar, (e) => {
            if (e.data || e.turno || e.origem) setEtapa(0);
            else if (e.itens) {
              setEtapa(1);
              limparFiltros();
            } else if (e.pagamentos) setEtapa(2);
            else if (e.despesas) setEtapa(3);
            else if (e.equipe) setEtapa(4);
            else if (e.observacoes) setEtapa(ultimaEtapa);
          })(event);
        }}
        className="space-y-4"
      >
        {fechamento && <Status status={fechamento.status} />}
        <nav aria-label="Etapas do fechamento">
          <ol
            className={`grid ${gestor ? "grid-cols-6" : "grid-cols-5"} gap-1 border-b pb-4`}
          >
            {etapas.map((label, index) => (
              <li key={label}>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-auto w-full flex-col gap-1.5 px-1 py-1 text-xs"
                  aria-current={etapa === index ? "step" : undefined}
                  disabled={busy || index > visitada}
                  onClick={() => setEtapa(index)}
                >
                  <span
                    className={
                      "flex size-7 items-center justify-center rounded-full border text-xs " +
                      (etapa === index
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-muted-foreground")
                    }
                  >
                    {index + 1}
                  </span>
                  <span
                    className={
                      etapa === index ? "font-medium" : "text-muted-foreground"
                    }
                  >
                    {label}
                  </span>
                </Button>
              </li>
            ))}
          </ol>
        </nav>
        <section hidden={etapa !== 0} aria-label="Identificação">
          <fieldset
            disabled={disabled}
            className="grid gap-3 sm:grid-cols-[1fr_1fr_1.4fr]"
          >
            <Field data-invalid={Boolean(errors.data)}>
              <FieldLabel htmlFor={fieldId + "data"}>Data</FieldLabel>
              <Input
                id={fieldId + "data"}
                type="date"
                aria-invalid={Boolean(errors.data)}
                {...form.register("data", {
                  onChange: () => revalidarErro("data"),
                  validate: (v) =>
                    /^\d{4}-\d{2}-\d{2}$/.test(v) || "Informe a data.",
                })}
              />
              <FieldError errors={[errors.data]} />
            </Field>
            <Field data-invalid={Boolean(errors.turno)}>
              <FieldLabel htmlFor={fieldId + "turno"}>Turno</FieldLabel>
              <Controller
                control={form.control}
                name="turno"
                rules={{ required: "Selecione o turno." }}
                render={({ field }) => (
                  <FormSelect
                    id={fieldId + "turno"}
                    name={field.name}
                    value={field.value}
                    onValueChange={(value) => alterarCampo(field.name, value)}
                    onBlur={field.onBlur}
                    ref={field.ref}
                    aria-invalid={Boolean(errors.turno)}
                    disabled={disabled}
                    groupLabel="Turnos"
                    placeholder="Selecione o turno"
                    options={incluirValorAnterior(turnos, fechamento?.turno)}
                  />
                )}
              />
              <FieldError errors={[errors.turno]} />
            </Field>
            <Field data-invalid={Boolean(errors.origem)}>
              <FieldLabel htmlFor={fieldId + "origem"}>
                Origem do relatório
              </FieldLabel>
              <Controller
                control={form.control}
                name="origem"
                rules={{ required: "Selecione a origem do relatório." }}
                render={({ field }) => (
                  <FormSelect
                    id={fieldId + "origem"}
                    name={field.name}
                    value={field.value}
                    onValueChange={(value) => alterarCampo(field.name, value)}
                    onBlur={field.onBlur}
                    ref={field.ref}
                    aria-invalid={Boolean(errors.origem)}
                    disabled={disabled}
                    groupLabel="Origens do relatório"
                    placeholder="Selecione a origem"
                    options={incluirValorAnterior(origens, fechamento?.origem)}
                  />
                )}
              />
              <FieldError errors={[errors.origem]} />
            </Field>
          </fieldset>
        </section>
        <section hidden={etapa !== 1} aria-label="Produtos vendidos">
          <fieldset disabled={disabled} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-[240px_minmax(0,1fr)]">
              <Field>
                <FieldLabel htmlFor={fieldId + "categoriaFiltro"}>
                  Categoria
                </FieldLabel>
                <FormSelect
                  id={fieldId + "categoriaFiltro"}
                  value={categoriaFiltro}
                  onValueChange={setCategoriaFiltro}
                  groupLabel="Categorias"
                  options={[
                    { value: "todos", label: "Todas as categorias" },
                    ...categorias.map((c) => ({ value: c, label: c })),
                  ]}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={fieldId + "nomeFiltro"}>
                  Produto
                </FieldLabel>
                <Input
                  id={fieldId + "nomeFiltro"}
                  placeholder="Buscar pelo nome do produto"
                  value={nomeFiltro}
                  onChange={(event) => setNomeFiltro(event.target.value)}
                />
              </Field>
            </div>
            <div className="rounded-lg border [&>[data-slot=table-container]]:h-[clamp(220px,calc(100dvh-370px),520px)] [&>[data-slot=table-container]]:overflow-auto">
              <Table className="min-w-[740px] table-fixed">
                <TableHeader className="sticky top-0 z-10 bg-background">
                  <TableRow>
                    <TableHead className="px-3">Produto</TableHead>
                    <TableHead className="w-[105px] px-3">Vendidos</TableHead>
                    <TableHead className="w-[105px] px-3">Cortesia</TableHead>
                    <TableHead className="w-[145px] px-3">
                      Preço unitário
                    </TableHead>
                    <TableHead className="w-[145px] px-3">
                      Total vendido
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {catalogo.map((produto, index) => {
                    const err = errors.itens?.[index];
                    const vendido = () =>
                      Number(form.getValues(`itens.${index}.quantidade`)) > 0;
                    return (
                      <TableRow
                        key={produto.id}
                        hidden={!visivel(produto)}
                        className="[&>td]:px-3 [&>td]:py-2"
                      >
                        <TableCell className="font-medium whitespace-normal">
                          {produto.nome}{" "}
                          <span className="font-normal text-muted-foreground">
                            ({produto.unidade})
                          </span>
                        </TableCell>
                        <TableCell className="align-top">
                          <Field data-invalid={Boolean(err?.quantidade)}>
                            <Input
                              aria-label={`Quantidade de ${produto.nome}`}
                              aria-invalid={Boolean(err?.quantidade)}
                              type="number"
                              inputMode="decimal"
                              step="0.001"
                              placeholder="0"
                              {...form.register(`itens.${index}.quantidade`, {
                                onChange: (e) => {
                                  revalidarErro(`itens.${index}.quantidade`);
                                  recalcular(
                                    index,
                                    e.target.value,
                                    form.getValues(
                                      `itens.${index}.preco_unitario`,
                                    ),
                                  );
                                  if (
                                    !e.target.value ||
                                    Number(e.target.value) === 0
                                  )
                                    form.clearErrors([
                                      `itens.${index}.preco_unitario`,
                                      `itens.${index}.total`,
                                    ]);
                                  if (errors.root?.produtos) validarProdutos();
                                },
                                validate: (v) =>
                                  !v ||
                                  (/^\d+(\.\d{1,3})?$/.test(v) &&
                                    Number(v) >= 0 &&
                                    Number(v) <= 999999999) ||
                                  "Informe uma quantidade válida.",
                              })}
                            />
                            <FieldError errors={[err?.quantidade]} />
                          </Field>
                        </TableCell>
                        <TableCell className="align-top">
                          <Field data-invalid={Boolean(err?.cortesia)}>
                            <Input
                              aria-label={`Cortesia de ${produto.nome}`}
                              aria-invalid={Boolean(err?.cortesia)}
                              type="number"
                              inputMode="decimal"
                              step="0.001"
                              placeholder="0"
                              {...form.register(`itens.${index}.cortesia`, {
                                onChange: () => {
                                  revalidarErro(`itens.${index}.cortesia`);
                                  if (errors.root?.produtos) validarProdutos();
                                },
                                validate: (v) =>
                                  !v ||
                                  (/^\d+(\.\d{1,3})?$/.test(v) &&
                                    Number(v) >= 0 &&
                                    Number(v) <= 999999999) ||
                                  "Informe uma quantidade válida.",
                              })}
                            />
                            <FieldError errors={[err?.cortesia]} />
                          </Field>
                        </TableCell>
                        <TableCell className="align-top">
                          <Field data-invalid={Boolean(err?.preco_unitario)}>
                            <Controller
                              control={form.control}
                              name={`itens.${index}.preco_unitario`}
                              rules={{
                                validate: (v) =>
                                  !vendido() ||
                                  valorValido(v) ||
                                  "Informe o preço.",
                              }}
                              render={({ field }) => (
                                <CurrencyInput
                                  aria-label={`Preço de ${produto.nome}`}
                                  aria-invalid={Boolean(err?.preco_unitario)}
                                  value={field.value}
                                  onBlur={field.onBlur}
                                  ref={field.ref}
                                  disabled={disabled}
                                  onValueChange={(v) => {
                                    alterarCampo(field.name, v);
                                    recalcular(
                                      index,
                                      form.getValues(
                                        `itens.${index}.quantidade`,
                                      ),
                                      v,
                                    );
                                  }}
                                />
                              )}
                            />
                            <FieldError errors={[err?.preco_unitario]} />
                          </Field>
                        </TableCell>
                        <TableCell className="align-top">
                          <Field data-invalid={Boolean(err?.total)}>
                            <Controller
                              control={form.control}
                              name={`itens.${index}.total`}
                              rules={{
                                validate: (v) =>
                                  !vendido() ||
                                  valorValido(v) ||
                                  "Informe o total.",
                              }}
                              render={({ field }) => (
                                <CurrencyInput
                                  aria-label={`Total de ${produto.nome}`}
                                  aria-invalid={Boolean(err?.total)}
                                  value={field.value}
                                  onBlur={field.onBlur}
                                  ref={field.ref}
                                  disabled={disabled || !vendido()}
                                  onValueChange={(v) =>
                                    alterarCampo(field.name, v)
                                  }
                                />
                              )}
                            />
                            <FieldError errors={[err?.total]} />
                          </Field>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {!catalogo.some(visivel) && (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="h-24 text-center text-muted-foreground"
                      >
                        {catalogo.length
                          ? "Nenhum produto encontrado com esses filtros."
                          : "Nenhum produto cadastrado. Continue para registrar despesas ou equipe."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <FieldError errors={[errors.root?.produtos]} />
            <p className="text-right text-sm">
              Total vendido:{" "}
              <strong className="tabular-nums">{dinheiro(total / 100)}</strong>
            </p>
          </fieldset>
        </section>
        <section
          hidden={etapa !== 2}
          aria-label="Distribuição dos recebimentos"
        >
          <fieldset disabled={disabled} className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Informe os valores brutos. A taxa é descontada automaticamente do
              líquido. Deixe em branco as formas não utilizadas.
            </p>
            <div className="rounded-lg border">
              <Table className="min-w-[540px] table-fixed">
                <TableHeader>
                  <TableRow>
                    <TableHead className="px-3">Forma de pagamento</TableHead>
                    <TableHead className="w-[95px] px-3">Taxa (%)</TableHead>
                    <TableHead className="w-[145px] px-3">
                      Valor bruto
                    </TableHead>
                    <TableHead className="w-[145px] px-3">
                      Valor líquido
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagamentos.map((p, index) => {
                    const err = errors.pagamentos?.[index];
                    const liquido = recebimentoLiquido(
                      Number(p.valor || 0),
                      Number(p.taxa_percentual.replace(",", ".") || 0),
                    );
                    return (
                      <TableRow key={index} className="[&>td]:px-3 [&>td]:py-2">
                        <TableCell className="font-medium whitespace-normal">
                          {p.forma}
                          {pagamentos.filter((outro) => outro.forma === p.forma)
                            .length > 1 && (
                            <span className="ml-1 text-xs font-normal text-muted-foreground">
                              ({p.origem})
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="align-top">
                          <Field data-invalid={Boolean(err?.taxa_percentual)}>
                            <FieldLabel
                              className="sr-only"
                              htmlFor={fieldId + "taxa" + index}
                            >
                              Taxa (%)
                            </FieldLabel>
                            <Input
                              id={fieldId + "taxa" + index}
                              aria-label={`Taxa de ${p.forma} ${index + 1}`}
                              aria-invalid={Boolean(err?.taxa_percentual)}
                              inputMode="decimal"
                              placeholder="0"
                              {...form.register(
                                `pagamentos.${index}.taxa_percentual`,
                                {
                                  onChange: () =>
                                    revalidarErro(
                                      `pagamentos.${index}.taxa_percentual`,
                                    ),
                                  validate: (v) =>
                                    !v ||
                                    (/^\d+([.,]\d{1,2})?$/.test(v) &&
                                      Number(v.replace(",", ".")) <= 100) ||
                                    "Use de 0 a 100%.",
                                },
                              )}
                            />
                            <FieldError errors={[err?.taxa_percentual]} />
                          </Field>
                        </TableCell>
                        <TableCell className="align-top">
                          <Field data-invalid={Boolean(err?.valor)}>
                            <FieldLabel
                              className="sr-only"
                              htmlFor={fieldId + "bruto" + index}
                            >
                              Valor bruto
                            </FieldLabel>
                            <Controller
                              control={form.control}
                              name={`pagamentos.${index}.valor`}
                              rules={{
                                validate: (v) =>
                                  !v ||
                                  valorValido(v) ||
                                  "Informe um valor válido.",
                              }}
                              render={({ field }) => (
                                <CurrencyInput
                                  id={fieldId + "bruto" + index}
                                  aria-label={`Valor bruto de ${p.forma} ${index + 1}`}
                                  aria-invalid={Boolean(err?.valor)}
                                  value={field.value}
                                  ref={field.ref}
                                  onBlur={field.onBlur}
                                  disabled={disabled}
                                  onValueChange={(v) => {
                                    alterarCampo(field.name, v);
                                    revalidarErro(`pagamentos.${index}.origem`);
                                  }}
                                />
                              )}
                            />
                            <FieldError errors={[err?.valor]} />
                          </Field>
                        </TableCell>
                        <TableCell>
                          <Field>
                            <FieldLabel
                              className="sr-only"
                              htmlFor={fieldId + "liquido" + index}
                            >
                              Valor líquido
                            </FieldLabel>
                            <Input
                              id={fieldId + "liquido" + index}
                              aria-label={`Valor líquido de ${p.forma} ${index + 1}`}
                              readOnly
                              value={dinheiro(liquido.liquido / 100)}
                              className="bg-muted/50 tabular-nums"
                            />
                          </Field>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <div className="flex flex-wrap justify-between gap-2 text-sm">
              <span>
                Bruto: <strong>{dinheiro(recebido / 100)}</strong>
              </span>
              <span>
                Taxas: <strong>{dinheiro(taxas / 100)}</strong>
              </span>
              <span>
                Líquido: <strong>{dinheiro((recebido - taxas) / 100)}</strong>
              </span>
            </div>
          </fieldset>
        </section>
        <section hidden={etapa !== 3} aria-label="Despesas do fechamento">
          <fieldset disabled={disabled} className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Registre os gastos deste fechamento, como compras e comissões.
              Esta etapa é opcional.
            </p>
            <div className="max-h-[38vh] space-y-3 overflow-y-auto p-1">
              {despesasArray.fields.map((row, index) => {
                const err = errors.despesas?.[index];
                return (
                  <div
                    key={row.id}
                    className="grid items-start gap-3 sm:grid-cols-[minmax(0,1fr)_160px_32px]"
                  >
                    <Field data-invalid={Boolean(err?.descricao)}>
                      <FieldLabel htmlFor={fieldId + "despesa" + index}>
                        Descrição
                      </FieldLabel>
                      <Input
                        id={fieldId + "despesa" + index}
                        aria-invalid={Boolean(err?.descricao)}
                        placeholder="Ex.: Compra de gelo"
                        {...form.register(`despesas.${index}.descricao`, {
                          onChange: () =>
                            revalidarErro(`despesas.${index}.descricao`),
                          validate: (v) =>
                            (v.trim().length >= 2 && v.trim().length <= 200) ||
                            "Descreva a despesa (2 a 200 caracteres).",
                        })}
                      />
                      <FieldError errors={[err?.descricao]} />
                    </Field>
                    <Field data-invalid={Boolean(err?.valor)}>
                      <FieldLabel htmlFor={fieldId + "despesaValor" + index}>
                        Valor
                      </FieldLabel>
                      <Controller
                        control={form.control}
                        name={`despesas.${index}.valor`}
                        rules={{
                          validate: (v) =>
                            (valorValido(v) && Number(v) > 0) ||
                            "Informe um valor positivo.",
                        }}
                        render={({ field }) => (
                          <CurrencyInput
                            id={fieldId + "despesaValor" + index}
                            aria-label={`Valor da despesa ${index + 1}`}
                            aria-invalid={Boolean(err?.valor)}
                            value={field.value}
                            ref={field.ref}
                            onBlur={field.onBlur}
                            disabled={disabled}
                            onValueChange={(v) => alterarCampo(field.name, v)}
                          />
                        )}
                      />
                      <FieldError errors={[err?.valor]} />
                    </Field>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="sm:mt-6"
                      aria-label={`Remover despesa ${index + 1}`}
                      disabled={disabled}
                      onClick={() => despesasArray.remove(index)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                );
              })}
              {!despesas.length && (
                <p className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
                  Nenhuma despesa adicionada.
                </p>
              )}
            </div>
            <div className="flex items-center justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={disabled || despesas.length >= 100}
                onClick={() =>
                  despesasArray.append({
                    descricao: "",
                    valor: "",
                    conta_id:
                      financeiro?.contas.find((c) => c.tipo === "caixa")?.id ??
                      "",
                    pagar_id: "",
                  })
                }
              >
                <Plus className="size-4" />
                Adicionar despesa
              </Button>
              <span className="text-sm">
                Total: <strong>{dinheiro(totalDespesas / 100)}</strong>
              </span>
            </div>
          </fieldset>
        </section>
        {gestor && (
          <section hidden={etapa !== 4} aria-label="Equipe do dia">
            <FechamentoEquipe
              form={form}
              colaboradores={colaboradores}
              disabled={Boolean(disabled)}
            />
          </section>
        )}
        <section
          hidden={etapa !== ultimaEtapa}
          aria-label="Observações e conferência"
        >
          {master && financeiro?.inicio && (
            <FechamentoFinanceiro
              form={form}
              financeiro={financeiro}
              disabled={Boolean(disabled)}
              legado={Boolean(fechamento?.financeiro_legado)}
            />
          )}
          <div>
            <Field>
              <FieldLabel htmlFor={fieldId + "obs"}>
                Observações (opcional)
              </FieldLabel>
              <textarea
                id={fieldId + "obs"}
                rows={2}
                disabled={disabled}
                className={inputClass + " h-auto py-2"}
                {...form.register("observacoes", {
                  onChange: () => revalidarErro("observacoes"),
                  maxLength: {
                    value: 3000,
                    message: "Use até 3.000 caracteres.",
                  },
                })}
              />
              <FieldError errors={[errors.observacoes]} />
            </Field>
          </div>
        </section>
        <div className="space-y-3 border-t pt-4">
          <div
            className={
              etapa === ultimaEtapa
                ? "grid grid-cols-3 gap-3 text-sm"
                : "hidden"
            }
            aria-live="polite"
          >
            <div>
              <span className="text-xs text-muted-foreground">Vendas</span>
              <strong className="block tabular-nums">
                {dinheiro(total / 100)}
              </strong>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">
                Recebimentos
              </span>
              <strong className="block tabular-nums">
                {dinheiro(recebido / 100)}
              </strong>
            </div>
            <div className={diferenca !== 0 ? "text-destructive" : ""}>
              <span className="text-xs">Diferença</span>
              <strong className="block tabular-nums">
                {dinheiro(diferenca / 100)}
              </strong>
              {diferenca === 0 && (
                <span className="text-xs text-muted-foreground">
                  Valores conferem
                </span>
              )}
            </div>
          </div>
          {etapa === ultimaEtapa && (
            <div
              className={`grid grid-cols-2 ${gestor ? "sm:grid-cols-4" : "sm:grid-cols-3"} gap-3 rounded-lg bg-muted/50 p-3 text-sm`}
            >
              <div>
                <span className="text-xs text-muted-foreground">Taxas</span>
                <strong className="block tabular-nums">
                  {dinheiro(taxas / 100)}
                </strong>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Despesas</span>
                <strong className="block tabular-nums">
                  {dinheiro(totalDespesas / 100)}
                </strong>
              </div>
              {gestor && (
                <div>
                  <span className="text-xs text-muted-foreground">
                    Pago à equipe
                  </span>
                  <strong className="block tabular-nums">
                    {dinheiro(totalEquipe / 100)}
                  </strong>
                </div>
              )}
              <div>
                <span className="text-xs text-muted-foreground">
                  Saldo após descontos
                </span>
                <strong className="block tabular-nums">
                  {dinheiro(
                    (recebido - taxas - totalDespesas - totalEquipe) / 100,
                  )}
                </strong>
              </div>
            </div>
          )}
          <FieldError errors={[errors.root]} />
          <div className="flex flex-wrap items-center gap-2">
            {etapa > 0 && (
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => setEtapa(etapa - 1)}
              >
                <ArrowLeft className="size-4" />
                Voltar
              </Button>
            )}
            <span className="mr-auto text-xs text-muted-foreground">
              Etapa {etapa + 1} de {etapas.length}
            </span>
            {etapa < ultimaEtapa && (
              <Button
                type="button"
                disabled={busy}
                onClick={() => void avancar()}
              >
                Continuar
                <ArrowRight className="size-4" />
              </Button>
            )}
            {!locked && etapa === ultimaEtapa && (
              <>
                {master && fechamento && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    disabled={busy}
                    onClick={() => {
                      setExcluirError("");
                      setExcluindo(true);
                    }}
                  >
                    <Trash2 className="size-4" />
                    Excluir rascunho
                  </Button>
                )}
                <Button type="submit" variant="outline" disabled={busy}>
                  <Save className="size-4" />
                  {busy ? "Processando…" : "Salvar rascunho"}
                </Button>
                {gestor && fechamento && (
                  <Button
                    type="button"
                    disabled={busy || isDirty || diferenca !== 0}
                    onClick={() => executar("confirmar")}
                  >
                    <CheckCheck className="size-4" />
                    Confirmar fechamento
                  </Button>
                )}
              </>
            )}
            {locked && gestor && etapa === ultimaEtapa && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setMotivo("");
                  setReabrirError("");
                  setReabrindo(true);
                }}
              >
                <RotateCcw className="size-4" />
                Reabrir para corrigir
              </Button>
            )}
          </div>
          {!locked && etapa === ultimaEtapa && (
            <p className="text-right text-xs text-muted-foreground">
              {!fechamento || isDirty
                ? "Salve o rascunho para confirmar."
                : !gestor
                  ? "A confirmação deve ser feita pelo gestor."
                  : diferenca !== 0
                    ? "Confira a diferença entre vendas e recebimentos."
                    : "Ao confirmar, as vendas e os lançamentos da equipe serão registrados."}
            </p>
          )}
        </div>
      </form>
      <Dialog
        open={excluindo}
        onOpenChange={(open) => {
          if (!pending) setExcluindo(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir rascunho?</DialogTitle>
            <DialogDescription>
              O rascunho e as alterações não salvas serão descartados. Esta ação
              não pode ser desfeita. Os lançamentos vinculados serão removidos,
              preservando apenas a auditoria da exclusão.
            </DialogDescription>
          </DialogHeader>
          {excluirError && (
            <p role="alert" className="text-sm text-destructive">
              {excluirError}
            </p>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => setExcluindo(false)}
            >
              Cancelar
            </Button>
            <Button variant="destructive" disabled={pending} onClick={excluir}>
              {pending ? "Excluindo…" : "Excluir rascunho"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={reabrindo}
        onOpenChange={(v) => {
          if (!pending) setReabrindo(v);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reabrir fechamento</DialogTitle>
            <DialogDescription>
              As baixas e os lançamentos da equipe serão estornados. Informe o
              motivo da correção.
            </DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor={fieldId + "motivo"}>Justificativa</FieldLabel>
            <Input
              id={fieldId + "motivo"}
              value={motivo}
              disabled={pending}
              onChange={(e) => setMotivo(e.target.value)}
              maxLength={500}
            />
          </Field>
          {reabrirError && (
            <p role="alert" className="text-sm text-destructive">
              {reabrirError}
            </p>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => setReabrindo(false)}
            >
              Cancelar
            </Button>
            <Button
              disabled={pending || motivo.trim().length < 5}
              onClick={() => executar("reabrir")}
            >
              Estornar baixas e reabrir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
