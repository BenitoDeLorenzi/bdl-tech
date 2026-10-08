"use client";

import { FormDialogCancel } from "@/components/form-dialog-cancel";

import { startTransition, useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from "@/components/ui/combobox";
import { formatCpf, type MotoristaOption } from "@/lib/uso-veiculos-data";
import { VeiculoCombobox } from "@/components/veiculo-combobox";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { FrotaVeiculo } from "@/lib/frotas-data";
import { createUsoVeiculo } from "./actions";

type UsoVeiculoFormProps = {
  veiculos: FrotaVeiculo[];
  motoristas: MotoristaOption[];
};

type UsoVeiculoFormValues = {
  destino: string;
  finalidade: string;
  funcionario_cpf: string;
  funcionario_nome: string;
  km_saida: string;
  observacoes_saida: string;
  veiculo_id: string | null;
};

export function UsoVeiculoForm({ veiculos, motoristas }: UsoVeiculoFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, actionPending] = useActionState(
    createUsoVeiculo,
    {}
  );
  const form = useForm<UsoVeiculoFormValues>({
    defaultValues: {
      destino: "",
      finalidade: "",
      funcionario_cpf: "",
      funcionario_nome: "",
      km_saida: "",
      observacoes_saida: "",
      veiculo_id: null,
    },
  });
  const motoristaCpf = useWatch({ control: form.control, name: "funcionario_cpf" });
  const selectedVehicleId = useWatch({
    control: form.control,
    name: "veiculo_id",
  });
  const selectedVehicle = veiculos.find(
    (veiculo) => veiculo.id === selectedVehicleId
  );

  useEffect(() => {
    if (state.success) {
      toast.success(state.success, {
        id: "uso-veiculo-create-success",
      });
      router.refresh();
      closeParentDialog(formRef.current);
      form.reset({
        destino: "",
        finalidade: "",
        funcionario_cpf: "",
        funcionario_nome: "",
        km_saida: "",
        observacoes_saida: "",
        veiculo_id: null,
      });
    }
  }, [form, router, state.success]);

  function submitForm(values: UsoVeiculoFormValues) {
    const formData = new FormData();
    formData.set("veiculo_id", values.veiculo_id ?? "");
    formData.set("funcionario_nome", values.funcionario_nome);
    formData.set("funcionario_cpf", values.funcionario_cpf);
    formData.set("km_saida", values.km_saida);
    formData.set("destino", values.destino);
    formData.set("finalidade", values.finalidade);
    formData.set("observacoes_saida", values.observacoes_saida);

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
            <Controller
              control={form.control}
              name="veiculo_id"
              rules={{ required: "Selecione o veículo." }}
              render={({ field, fieldState }) => (
                <Field className="sm:col-span-8" data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="veiculo_id">Veículo</FieldLabel>
                  <VeiculoCombobox
                    id="veiculo_id"
                    invalid={fieldState.invalid}
                    onChange={(value) => {
                      const veiculo = veiculos.find((item) => item.id === value);
                      field.onChange(value);
                      form.setValue(
                        "km_saida",
                        veiculo?.quilometragem
                          ? String(veiculo.quilometragem)
                          : ""
                      );
                    }}
                    value={field.value}
                    veiculos={veiculos.filter(
                      (veiculo) => veiculo.status !== "inactive"
                    )}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />

            <TextField
              className="sm:col-span-4"
              control={form.control}
              disabled={actionPending}
              inputMode="numeric"
              label="Quilometragem"
              name="km_saida"
              placeholder="0"
              rules={{ required: "Informe a quilometragem." }}
              transform={formatNumberInput}
            />
          </div>

          {selectedVehicle ? (
            <div className="grid gap-2 rounded-lg border bg-muted/25 p-3 text-sm sm:grid-cols-2">
              <CompactInfo label="Placa" value={selectedVehicle.placa} />
              <CompactInfo
                label="Km atual"
                value={
                  selectedVehicle.quilometragem
                    ? `${formatNumber(selectedVehicle.quilometragem)} km`
                    : "-"
                }
              />
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-12">
            <Controller
              control={form.control}
              name="funcionario_nome"
              rules={{ required: "Informe o motorista." }}
              render={({ field, fieldState }) => (
                <Field className="sm:col-span-7" data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="funcionario_nome">Motorista</FieldLabel>
                  <Combobox
                    items={motoristas}
                    value={motoristas.find((item) => item.nome === field.value && (item.cpf ?? "").replace(/\D/g, "") === motoristaCpf.replace(/\D/g, "")) ?? null}
                    inputValue={field.value}
                    onInputValueChange={(value, details) => {
                      if (details.reason === "input-change") {
                        field.onChange(value);
                        form.setValue("funcionario_cpf", "");
                      }
                    }}
                    onValueChange={(motorista: MotoristaOption | null) => {
                      if (motorista) {
                        field.onChange(motorista.nome);
                        form.setValue("funcionario_cpf", formatCpfInput(motorista.cpf ?? ""), { shouldValidate: true });
                      }
                    }}
                    itemToStringLabel={(motorista: MotoristaOption) => motorista.nome}
                    filter={(motorista: MotoristaOption, query: string) => {
                      const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
                      return normalize(motorista.nome).includes(normalize(query)) || Boolean(query.replace(/\D/g, "") && motorista.cpf?.replace(/\D/g, "").includes(query.replace(/\D/g, "")));
                    }}
                    disabled={actionPending}
                  >
                    <ComboboxInput id="funcionario_nome" ref={field.ref} onBlur={field.onBlur} aria-invalid={fieldState.invalid} placeholder="Pesquise por nome ou CPF, ou digite um novo nome" />
                    <ComboboxContent>
                      <ComboboxEmpty>Nenhum motorista encontrado. Informe o nome e o CPF para cadastrar.</ComboboxEmpty>
                      <ComboboxList>
                        {(motorista: MotoristaOption) => (
                          <ComboboxItem key={motorista.id} value={motorista}>
                            <div className="flex flex-col gap-0.5">
                              <span>{motorista.nome}</span>
                              <span className="text-xs text-muted-foreground">{formatCpf(motorista.cpf)}</span>
                            </div>
                          </ComboboxItem>
                        )}
                      </ComboboxList>
                    </ComboboxContent>
                  </Combobox>
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
            <TextField
              className="sm:col-span-5"
              control={form.control}
              disabled={actionPending}
              inputMode="numeric"
              label="CPF"
              name="funcionario_cpf"
              placeholder="000.000.000-00"
              rules={{ validate: (value) => !value || String(value).replace(/\D/g, "").length === 11 || "Informe um CPF com 11 dígitos." }}
              transform={formatCpfInput}
            />
          </div>

          <p className="text-xs text-muted-foreground">Um novo motorista será cadastrado ao registrar a retirada com nome e CPF.</p>

          <div className="grid gap-3 sm:grid-cols-12">
            <TextField
              className="sm:col-span-6"
              control={form.control}
              disabled={actionPending}
              label="Destino"
              name="destino"
              placeholder="Ex. Filial ou endereço de destino"
            />
            <TextField
              className="sm:col-span-6"
              control={form.control}
              disabled={actionPending}
              label="Finalidade"
              name="finalidade"
              placeholder="Ex. Atendimento externo"
            />
          </div>

          <Controller
            control={form.control}
            name="observacoes_saida"
            render={({ field }) => (
              <Field>
                <FieldLabel htmlFor="observacoes_saida">Observações</FieldLabel>
                <Textarea
                  id="observacoes_saida"
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
        <FormDialogCancel disabled={actionPending} />
        <Button type="submit" className="gap-2" disabled={actionPending}>
          {actionPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <CheckCircle2 className="size-4" />
          )}
          {actionPending ? "Registrando..." : "Registrar retirada"}
        </Button>
      </DialogFooter>
    </form>
  );
}

type TextFieldProps = {
  className?: string;
  control: ReturnType<typeof useForm<UsoVeiculoFormValues>>["control"];
  disabled?: boolean;
  inputMode?: "numeric";
  label: string;
  name: keyof UsoVeiculoFormValues;
  placeholder?: string;
  rules?: Parameters<typeof Controller<UsoVeiculoFormValues>>[0]["rules"];
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

function CompactInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-background px-2.5 py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="truncate font-medium">{value}</div>
    </div>
  );
}

function formatCpfInput(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);

  return digits
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
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
