"use client";

import { startTransition, useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { FrotaUsoVeiculo } from "@/lib/uso-veiculos-data";
import { returnUsoVeiculo } from "./actions";

type DevolucaoFormProps = {
  uso: FrotaUsoVeiculo;
};

type DevolucaoFormValues = {
  km_retorno: string;
  observacoes_retorno: string;
};

export function DevolucaoForm({ uso }: DevolucaoFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, actionPending] = useActionState(
    returnUsoVeiculo,
    {}
  );
  const form = useForm<DevolucaoFormValues>({
    defaultValues: {
      km_retorno: formatNumber(uso.km_saida),
      observacoes_retorno: "",
    },
  });

  useEffect(() => {
    if (state.success) {
      toast.success(state.success, {
        id: "uso-veiculo-return-success",
      });
      router.refresh();
      closeParentDialog(formRef.current);
    }
  }, [router, state.success]);

  function submitForm(values: DevolucaoFormValues) {
    const formData = new FormData();
    formData.set("id", uso.id);
    formData.set("km_retorno", values.km_retorno);
    formData.set("observacoes_retorno", values.observacoes_retorno);

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
          <div className="grid gap-2 rounded-lg border bg-muted/25 p-3 text-sm sm:grid-cols-3">
            <CompactInfo label="Veículo" value={`${uso.modelo} · ${uso.placa}`} />
            <CompactInfo label="Funcionário" value={uso.funcionario_nome} />
            <CompactInfo
              label="Km saída"
              value={`${formatNumber(uso.km_saida)} km`}
            />
          </div>

          <Controller
            control={form.control}
            name="km_retorno"
            rules={{ required: "Informe a quilometragem de retorno." }}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="km_retorno">Quilometragem de retorno</FieldLabel>
                <Input
                  id="km_retorno"
                  value={field.value}
                  inputMode="numeric"
                  disabled={actionPending}
                  aria-invalid={fieldState.invalid}
                  onChange={(event) =>
                    field.onChange(formatNumberInput(event.target.value))
                  }
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />

          <Controller
            control={form.control}
            name="observacoes_retorno"
            render={({ field }) => (
              <Field>
                <FieldLabel htmlFor="observacoes_retorno">
                  Observações da devolução
                </FieldLabel>
                <Textarea
                  id="observacoes_retorno"
                  value={field.value}
                  onChange={field.onChange}
                  rows={3}
                  disabled={actionPending}
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
          {actionPending ? "Registrando..." : "Registrar devolução"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function CompactInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-background px-2.5 py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="truncate font-medium">{value}</div>
    </div>
  );
}

function formatNumberInput(value: string) {
  const digits = value.replace(/\D/g, "");

  if (!digits) {
    return "";
  }

  return formatNumber(Number(digits));
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

function closeParentDialog(formElement: HTMLFormElement | null) {
  const closeButton = formElement
    ?.closest('[data-slot="dialog-content"]')
    ?.querySelector<HTMLElement>('[data-slot="dialog-close"]');

  closeButton?.click();
}
