"use client";

import { startTransition, useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { mask } from "remask";
import { toast } from "sonner";

import { DatePickerInput } from "@/app/licencas/date-picker-input";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { type FrotaVencimento } from "@/lib/frotas-data";
import { registrarPagamentoVencimento } from "./actions";

type VencimentoPagamentoFormProps = {
  vencimento: FrotaVencimento;
};

type PaymentFormValues = {
  data_pagamento: string;
  forma_pagamento: "cota_unica" | "parcelado";
  observacoes: string;
  parcelas_pagas: string;
  quantidade_parcelas: string;
  valor_total: string;
};

const paymentMethodItems = [
  { label: "Cota única", value: "cota_unica" },
  { label: "Parcelado", value: "parcelado" },
];

export function VencimentoPagamentoForm({
  vencimento,
}: VencimentoPagamentoFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, actionPending] = useActionState(
    registrarPagamentoVencimento,
    {}
  );
  const today = new Date().toISOString().slice(0, 10);
  const form = useForm<PaymentFormValues>({
    defaultValues: {
      data_pagamento: today,
      forma_pagamento: "cota_unica",
      observacoes: "",
      parcelas_pagas: "1",
      quantidade_parcelas: "1",
      valor_total: "",
    },
  });
  const paymentMethod = useWatch({
    control: form.control,
    name: "forma_pagamento",
  });
  const installments =
    Number(
      useWatch({
        control: form.control,
        name: "quantidade_parcelas",
      })
    ) || 1;
  const onlySinglePayment = vencimento.tipo !== "ipva";

  useEffect(() => {
    if (paymentMethod === "cota_unica" || onlySinglePayment) {
      form.setValue("forma_pagamento", "cota_unica");
      form.setValue("quantidade_parcelas", "1");
      form.setValue("parcelas_pagas", "1");
    }
  }, [form, onlySinglePayment, paymentMethod]);

  useEffect(() => {
    if (state.success) {
      toast.success(state.success, {
        id: `vencimento-pagamento-${vencimento.id}`,
      });
      router.refresh();
      closeParentDialog(formRef.current);
    }
  }, [router, state.success, vencimento.id]);

  function submitForm(values: PaymentFormValues) {
    const formData = new FormData();

    formData.set("id", vencimento.id);
    formData.set("data_pagamento", values.data_pagamento);
    formData.set("forma_pagamento", values.forma_pagamento);
    formData.set("observacoes", values.observacoes);
    formData.set("parcelas_pagas", values.parcelas_pagas);
    formData.set("quantidade_parcelas", values.quantidade_parcelas);
    formData.set("valor_total", values.valor_total);

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

      <fieldset disabled={actionPending} className="disabled:opacity-70">
        <FieldGroup className="gap-4">
          <div className="grid gap-3 sm:grid-cols-12">
            <Controller
              control={form.control}
              name="valor_total"
              rules={{ required: "Informe o valor total." }}
              render={({ field, fieldState }) => (
                <Field
                  className="sm:col-span-6"
                  data-invalid={fieldState.invalid}
                >
                  <FieldLabel htmlFor="valor_total">Valor total</FieldLabel>
                  <Input
                    id="valor_total"
                    value={field.value}
                    placeholder="R$ 0,00"
                    aria-invalid={fieldState.invalid}
                    onChange={(event) =>
                      field.onChange(formatCurrencyInput(event.target.value))
                    }
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="data_pagamento"
              rules={{ required: "Informe a data do pagamento." }}
              render={({ field, fieldState }) => (
                <div className="sm:col-span-6">
                  <DatePickerInput
                    id="data_pagamento"
                    name={field.name}
                    label="Data do pagamento"
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={actionPending || onlySinglePayment}
                    error={fieldState.error?.message}
                    required
                  />
                </div>
              )}
            />

            <Controller
              control={form.control}
              name="forma_pagamento"
              rules={{ required: "Selecione a forma de pagamento." }}
              render={({ field, fieldState }) => (
                <Field
                  className="sm:col-span-4"
                  data-invalid={fieldState.invalid}
                >
                  <FieldLabel htmlFor="forma_pagamento">
                    Forma de pagamento
                  </FieldLabel>
                  <Select
                    items={paymentMethodItems}
                    name={field.name}
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={actionPending}
                    required
                  >
                    <SelectTrigger
                      id="forma_pagamento"
                      className="w-full"
                      aria-invalid={fieldState.invalid}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Pagamento</SelectLabel>
                        {paymentMethodItems.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="quantidade_parcelas"
              rules={{
                max: { value: 12, message: "Use no máximo 12 parcelas." },
                min: { value: 1, message: "Informe ao menos 1 parcela." },
                required: "Informe a quantidade de parcelas.",
              }}
              render={({ field, fieldState }) => (
                <Field
                  className="sm:col-span-4"
                  data-invalid={fieldState.invalid}
                >
                  <FieldLabel htmlFor="quantidade_parcelas">
                    Parcelas
                  </FieldLabel>
                  <Input
                    id="quantidade_parcelas"
                    type="number"
                    min={1}
                    max={12}
                    value={field.value}
                    disabled={
                      actionPending ||
                      paymentMethod === "cota_unica" ||
                      onlySinglePayment
                    }
                    aria-invalid={fieldState.invalid}
                    onChange={(event) => {
                      const value = clampNumber(event.target.value, 1, 12);
                      field.onChange(value);
                      form.setValue(
                        "parcelas_pagas",
                        clampNumber(form.getValues("parcelas_pagas"), 1, Number(value))
                      );
                    }}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="parcelas_pagas"
              rules={{
                min: { value: 1, message: "Informe ao menos 1 parcela paga." },
                required: "Informe quantas parcelas foram pagas.",
              }}
              render={({ field, fieldState }) => (
                <Field
                  className="sm:col-span-4"
                  data-invalid={fieldState.invalid}
                >
                  <FieldLabel htmlFor="parcelas_pagas">
                    Parcelas pagas
                  </FieldLabel>
                  <Input
                    id="parcelas_pagas"
                    type="number"
                    min={1}
                    max={installments}
                    value={field.value}
                    disabled={actionPending || onlySinglePayment}
                    aria-invalid={fieldState.invalid}
                    onChange={(event) =>
                      field.onChange(
                        clampNumber(event.target.value, 1, installments)
                      )
                    }
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
          </div>

          <Controller
            control={form.control}
            name="observacoes"
            render={({ field }) => (
              <Field>
                <FieldLabel htmlFor="observacoes">Observações</FieldLabel>
                <Textarea
                  id="observacoes"
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Comprovante, banco, autenticação ou observações internas"
                  rows={3}
                />
              </Field>
            )}
          />
        </FieldGroup>
      </fieldset>

      <DialogFooter>
        <Button type="submit" className="gap-2" disabled={actionPending}>
          {actionPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <CheckCircle2 className="size-4" />
          )}
          {actionPending ? "Registrando..." : "Registrar pagamento"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function formatCurrencyInput(value: string) {
  const digits = value.replace(/\D/g, "");

  if (!digits) {
    return "";
  }

  const numericValue = Number(digits) / 100;

  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency",
  }).format(numericValue);
}

function clampNumber(value: string, min: number, max: number) {
  const digits = mask(value, "99").replace(/\D/g, "");
  const number = Number(digits || min);
  const clamped = Math.min(Math.max(number, min), max);

  return String(clamped);
}

function closeParentDialog(formElement: HTMLFormElement | null) {
  const closeButton = formElement
    ?.closest('[data-slot="dialog-content"]')
    ?.querySelector<HTMLElement>('[data-slot="dialog-close"]');

  closeButton?.click();
}
