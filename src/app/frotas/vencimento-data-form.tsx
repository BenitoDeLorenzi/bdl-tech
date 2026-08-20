"use client";

import { startTransition, useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { DatePickerInput } from "@/app/licencas/date-picker-input";
import { type FrotaVencimento } from "@/lib/frotas-data";
import { updateVencimentoData } from "./actions";

type VencimentoDataFormProps = {
  vencimento: FrotaVencimento;
};

type VencimentoDataFormValues = {
  data_vencimento: string;
};

export function VencimentoDataForm({ vencimento }: VencimentoDataFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, actionPending] = useActionState(
    updateVencimentoData,
    {}
  );
  const form = useForm<VencimentoDataFormValues>({
    defaultValues: {
      data_vencimento: vencimento.data_vencimento,
    },
  });

  useEffect(() => {
    if (state.success) {
      toast.success(state.success, {
        id: `vencimento-update-${vencimento.id}`,
      });
      router.refresh();
      closeParentDialog(formRef.current);
    }
  }, [router, state.success, vencimento.id]);

  function submitForm(values: VencimentoDataFormValues) {
    const formData = new FormData();
    formData.set("id", vencimento.id);
    formData.set("data_vencimento", values.data_vencimento);

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

      <Controller
        control={form.control}
        name="data_vencimento"
        rules={{ required: "Informe a data do vencimento." }}
        render={({ field, fieldState }) => (
          <DatePickerInput
            id={`data_vencimento_${vencimento.id}`}
            name={field.name}
            label="Data do vencimento"
            value={field.value}
            onValueChange={field.onChange}
            disabled={actionPending}
            error={fieldState.error?.message}
            required
          />
        )}
      />

      <DialogFooter>
        <Button type="submit" className="gap-2" disabled={actionPending}>
          {actionPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <CheckCircle2 className="size-4" />
          )}
          {actionPending ? "Salvando..." : "Salvar vencimento"}
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
