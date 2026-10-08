"use client";

import { startTransition, useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { AlertCircle, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { DialogClose, DialogFooter } from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";


type CancelFormProps = {
  id: string;
  action: (state: { error?: string; success?: string }, data: FormData) => Promise<{ error?: string; success?: string }>;
};

type AbastecimentoCancelValues = {
  motivo_cancelamento: string;
};

export function CancelFrotaForm({ id, action }: CancelFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, actionPending] = useActionState(
    action,
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
        id: `frota-cancel-${id}`,
      });
      router.refresh();
      closeParentDialog(formRef.current);
    }
  }, [id, router, state.success]);

  function submitForm(values: AbastecimentoCancelValues) {
    const formData = new FormData();
    formData.set("id", id);
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
              validate: (value) => value.trim().length >= 8 || "Descreva o motivo com pelo menos 8 caracteres.",
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
                  placeholder="Descreva por que este registro está sendo cancelado..."
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
        <DialogClose render={<Button type="button" variant="outline" disabled={actionPending} />}>Voltar</DialogClose>
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
          {actionPending ? "Cancelando..." : "Confirmar cancelamento"}
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
