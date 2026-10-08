"use client";

import { FormDialogCancel } from "@/components/form-dialog-cancel";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { type FrotaAbastecimento } from "@/lib/frotas-data";
import { completeAbastecimento } from "./actions";

type AbastecimentoCompleteFormProps = {
  abastecimento: FrotaAbastecimento;
};

type AbastecimentoCompleteValues = {
  arla_litros: string;
  arla_valor_litro: string;
  arla_valor_total: string;
  concluido_por: string;
  litros: string;
  numero_nota_fiscal: string;
  quilometragem: string;
  valor_litro: string;
  valor_total: string;
};

export function AbastecimentoCompleteForm({
  abastecimento,
}: AbastecimentoCompleteFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [state, formAction, actionPending] = useActionState(
    completeAbastecimento,
    {}
  );
  const form = useForm<AbastecimentoCompleteValues>({
    defaultValues: {
      arla_litros: "",
      arla_valor_litro: "",
      arla_valor_total: "",
      concluido_por: "",
      litros: "",
      numero_nota_fiscal: "",
      quilometragem: "",
      valor_litro: "",
      valor_total: "",
    },
  });
  const litrosValue = useWatch({
    control: form.control,
    name: "litros",
  });
  const valorLitroValue = useWatch({
    control: form.control,
    name: "valor_litro",
  });
  const arlaLitrosValue = useWatch({
    control: form.control,
    name: "arla_litros",
  });
  const arlaValorLitroValue = useWatch({
    control: form.control,
    name: "arla_valor_litro",
  });

  useEffect(() => {
    if (state.success) {
      toast.success(state.success, {
        id: `abastecimento-complete-${abastecimento.id}`,
      });
      router.refresh();
      closeParentDialog(formRef.current);
    }
  }, [abastecimento.id, router, state.success]);

  useEffect(() => {
    const litros = parseLocaleNumber(litrosValue);
    const valorLitro = parseCurrencyValue(valorLitroValue);

    if (!litros || !valorLitro) {
      return;
    }

    form.setValue("valor_total", formatCurrencyValue(litros * valorLitro), {
      shouldDirty: true,
      shouldValidate: true,
    });
  }, [form, litrosValue, valorLitroValue]);

  useEffect(() => {
    const litros = parseLocaleNumber(arlaLitrosValue);
    const valorLitro = parseCurrencyValue(arlaValorLitroValue);

    if (!litros || !valorLitro) {
      return;
    }

    form.setValue("arla_valor_total", formatCurrencyValue(litros * valorLitro), {
      shouldDirty: true,
      shouldValidate: true,
    });
  }, [arlaLitrosValue, arlaValorLitroValue, form]);

  function submitForm(values: AbastecimentoCompleteValues) {
    const formData = new FormData();
    formData.set("id", abastecimento.id);
    formData.set("quilometragem", values.quilometragem);
    formData.set("litros", values.litros);
    formData.set("valor_litro", values.valor_litro);
    formData.set("valor_total", values.valor_total);
    formData.set("arla_litros", values.arla_litros);
    formData.set("arla_valor_litro", values.arla_valor_litro);
    formData.set("arla_valor_total", values.arla_valor_total);
    formData.set("concluido_por", values.concluido_por);
    formData.set("numero_nota_fiscal", values.numero_nota_fiscal);
    selectedFiles.forEach((file) => {
      formData.append("anexos", file);
    });

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
            <TextField
              className="sm:col-span-6"
              control={form.control}
              disabled={actionPending}
              label="Funcionário do posto"
              name="concluido_por"
              rules={{ required: "Informe quem concluiu no posto." }}
            />
            <TextField
              className="sm:col-span-6"
              control={form.control}
              disabled={actionPending}
              label="Número da nota fiscal"
              name="numero_nota_fiscal"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-12">
            <TextField
              className="sm:col-span-3"
              control={form.control}
              disabled={actionPending}
              inputMode="numeric"
              label="Quilometragem"
              name="quilometragem"
              rules={{ required: "Informe a quilometragem." }}
              transform={(value) => value.replace(/\D/g, "").slice(0, 7)}
            />
            <TextField
              className="sm:col-span-3"
              control={form.control}
              disabled={actionPending}
              inputMode="numeric"
              label="Litros"
              name="litros"
              placeholder="0,000"
              rules={{ required: "Informe os litros." }}
              transform={formatDecimalInput}
            />
            <TextField
              className="sm:col-span-3"
              control={form.control}
              disabled={actionPending}
              inputMode="numeric"
              label="Valor por litro"
              name="valor_litro"
              placeholder="R$ 0,00"
              rules={{ required: "Informe o valor por litro." }}
              transform={formatCurrencyInput}
            />
            <TextField
              className="sm:col-span-3"
              control={form.control}
              disabled={actionPending}
              inputMode="numeric"
              label="Valor total"
              name="valor_total"
              placeholder="R$ 0,00"
              rules={{ required: "Informe o valor total." }}
              transform={formatCurrencyInput}
            />
          </div>

          {abastecimento.arla_incluso ? (
            <div className="rounded-lg border bg-muted/20 p-3">
              <div className="mb-3 text-sm font-medium">ARLA</div>
              <div className="grid gap-3 sm:grid-cols-12">
                <TextField
                  className="sm:col-span-4"
                  control={form.control}
                  disabled={actionPending}
                  inputMode="numeric"
                  label="Litros de ARLA"
                  name="arla_litros"
                  placeholder="0,000"
                  rules={{ required: "Informe os litros de ARLA." }}
                  transform={formatDecimalInput}
                />
                <TextField
                  className="sm:col-span-4"
                  control={form.control}
                  disabled={actionPending}
                  inputMode="numeric"
                  label="Valor por litro"
                  name="arla_valor_litro"
                  placeholder="R$ 0,00"
                  rules={{ required: "Informe o valor por litro do ARLA." }}
                  transform={formatCurrencyInput}
                />
                <TextField
                  className="sm:col-span-4"
                  control={form.control}
                  disabled={actionPending}
                  inputMode="numeric"
                  label="Valor total"
                  name="arla_valor_total"
                  placeholder="R$ 0,00"
                  rules={{ required: "Informe o valor total do ARLA." }}
                  transform={formatCurrencyInput}
                />
              </div>
            </div>
          ) : null}

          <Field>
            <FieldLabel htmlFor="anexos">Comprovante / nota fiscal</FieldLabel>
            <Input
              id="anexos"
              name="anexos"
              type="file"
              multiple
              accept="application/pdf,image/jpeg,image/png,image/webp"
              disabled={actionPending}
              onChange={(event) =>
                setSelectedFiles(Array.from(event.target.files ?? []))
              }
            />
          </Field>
        </FieldGroup>
      </fieldset>

      <DialogFooter>
        <FormDialogCancel disabled={actionPending} />
        <Button type="submit" className="gap-2" disabled={actionPending}>
          {actionPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <CheckCircle2 className="size-4" />
          )}
          {actionPending ? "Concluindo..." : "Concluir abastecimento"}
        </Button>
      </DialogFooter>
    </form>
  );
}

