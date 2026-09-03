"use client";

import { startTransition, useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { PrefeituraCombobox } from "@/components/prefeitura-combobox";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { FrotaPrefeituraOption } from "@/lib/frotas-data";
import type { FrotaSecretaria } from "@/lib/secretarias-data";
import { createSecretaria, updateSecretaria } from "./actions";

type SecretariaFormProps = {
  prefeituraId?: string;
  prefeituras: FrotaPrefeituraOption[];
  secretaria?: FrotaSecretaria;
  showPrefeituraField?: boolean;
};

type SecretariaFormValues = {
  nome: string;
  prefeitura_id: string;
};

export function SecretariaForm({
  prefeituraId,
  prefeituras,
  secretaria,
  showPrefeituraField = true,
}: SecretariaFormProps) {
  const isEditing = Boolean(secretaria);
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, actionPending] = useActionState(
    isEditing ? updateSecretaria : createSecretaria,
    {}
  );
  const form = useForm<SecretariaFormValues>({
    defaultValues: {
      nome: secretaria?.nome ?? "",
      prefeitura_id: secretaria?.prefeitura_id ?? prefeituraId ?? "",
    },
  });

  useEffect(() => {
    if (state.success) {
      toast.success(state.success, {
        id: isEditing
          ? "secretaria-update-success"
          : "secretaria-create-success",
      });
      router.refresh();
      closeParentDialog(formRef.current);
      if (!isEditing) {
        form.reset({
          nome: "",
          prefeitura_id: prefeituraId ?? "",
        });
      }
    }
  }, [form, isEditing, prefeituraId, router, state.success]);

  function submitForm(values: SecretariaFormValues) {
    const formData = new FormData();
    if (secretaria?.id) {
      formData.set("id", secretaria.id);
      formData.set("old_nome", secretaria.nome);
    }
    formData.set("prefeitura_id", values.prefeitura_id);
    formData.set("nome", values.nome);

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
          {showPrefeituraField ? (
            <Controller
              control={form.control}
              name="prefeitura_id"
              rules={{ required: "Selecione a prefeitura." }}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="prefeitura_id">Prefeitura</FieldLabel>
                  <PrefeituraCombobox
                    id="prefeitura_id"
                    value={field.value || null}
                    onChange={(value) => field.onChange(value ?? "")}
                    prefeituras={prefeituras}
                    disabled={actionPending || isEditing}
                    invalid={fieldState.invalid}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
          ) : (
            <input type="hidden" {...form.register("prefeitura_id")} />
          )}

          <Controller
            control={form.control}
            name="nome"
            rules={{ required: "Informe o nome da secretaria." }}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="nome">Nome</FieldLabel>
                <Input
                  id="nome"
                  value={field.value}
                  disabled={actionPending}
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
        <Button type="submit" className="gap-2" disabled={actionPending}>
          {actionPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <CheckCircle2 className="size-4" />
          )}
          {actionPending
            ? isEditing
              ? "Salvando..."
              : "Cadastrando..."
            : isEditing
              ? "Salvar alterações"
              : "Cadastrar secretaria"}
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
