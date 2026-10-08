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
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createMultaManual } from "./actions";

type MultaManualFormProps = {
  veiculoId: string;
};

type MultaManualFormValues = {
  data: string;
  descricao: string;
  hora: string;
  local_complemento: string;
  numero_auto: string;
  situacao: string;
  valor: string;
};

export function MultaManualForm({ veiculoId }: MultaManualFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, actionPending] = useActionState(
    createMultaManual,
    {}
  );
  const form = useForm<MultaManualFormValues>({
    defaultValues: {
      data: "",
      descricao: "",
      hora: "",
      local_complemento: "",
      numero_auto: "",
      situacao: "",
      valor: "",
    },
  });

  useEffect(() => {
    if (state.success) {
      toast.success(state.success, { id: "multa-create-success" });
      router.refresh();
      form.reset();
      closeParentDialog(formRef.current);
    }
  }, [form, router, state.success]);

  function submitForm(values: MultaManualFormValues) {
    const formData = new FormData();

    formData.set("veiculo_id", veiculoId);
    formData.set("numero_auto", values.numero_auto);
    formData.set("situacao", values.situacao);
    formData.set("descricao", values.descricao);
    formData.set("data", values.data);
    formData.set("hora", values.hora);
    formData.set("local_complemento", values.local_complemento);
    formData.set("valor", values.valor);

    startTransition(() => {
      formAction(formData);
    });
  }

  return (
    <form
      ref={formRef}
      className="space-y-4"
      onSubmit={form.handleSubmit(submitForm)}
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
              name="numero_auto"
              rules={{ required: "Informe o número do auto." }}
              render={({ field, fieldState }) => (
                <Field className="sm:col-span-4" data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="numero_auto">Número do auto</FieldLabel>
                  <Input
                    id="numero_auto"
                    value={field.value}
                    onChange={(event) =>
                      field.onChange(event.target.value.toUpperCase())
                    }
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="data"
              rules={{ required: "Informe a data da infração." }}
              render={({ field, fieldState }) => (
                <div className="sm:col-span-4">
                  <DatePickerInput
                    id="data"
                    name={field.name}
                    label="Data"
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={actionPending}
                    error={fieldState.error?.message}
                    required
                  />
                </div>
              )}
            />

            <Controller
              control={form.control}
              name="hora"
              render={({ field, fieldState }) => (
                <Field className="sm:col-span-4" data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="hora">Hora</FieldLabel>
                  <Input
                    id="hora"
                    value={field.value}
                    placeholder="12:09"
                    maxLength={5}
                    onChange={(event) =>
                      field.onChange(formatTimeInput(event.target.value))
                    }
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-12">
            <Controller
              control={form.control}
              name="situacao"
              render={({ field, fieldState }) => (
                <Field className="sm:col-span-8" data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="situacao">Situação</FieldLabel>
                  <Input
                    id="situacao"
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Penalidade notificada"
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="valor"
              render={({ field, fieldState }) => (
                <Field className="sm:col-span-4" data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="valor">Valor</FieldLabel>
                  <Input
                    id="valor"
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
          </div>

          <Controller
            control={form.control}
            name="descricao"
            rules={{ required: "Informe a descrição da infração." }}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="descricao">Descrição</FieldLabel>
                <Textarea
                  id="descricao"
                  value={field.value}
                  onChange={(event) =>
                    field.onChange(event.target.value.toUpperCase())
                  }
                  placeholder="TRANSITAR EM VEL SUPERIOR À MÁXIMA PERMITIDA EM ATÉ 20%"
                  rows={3}
                  aria-invalid={fieldState.invalid}
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />

          <Controller
            control={form.control}
            name="local_complemento"
            render={({ field }) => (
              <Field>
                <FieldLabel htmlFor="local_complemento">Local</FieldLabel>
                <Input
                  id="local_complemento"
                  value={field.value}
                  onChange={(event) =>
                    field.onChange(event.target.value.toUpperCase())
                  }
                  placeholder="BR-101 KM 353.510 - CIDADE/SC"
                />
              </Field>
            )}
          />
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
          {actionPending ? "Cadastrando..." : "Cadastrar multa"}
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

  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency",
  }).format(Number(digits) / 100);
}

function formatTimeInput(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 4);

  return digits.replace(/(\d{2})(\d)/, "$1:$2");
}

function closeParentDialog(formElement: HTMLFormElement | null) {
  const closeButton = formElement
    ?.closest('[data-slot="dialog-content"]')
    ?.querySelector<HTMLElement>('[data-slot="dialog-close"]');

  closeButton?.click();
}