type TextFieldProps = {
  className?: string;
  control: ReturnType<typeof useForm<AbastecimentoCompleteValues>>["control"];
  disabled?: boolean;
  inputMode?: "numeric";
  label: string;
  name: keyof AbastecimentoCompleteValues;
  placeholder?: string;
  rules?: Parameters<typeof Controller<AbastecimentoCompleteValues>>[0]["rules"];
  transform?: (value: string) => string;
};

function TextField({
  className,
  control,
  disabled,
  inputMode,
  label,
  name,
  placeholder,
  rules,
  transform,
}: TextFieldProps) {
  return (
    <Controller
      control={control}
      name={name}
      rules={rules}
      render={({ field, fieldState }) => (
        <Field className={className} data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={name}>{label}</FieldLabel>
          <Input
            id={name}
            value={String(field.value ?? "")}
            disabled={disabled}
            inputMode={inputMode}
            placeholder={placeholder}
            aria-invalid={fieldState.invalid}
            onChange={(event) =>
              field.onChange(
                transform ? transform(event.target.value) : event.target.value
              )
            }
          />
          <FieldError errors={[fieldState.error]} />
        </Field>
      )}
    />
  );
}

function formatCurrencyInput(value: string) {
  const digits = value.replace(/\D/g, "");

  if (!digits) {
    return "";
  }

  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency",
  }).format(Number(digits) / 100);
}

function formatDecimalInput(value: string) {
  const digits = value.replace(/\D/g, "");

  if (!digits) {
    return "";
  }

  return (Number(digits) / 1000).toLocaleString("pt-BR", {
    maximumFractionDigits: 3,
    minimumFractionDigits: 3,
  });
}

function parseLocaleNumber(value: string) {
  const normalized = value
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".")
    .replace(/[^\d.]/g, "");
  const amount = Number(normalized);

  return Number.isFinite(amount) ? amount : 0;
}

function parseCurrencyValue(value: string) {
  return parseLocaleNumber(value.replace("R$", ""));
}

function formatCurrencyValue(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency",
  }).format(value);
}

function closeParentDialog(formElement: HTMLFormElement | null) {
  const closeButton = formElement
    ?.closest('[data-slot="dialog-content"]')
    ?.querySelector<HTMLElement>('[data-slot="dialog-close"]');

  closeButton?.click();
}
