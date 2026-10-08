"use client";

import { FormDialogCancel } from "@/components/form-dialog-cancel";

import { startTransition, useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { mask } from "remask";
import { toast } from "sonner";

import { PrefeituraCombobox } from "@/components/prefeitura-combobox";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { FrotaPrefeituraOption } from "@/lib/frotas-data";
import type { FrotaMotorista } from "@/lib/motoristas-data";
import { createMotorista, updateMotorista } from "./actions";

type MotoristaFormProps = {
  motorista?: FrotaMotorista;
  prefeituras: FrotaPrefeituraOption[];
  selectedPrefeituraId?: string;
  showPrefeituraField?: boolean;
};

type MotoristaFormValues = {
  cpf: string;
  nome: string;
  prefeitura_id: string;
};

export function MotoristaForm({
  motorista,
  prefeituras,
  selectedPrefeituraId,
  showPrefeituraField = true,
}: MotoristaFormProps) {
  const isEditing = Boolean(motorista);
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, actionPending] = useActionState(
    isEditing ? updateMotorista : createMotorista,
    {}
  );
  const form = useForm<MotoristaFormValues>({
    defaultValues: {
      cpf: motorista?.cpf ? formatCpfInput(motorista.cpf) : "",
      nome: motorista?.nome ?? "",
      prefeitura_id: motorista?.prefeitura_id ?? selectedPrefeituraId ?? "",
    },
  });

  useEffect(() => {
    if (state.success) {
      toast.success(state.success, {
        id: isEditing ? "motorista-update-success" : "motorista-create-success",
      });
      router.refresh();
      closeParentDialog(formRef.current);
      if (!isEditing) {
        form.reset({
          cpf: "",
          nome: "",
          prefeitura_id: selectedPrefeituraId ?? "",
        });
      }
    }
  }, [form, isEditing, router, selectedPrefeituraId, state.success]);

  function submitForm(values: MotoristaFormValues) {
    const formData = new FormData();
    if (motorista?.id) {
      formData.set("id", motorista.id);
    }
    formData.set("prefeitura_id", values.prefeitura_id);
    formData.set("nome", values.nome);
    formData.set("cpf", values.cpf);

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
              rules={{ required: "Selecione a empresa." }}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="prefeitura_id">Empresa</FieldLabel>
                  <PrefeituraCombobox
                    id="prefeitura_id"
                    value={field.value || null}
                    onChange={(value) => field.onChange(value ?? "")}
                    prefeituras={prefeituras}
                    disabled={actionPending}
                    invalid={fieldState.invalid}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
          ) : (
            <input type="hidden" {...form.register("prefeitura_id")} />
          )}

          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_11rem]">
          <TextField
            control={form.control}
            label="Nome"
            name="nome"
            rules={{ required: "Informe o nome do motorista." }}
          />

          <TextField
            control={form.control}
            inputMode="numeric"
            label="CPF"
            name="cpf"
            rules={{
              required: "Informe o CPF do motorista.",
              validate: (value) =>
                value.replace(/\D/g, "").length === 11 ||
                "Informe um CPF válido.",
            }}
            transform={formatCpfInput}
          />
          </div>
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
          {actionPending
            ? isEditing
              ? "Salvando..."
              : "Cadastrando..."
            : isEditing
              ? "Salvar alterações"
              : "Cadastrar motorista"}
        </Button>
      </DialogFooter>
    </form>
  );
}

type TextFieldProps = {
  control: ReturnType<typeof useForm<MotoristaFormValues>>["control"];
  inputMode?: "numeric";
  label: string;
  name: keyof MotoristaFormValues;
  rules?: Parameters<typeof Controller<MotoristaFormValues>>[0]["rules"];
  transform?: (value: string) => string;
};

function TextField({
  control,
  inputMode,
  label,
  name,
  rules,
  transform,
}: TextFieldProps) {
  return (
    <Controller
      control={control}
      name={name}
      rules={rules}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={name}>{label}</FieldLabel>
          <Input
            id={name}
            value={field.value}
            inputMode={inputMode}
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

function formatCpfInput(value: string) {
  return mask(value.replace(/\D/g, ""), ["999.999.999-99"]);
}

function closeParentDialog(formElement: HTMLFormElement | null) {
  const closeButton = formElement
    ?.closest('[data-slot="dialog-content"]')
    ?.querySelector<HTMLElement>('[data-slot="dialog-close"]');

  closeButton?.click();
}
