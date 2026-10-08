"use client";
import { useId, useState, type RefObject } from "react";
import { Controller, useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { FormSelect } from "@/components/form-select";
import { CurrencyInput } from "../currency-input";
import { operarFinanceiro } from "./actions";
import { hojeFinanceiro, type ContaFinanceira } from "@/lib/gestao-contas";
type Props = {
  acao: string;
  label: string;
  contas?: ContaFinanceira[];
  defaults?: Record<string, string>;
  description?: string;
  compact?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  returnFocus?: RefObject<HTMLButtonElement | null>;
};
const positive = (v: string) =>
  /^\d+(\.\d{1,2})?$/.test(v) && Number(v) > 0 && Number(v) < 1e9;
const categorias = [
  "Fornecedores",
  "Aluguel",
  "Energia e água",
  "Internet e telefone",
  "Manutenção",
  "Serviços",
  "Impostos",
  "Outras despesas",
];
export function FinanceiroForm({
  acao,
  label,
  contas = [],
  defaults = {},
  description,
  compact,
  open: controlledOpen,
  onOpenChange,
  returnFocus,
}: Props) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [pending, setPending] = useState(false);
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!pending) setOpen(value);
      }}
    >
      {controlledOpen === undefined && (
        <DialogTrigger
          render={
            <Button
              variant={compact ? "outline" : "default"}
              size={compact ? "sm" : "default"}
            />
          }
        >
          {label}
        </DialogTrigger>
      )}
      <DialogContent
        finalFocus={returnFocus}
        className="max-h-[90dvh] overflow-y-auto sm:max-w-lg"
      >
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
          <DialogDescription>
            {description ?? "Confira os dados antes de registrar."}
          </DialogDescription>
        </DialogHeader>
        {open && (
          <FormBody
            acao={acao}
            contas={contas}
            defaults={defaults}
            onPending={setPending}
            done={() => setOpen(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
function FormBody({
  acao,
  contas,
  defaults,
  done,
  onPending,
}: {
  acao: string;
  contas: ContaFinanceira[];
  defaults: Record<string, string>;
  done: () => void;
  onPending: (pending: boolean) => void;
}) {
  const router = useRouter();
  const uid = useId();
  const [request] = useState(() => crypto.randomUUID());
  const form = useForm<Record<string, string>>({
    defaultValues: {
      data: hojeFinanceiro(),
      vencimento: hojeFinanceiro(),
      tipo: "banco",
      categoria: "Outras despesas",
      caixa: "0",
      banco: "0",
      sistema: "0",
      ...defaults,
    },
  });
  const { errors, isSubmitting } = form.formState;
  function input(name: string, label: string, type = "text", required = true) {
    return (
      <Field data-invalid={!!errors[name]}>
        <FieldLabel htmlFor={uid + name}>{label}</FieldLabel>
        <Input
          id={uid + name}
          type={type}
          aria-invalid={!!errors[name]}
          disabled={isSubmitting}
          {...form.register(name, {
            required: required ? "Preencha este campo." : false,
            maxLength: {
              value: name === "observacoes" ? 1000 : 200,
              message: "Texto muito longo.",
            },
            validate: (v) =>
              !required ||
              type === "date" ||
              v?.trim().length >= 2 ||
              "Preencha este campo.",
          })}
        />
        <FieldError errors={[errors[name]]} />
      </Field>
    );
  }
  function money(name: string, label: string, zero = false) {
    return (
      <Field data-invalid={!!errors[name]}>
        <FieldLabel htmlFor={uid + name}>{label}</FieldLabel>
        <Controller
          control={form.control}
          name={name}
          rules={{
            validate: (v) =>
              (zero && /^0(?:\.0{1,2})?$/.test(v)) ||
              positive(v) ||
              "Informe um valor válido em reais.",
          }}
          render={({ field }) => (
            <CurrencyInput
              id={uid + name}
              value={field.value ?? ""}
              onValueChange={field.onChange}
              onBlur={field.onBlur}
              ref={field.ref}
              disabled={isSubmitting}
              aria-invalid={!!errors[name]}
            />
          )}
        />
        <FieldError errors={[errors[name]]} />
      </Field>
    );
  }
  function select(
    name: string,
    label: string,
    options: { value: string; label: string }[],
  ) {
    return (
      <Field data-invalid={!!errors[name]}>
        <FieldLabel htmlFor={uid + name}>{label}</FieldLabel>
        <Controller
          name={name}
          control={form.control}
          rules={{ required: "Selecione uma opção." }}
          render={({ field }) => (
            <FormSelect
              id={uid + name}
              options={options}
              value={field.value ?? ""}
              onValueChange={field.onChange}
              onBlur={field.onBlur}
              ref={field.ref}
              disabled={isSubmitting}
              aria-invalid={!!errors[name]}
            />
          )}
        />
        <FieldError errors={[errors[name]]} />
      </Field>
    );
  }
  const available = contas
    .filter((c) => c.ativo)
    .map((c) => ({ value: c.id, label: c.nome }));
  const movement = [
    "pagar",
    "transferir",
    "aporte",
    "retirada",
    "ajuste_entrada",
    "ajuste_saida",
  ].includes(acao);
  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={form.handleSubmit(async (values) => {
        onPending(true);
        try {
          const result = await operarFinanceiro(acao, {
            ...values,
            requisicao: request,
          });
          if (result.error) {
            form.setError("root", { message: result.error });
            return;
          }
          toast.success(result.success);
          router.refresh();
          done();
        } catch {
          form.setError("root", {
            message: "Não foi possível registrar. Tente novamente.",
          });
        } finally {
          onPending(false);
        }
      })}
    >
      {acao === "ativar" && (
        <>
          <p className="text-sm text-muted-foreground">
            Informe os saldos disponíveis antes dos próximos fechamentos. Os
            fechamentos já confirmados ficam no histórico e devem estar
            incluídos nesses saldos. Informe também o valor líquido que já está
            retido no sistema de cobrança.
          </p>
          {input("data", "Data de início", "date")}
          <div className="grid grid-cols-2 gap-3">
            {money("caixa", "Saldo inicial do caixa", true)}
            {money("banco", "Saldo inicial do banco", true)}
          </div>
          {money("sistema", "Saldo inicial no sistema de cobrança", true)}
        </>
      )}
      {acao === "conta" && (
        <>
          {input("descricao", "Nome da conta")}
          {select("tipo", "Tipo", [
            { value: "caixa", label: "Caixa" },
            { value: "banco", label: "Banco" },
            { value: "cobranca", label: "Sistema de cobrança" },
          ])}
          <p className="text-xs text-muted-foreground">
            A conta começa com saldo zero. Use um aporte ou ajuste para
            registrar valores existentes.
          </p>
        </>
      )}
      {acao === "pagar_cadastrar" && (
        <>
          {input("descricao", "Descrição")}
          <div className="grid gap-3 sm:grid-cols-2">
            {select(
              "categoria",
              "Categoria",
              categorias.map((v) => ({ value: v, label: v })),
            )}
            {input("fornecedor", "Fornecedor (opcional)", "text", false)}
            {money("valor", "Valor")}
            {input("vencimento", "Vencimento", "date")}
          </div>
          {input("observacoes", "Observação (opcional)", "text", false)}
        </>
      )}
      {movement && (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            {input("data", "Data da movimentação", "date")}
            {money("valor", "Valor")}
          </div>
          {select(
            "conta_id",
            ["aporte", "ajuste_entrada"].includes(acao)
              ? "Conta de destino"
              : "Conta de origem",
            available,
          )}
          {acao === "transferir" &&
            select("destino_id", "Conta de destino", available)}
          {["aporte", "retirada", "ajuste_entrada", "ajuste_saida"].includes(
            acao,
          ) && input("descricao", "Justificativa")}
        </>
      )}
      {["solicitar_repasse", "solicitar_pagamento"].includes(acao) && (
        <>
          {select(
            "conta_id",
            "Sistema de cobrança",
            contas
              .filter((c) => c.ativo && c.tipo === "cobranca")
              .map((c) => ({ value: c.id, label: c.nome })),
          )}
          {acao === "solicitar_repasse" &&
            select(
              "destino_id",
              "Banco de destino",
              contas
                .filter((c) => c.ativo && c.tipo === "banco")
                .map((c) => ({ value: c.id, label: c.nome })),
            )}
          {money("valor", "Valor solicitado")}
          {input("observacoes", "Observação (opcional)", "text", false)}
          <p className="text-xs text-muted-foreground">
            O valor ficará reservado até a conclusão ou o cancelamento. Registre
            aqui o pedido feito à empresa; o Vibe Gestão não envia solicitações
            externas.
          </p>
        </>
      )}
      {acao === "concluir_solicitacao" &&
        input("data", "Data em que foi executado", "date")}
      {["cancelar", "estornar", "cancelar_solicitacao"].includes(acao) &&
        input("descricao", "Justificativa")}
      <FieldError errors={[errors.root]} />
      <div className="flex justify-end gap-2">
        <Button variant="outline" disabled={isSubmitting} onClick={done}>
          Voltar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Registrando…" : "Confirmar"}
        </Button>
      </div>
    </form>
  );
}
