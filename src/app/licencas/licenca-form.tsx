"use client";

import { startTransition, useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { currency } from "remask";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PrefeituraCombobox } from "@/components/prefeitura-combobox";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type Licenca,
  type LicencaModuloOption,
  type LicencaPrefeituraOption,
} from "@/lib/licencas-data";
import { createLicenca, updateLicenca } from "./actions";
import { DatePickerInput } from "./date-picker-input";

type LicencaFormProps = {
  defaultFim?: string;
  defaultInicio?: string;
  licenca?: Licenca;
  modulos: LicencaModuloOption[];
  prefeituras: LicencaPrefeituraOption[];
};

type LicencaFormValues = {
  fim: string;
  inicio: string;
  modulo_id: string | null;
  prefeitura_id: string | null;
  status: string | null;
  valor_anual: number | null;
};

const statusOptions = [
  { value: "active", label: "Ativa" },
  { value: "suspended", label: "Suspensa" },
  { value: "expired", label: "Vencida" },
  { value: "cancelled", label: "Cancelada" },
];

export function LicencaForm({
  defaultFim,
  defaultInicio,
  licenca,
  modulos,
  prefeituras,
}: LicencaFormProps) {
  const isEditing = Boolean(licenca);
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, actionPending] = useActionState(
    isEditing ? updateLicenca : createLicenca,
    {}
  );
  const form = useForm<LicencaFormValues>({
    defaultValues: {
      fim: licenca?.fim ?? defaultFim ?? "",
      inicio: licenca?.inicio ?? defaultInicio ?? "",
      modulo_id: licenca?.modulo_id ?? null,
      prefeitura_id: licenca?.prefeitura_id ?? null,
      status: licenca?.status ?? "active",
      valor_anual: licenca?.valor_anual ?? null,
    },
  });
  const moduloItems = [
    { label: "Selecione o módulo", value: null },
    ...modulos.map((modulo) => ({
      label: modulo.nome,
      value: modulo.id,
    })),
  ];
  const statusItems = statusOptions.map((option) => ({
    label: option.label,
    value: option.value,
  }));

  useEffect(() => {
    if (state.success) {
      toast.success(state.success, {
        id: isEditing ? "licenca-edit-success" : "licenca-create-success",
      });
      router.refresh();

      if (!isEditing) {
        form.reset({
          fim: defaultFim ?? "",
          inicio: defaultInicio ?? "",
          modulo_id: null,
          prefeitura_id: null,
          status: "active",
          valor_anual: null,
        });
      }

      closeParentDialog(formRef.current);
    }
  }, [defaultFim, defaultInicio, form, isEditing, router, state.success]);

  function submitForm(values: LicencaFormValues) {
    const formData = new FormData();

    if (licenca) {
      formData.set("id", licenca.id);
    }

    formData.set("prefeitura_id", values.prefeitura_id ?? "");
    formData.set("modulo_id", values.modulo_id ?? "");
    formData.set("inicio", values.inicio);
    formData.set("fim", values.fim);
    formData.set("valor_anual", String(values.valor_anual ?? ""));
    formData.set("status", values.status ?? "");

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
      {licenca ? <input type="hidden" name="id" value={licenca.id} /> : null}
      {state.error ? (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{state.error}</span>
        </div>
      ) : null}

      <fieldset disabled={actionPending} className="disabled:opacity-70">
        <FieldGroup className="gap-4">
          <Controller
            control={form.control}
            name="prefeitura_id"
            rules={{ required: "Selecione a prefeitura." }}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="prefeitura_id">Prefeitura</FieldLabel>
                <PrefeituraCombobox
                  id="prefeitura_id"
                  value={field.value}
                  onChange={field.onChange}
                  prefeituras={prefeituras}
                  disabled={actionPending}
                  invalid={fieldState.invalid}
                  placeholder="Pesquisar por prefeitura ou CNPJ"
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />

          <Controller
            control={form.control}
            name="modulo_id"
            rules={{ required: "Selecione o módulo." }}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="modulo_id">Módulo</FieldLabel>
                <Select
                  items={moduloItems}
                  name={field.name}
                  value={field.value}
                  onValueChange={field.onChange}
                  required
                  disabled={actionPending}
                >
                  <SelectTrigger
                    id="modulo_id"
                    className="w-full"
                    aria-invalid={fieldState.invalid}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Módulos</SelectLabel>
                      {moduloItems.map((item) => (
                        <SelectItem
                          key={item.value ?? "empty"}
                          value={item.value}
                        >
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

          <div className="grid gap-3 sm:grid-cols-2">
            <Controller
              control={form.control}
              name="inicio"
              rules={{ required: "Informe a data de início." }}
              render={({ field, fieldState }) => (
                <DatePickerInput
                  id="inicio"
                  name={field.name}
                  label="Início"
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
              name="fim"
              rules={{
                required: "Informe a data final.",
                validate: (value) =>
                  !form.getValues("inicio") ||
                  !value ||
                  value >= form.getValues("inicio") ||
                  "A data final não pode ser menor que a data inicial.",
              }}
              render={({ field, fieldState }) => (
                <DatePickerInput
                  id="fim"
                  name={field.name}
                  label="Fim"
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={actionPending}
                  error={fieldState.error?.message}
                  required
                />
              )}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
            <Controller
              control={form.control}
              name="valor_anual"
              rules={{
                validate: (value) =>
                  value !== null && value > 0
                    ? true
                    : "Informe o valor anual.",
              }}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="valor_anual">Valor anual</FieldLabel>
                  <CurrencyInput
                    id="valor_anual"
                    name={field.name}
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={actionPending}
                    invalid={fieldState.invalid}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="status"
              rules={{ required: "Selecione o status." }}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="status">Status</FieldLabel>
                  <Select
                    items={statusItems}
                    name={field.name}
                    value={field.value}
                    onValueChange={field.onChange}
                    required
                    disabled={actionPending}
                  >
                    <SelectTrigger
                      id="status"
                      className="w-full"
                      aria-invalid={fieldState.invalid}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Status</SelectLabel>
                        {statusItems.map((item) => (
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
          </div>
        </FieldGroup>
      </fieldset>

      <DialogFooter>
        <Button type="submit" className="gap-2" disabled={actionPending}>
          {actionPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <CheckCircle2 className="size-4" />
          )}
          {actionPending
            ? "Salvando..."
            : isEditing
              ? "Salvar alterações"
              : "Cadastrar licença"}
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

type CurrencyInputProps = {
  disabled?: boolean;
  id: string;
  invalid?: boolean;
  name: string;
  onValueChange: (value: number | null) => void;
  value: number | null;
};

function CurrencyInput({
  disabled,
  id,
  invalid,
  name,
  onValueChange,
  value,
}: CurrencyInputProps) {
  const displayValue =
    value !== null
      ? currency.mask({
          locale: "pt-BR",
          currency: "BRL",
          value,
        })
      : "";

  return (
    <>
      <input name={name} type="hidden" value={value ?? ""} />
      <Input
        disabled={disabled}
        id={id}
        inputMode="numeric"
        value={displayValue}
        placeholder="R$ 0,00"
        aria-invalid={invalid}
        onChange={(event) => {
          const digits = event.target.value.replace(/\D/g, "");
          const nextValue = digits ? Number(digits) / 100 : null;

          onValueChange(nextValue);
        }}
      />
    </>
  );
}
