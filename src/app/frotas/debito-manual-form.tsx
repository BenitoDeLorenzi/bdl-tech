"use client";

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
import { createDebitoManual } from "./actions";

type DebitoManualFormProps = {
  veiculoId: string;
};

type DebitoManualFormValues = {
  data_vencimento: string;
  descricao: string;
  tipo: "ipva" | "licenciamento" | "seguro" | "";
  valor: string;
};

const tipoItems = [
  { label: "IPVA", value: "ipva" },
  { label: "Licenciamento", value: "licenciamento" },
  { label: "Seguro", value: "seguro" },
];

export function DebitoManualForm({ veiculoId }: DebitoManualFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, actionPending] = useActionState(
    createDebitoManual,
    {}
  );
  const form = useForm<DebitoManualFormValues>({
    defaultValues: {
      data_vencimento: "",
      descricao: "",
      tipo: "",
      valor: "",
    },
  });

  useEffect(() => {
    if (state.success) {
      toast.success(state.success, { id: "debito-create-success" });
      router.refresh();
      form.reset();
      closeParentDialog(formRef.current);
    }
  }, [form, router, state.success]);

  function submitForm(values: DebitoManualFormValues) {
    const formData = new FormData();

    formData.set("veiculo_id", veiculoId);
    formData.set("tipo", values.tipo);
    formData.set("data_vencimento", values.data_vencimento);
    formData.set("valor", values.valor);
    formData.set("descricao", values.descricao);

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
              name="tipo"
              rules={{ required: "Selecione o tipo de débito." }}
              render={({ field, fieldState }) => (
                <Field className="sm:col-span-5" data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="tipo">Tipo</FieldLabel>
                  <Select
                    items={tipoItems}
                    name={field.name}
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={actionPending}
                    required
                  >
                    <SelectTrigger
                      id="tipo"
                      className="w-full"
                      aria-invalid={fieldState.invalid}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Tipo de débito</SelectLabel>
                        {tipoItems.map((item) => (
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
              name="data_vencimento"
              rules={{ required: "Informe a data limite." }}
              render={({ field, fieldState }) => (
                <div className="sm:col-span-4">
                  <DatePickerInput
                    id="data_vencimento"
                    name={field.name}
                    label="Data limite"
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
              name="valor"
              render={({ field, fieldState }) => (
                <Field className="sm:col-span-3" data-invalid={fieldState.invalid}>
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
            render={({ field }) => (
              <Field>
                <FieldLabel htmlFor="descricao">Descrição</FieldLabel>
                <Textarea
                  id="descricao"
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Informações do boleto, exercício, observações ou origem do lançamento"
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
          {actionPending ? "Cadastrando..." : "Cadastrar débito"}
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

function closeParentDialog(formElement: HTMLFormElement | null) {
  const closeButton = formElement
    ?.closest('[data-slot="dialog-content"]')
    ?.querySelector<HTMLElement>('[data-slot="dialog-close"]');

  closeButton?.click();
}
