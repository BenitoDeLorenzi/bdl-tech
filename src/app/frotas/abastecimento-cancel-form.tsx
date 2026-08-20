"use client";

import { startTransition, useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { AlertCircle, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { type FrotaAbastecimento } from "@/lib/frotas-data";
import { cancelAbastecimento } from "./actions";

type AbastecimentoCancelFormProps = {
  abastecimento: FrotaAbastecimento;
};

type AbastecimentoCancelValues = {
  motivo_cancelamento: string;
};

export function AbastecimentoCancelForm({
  abastecimento,
}: AbastecimentoCancelFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, actionPending] = useActionState(
    cancelAbastecimento,
    {}
  );
  const form = useForm<AbastecimentoCancelValues>({
    defaultValues: {
      motivo_cancelamento: "",
    },
  });

  useEffect(() => {
    if (state.success) {
      toast.success(state.success, {
        id: `abastecimento-cancel-${abastecimento.id}`,
      });
      router.refresh();
      closeParentDialog(formRef.current);
    }
  }, [abastecimento.id, router, state.success]);

  function submitForm(values: AbastecimentoCancelValues) {
    const formData = new FormData();
    formData.set("id", abastecimento.id);
    formData.set("motivo_cancelamento", values.motivo_cancelamento);

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
        <FieldGroup>
          <Controller
            control={form.control}
            name="motivo_cancelamento"
            rules={{
              minLength: {
                message: "Descreva melhor o motivo do cancelamento.",
                value: 8,
              },
              required: "Informe o motivo do cancelamento.",
            }}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="motivo_cancelamento">
                  Motivo do cancelamento
                </FieldLabel>
                <Textarea
                  id="motivo_cancelamento"
                  className="min-h-28 resize-none"
                  value={field.value}
                  disabled={actionPending}
                  placeholder="Ex.: ordem perdida, veículo não abastecido, posto indisponível..."
                  aria-invalid={fieldState.invalid}
                  onChange={field.onChange}
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
        </FieldGroup>
      </fieldset>

      <DialogFooter>
        <Button
          type="submit"
          variant="destructive"
          className="gap-2"
          disabled={actionPending}
        >
          {actionPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <XCircle className="size-4" />
          )}
          {actionPending ? "Cancelando..." : "Cancelar ordem"}
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
