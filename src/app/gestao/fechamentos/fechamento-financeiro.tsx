"use client";
import { Controller, useWatch, type UseFormReturn } from "react-hook-form";
import { FormSelect } from "@/components/form-select";
import { Field, FieldLabel } from "@/components/ui/field";
import { type FinanceiroData, pendentePagar } from "@/lib/gestao-contas";
import { dinheiro } from "@/lib/gestao-types";
import type { Campos } from "./fechamento-form";
export function FechamentoFinanceiro({
  form,
  financeiro,
  disabled,
  legado,
}: {
  form: UseFormReturn<Campos>;
  financeiro: FinanceiroData;
  disabled: boolean;
  legado: boolean;
}) {
  const pagamentos = useWatch({ control: form.control, name: "pagamentos" });
  const despesas = useWatch({ control: form.control, name: "despesas" });
  const equipe = useWatch({ control: form.control, name: "equipe" });
  const data = useWatch({ control: form.control, name: "data" });
  if (legado || data < (financeiro.inicio ?? ""))
    return (
      <p className="mb-4 rounded-lg bg-muted p-3 text-sm text-muted-foreground">
        Fechamento histórico: não altera os saldos financeiros. Eventuais
        correções devem ser registradas como ajustes pelo Master.
      </p>
    );
  const disponiveis = financeiro.contas
    .filter((c) => c.ativo)
    .map((c) => ({ value: c.id, label: c.nome }));
  return (
    <div className="mb-5 space-y-3 rounded-lg border p-3">
      <h3 className="text-sm font-semibold">Contas do fechamento</h3>
      {pagamentos.map(
        (p, i) =>
          Number(p.valor) > 0 && (
            <div
              key={i}
              className="grid items-end gap-3 sm:grid-cols-[100px_1fr]"
            >
              <span className="pb-2 text-sm font-medium">{p.forma}</span>
              <Field>
                <FieldLabel>Destino</FieldLabel>
                <Controller
                  name={`pagamentos.${i}.conta_id`}
                  control={form.control}
                  render={({ field }) => (
                    <FormSelect
                      aria-label={`Conta de ${p.forma}`}
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={disabled}
                      options={financeiro.contas
                        .filter(
                          (c) =>
                            c.ativo &&
                            c.tipo ===
                              (p.forma === "Dinheiro" ? "caixa" : "cobranca"),
                        )
                        .map((c) => ({ value: c.id, label: c.nome }))}
                    />
                  )}
                />
              </Field>
            </div>
          ),
      )}
      <p className="text-xs text-muted-foreground">
        Dinheiro entra no caixa. Os demais recebimentos ficam no sistema de
        cobrança, já descontadas as taxas.
      </p>
      {despesas.map((d, i) => (
        <div key={i} className="space-y-2 border-t pt-3">
          <p className="text-sm font-medium">
            {d.descricao || `Despesa ${i + 1}`}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field>
              <FieldLabel>Pagar com</FieldLabel>
              <Controller
                name={`despesas.${i}.conta_id`}
                control={form.control}
                render={({ field }) => (
                  <FormSelect
                    aria-label={`Conta da despesa ${i + 1}`}
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={disabled}
                    options={disponiveis}
                  />
                )}
              />
            </Field>
            <Field>
              <FieldLabel>Vincular compromisso</FieldLabel>
              <Controller
                name={`despesas.${i}.pagar_id`}
                control={form.control}
                render={({ field }) => (
                  <FormSelect
                    aria-label={`Compromisso da despesa ${i + 1}`}
                    value={field.value || "nova"}
                    onValueChange={(v) => field.onChange(v === "nova" ? "" : v)}
                    disabled={disabled}
                    options={[
                      { value: "nova", label: "Nova despesa paga" },
                      ...financeiro.pagar
                        .filter(
                          (p) => pendentePagar(p) > 0 || p.id === field.value,
                        )
                        .map((p) => ({
                          value: p.id,
                          label: `${p.descricao} · ${dinheiro(pendentePagar(p))}`,
                        })),
                    ]}
                  />
                )}
              />
            </Field>
          </div>
        </div>
      ))}
      {equipe.some((c) => c.pagar && Number(c.valor_pago) > 0) && (
        <Field className="border-t pt-3">
          <FieldLabel>Conta para pagamento da equipe</FieldLabel>
          <Controller
            name="equipe_conta_id"
            control={form.control}
            render={({ field }) => (
              <FormSelect
                aria-label="Conta para pagamento da equipe"
                value={field.value}
                onValueChange={field.onChange}
                disabled={disabled}
                options={disponiveis}
              />
            )}
          />
        </Field>
      )}
      <p className="text-xs text-muted-foreground">
        Os lançamentos serão gerados ao confirmar. Vincule contas já cadastradas
        para evitar despesas duplicadas.
      </p>
    </div>
  );
}
