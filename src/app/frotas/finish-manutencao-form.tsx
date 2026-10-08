"use client";

import { FormDialogCancel } from "@/components/form-dialog-cancel";

import { startTransition, useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { DatePickerInput } from "@/app/licencas/date-picker-input";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { type FrotaManutencao } from "@/lib/frotas-data";
import { finishManutencao } from "./actions";

type FinishManutencaoFormProps = {
  manutencao: FrotaManutencao;
};

type FinishManutencaoValues = {
  data_saida: string;
  observacoes: string;
  valor: string;
};

export function FinishManutencaoForm({
  manutencao,
}: FinishManutencaoFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, actionPending] = useActionState(
    finishManutencao,
    {}
  );
  const today = new Date().toISOString().slice(0, 10);
  const form = useForm<FinishManutencaoValues>({
    defaultValues: {
      data_saida: today,
      observacoes: manutencao.observacoes ?? "",
      valor: manutencao.valor ? formatCurrencyValue(manutencao.valor) : "",
    },
  });

  useEffect(() => {
    if (state.success) {
      toast.success(state.success, {
        id: `manutencao-finish-${manutencao.id}`,
      });
      router.refresh();
      closeParentDialog(formRef.current);
    }
  }, [manutencao.id, router, state.success]);

  function submitForm(values: FinishManutencaoValues) {
    const formData = new FormData();
    formData.set("id", manutencao.id);
    formData.set("data_saida", values.data_saida);
    formData.set("observacoes", values.observacoes);
    formData.set("valor", values.valor);

    startTransition(() => {
      formAction(formData);
    });
  }

  return (
    <form
      ref={formRef}
      onSubmit={form.handleSubmit(submitForm)}
      className="space-y-4"
      noValidate
    >
      {state.error ? (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{state.error}</span>
        </div>
      ) : null}

      <fieldset disabled={actionPending} className="space-y-4 disabled:opacity-70">
        <Controller
          control={form.control}
          name="data_saida"
          rules={{ required: "Informe a data de conclusão." }}
          render={({ field, fieldState }) => (
            <DatePickerInput
              id="data_saida"
              name={field.name}
              label="Conclusão"
              value={field.value}
              onValueChange={field.onChange}
              disabled={actionPending}
              error={fieldState.error?.message}
              required
            />
          )}
        />

        <Controller
          control={form.control}
          name="valor"
          render={({ field }) => (
            <Field>
              <FieldLabel htmlFor="valor_conclusao">Valor final</FieldLabel>
              <Input
                id="valor_conclusao"
                value={field.value}
                inputMode="numeric"
                placeholder="R$ 0,00"
                onChange={(event) =>
                  field.onChange(formatCurrencyInput(event.target.value))
                }
              />
            </Field>
          )}
        />

        <Controller
          control={form.control}
          name="observacoes"
          render={({ field }) => (
            <Field>
              <FieldLabel htmlFor="observacoes_conclusao">
                Observações finais
              </FieldLabel>
              <Textarea
                id="observacoes_conclusao"
                value={field.value}
                onChange={field.onChange}
                rows={4}
              />
            </Field>
          )}
        />
      </fieldset>

      <DialogFooter>
        <FormDialogCancel disabled={actionPending} />
        <Button type="submit" className="gap-2" disabled={actionPending}>
          {actionPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <CheckCircle2 className="size-4" />
          )}
          {actionPending ? "Concluindo..." : "Concluir manutenção"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function closeParentDialog(formElement: HTMLFormElement | null) {
  const closeButton = formElement
    ?.closest('[data-slot="dialog-content"]')
    ?.querySelector<HTMLElement>('[data-slot="dialog-close"]');

  closeButton?.click();
}

function formatCurrencyInput(value: string) {
  const digits = value.replace(/\D/g, "");

  if (!digits) {
    return "";
  }

  return formatCurrencyValue(Number(digits) / 100);
}

function formatCurrencyValue(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency",
  }).format(value);
}
