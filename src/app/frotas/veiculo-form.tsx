"use client";

import { startTransition, useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  type FrotaPrefeituraOption,
  type FrotaVeiculo,
  type VeiculoStatus,
} from "@/lib/frotas-data";
import { createVeiculo, updateVeiculo } from "./actions";

type VeiculoFormProps = {
  prefeituras: FrotaPrefeituraOption[];
  selectedPrefeituraId?: string;
  showPrefeituraField?: boolean;
  veiculo?: FrotaVeiculo;
};

type VeiculoFormValues = {
  ano: string;
  marca: string;
  modelo: string;
  observacoes: string;
  placa: string;
  prefeitura_id: string | null;
  prefixo: string;
  quilometragem: string;
  renavam: string;
  secretaria: string;
  status: VeiculoStatus | null;
  tipo: string | null;
  versao: string;
  combustivel: string | null;
};

const statusItems = [
  { label: "Ativo", value: "active" },
  { label: "Em manutenção", value: "maintenance" },
  { label: "Inativo", value: "inactive" },
];

const tipoItems = [
  { label: "Selecione o tipo", value: null },
  { label: "Passeio", value: "Passeio" },
  { label: "Utilitário", value: "Utilitário" },
  { label: "Caminhonete", value: "Caminhonete" },
  { label: "Van", value: "Van" },
  { label: "Ônibus", value: "Ônibus" },
  { label: "Ambulância", value: "Ambulância" },
  { label: "Motocicleta", value: "Motocicleta" },
  { label: "Caminhão", value: "Caminhão" },
  { label: "Máquina pesada", value: "Máquina pesada" },
  { label: "Implemento", value: "Implemento" },
];

const combustivelItems = [
  { label: "Selecione o combustível", value: null },
  { label: "Gasolina", value: "Gasolina" },
  { label: "Etanol", value: "Etanol" },
  { label: "Flex", value: "Flex" },
  { label: "Diesel", value: "Diesel" },
  { label: "GNV", value: "GNV" },
  { label: "Elétrico", value: "Elétrico" },
  { label: "Híbrido", value: "Híbrido" },
];

export function VeiculoForm({
  prefeituras,
  selectedPrefeituraId,
  showPrefeituraField = true,
  veiculo,
}: VeiculoFormProps) {
  const isEditing = Boolean(veiculo);
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, actionPending] = useActionState(
    isEditing ? updateVeiculo : createVeiculo,
    {}
  );
  const form = useForm<VeiculoFormValues>({
    defaultValues: {
      ano: veiculo?.ano ? String(veiculo.ano) : "",
      marca: veiculo?.marca ?? "",
      modelo: veiculo?.modelo ?? "",
      observacoes: veiculo?.observacoes ?? "",
      placa: veiculo?.placa ?? "",
      prefeitura_id: veiculo?.prefeitura_id ?? selectedPrefeituraId ?? null,
      prefixo: veiculo?.prefixo ?? "",
      quilometragem:
        veiculo?.quilometragem !== null && veiculo?.quilometragem !== undefined
          ? String(veiculo.quilometragem)
          : "",
      renavam: veiculo?.renavam ?? "",
      secretaria: veiculo?.secretaria ?? "",
      status: veiculo?.status ?? "active",
      tipo: veiculo?.tipo ?? "",
      versao: veiculo?.versao ?? "",
      combustivel: veiculo?.combustivel ?? null,
    },
  });

  useEffect(() => {
    if (state.success) {
      toast.success(state.success, {
        id: isEditing ? "veiculo-edit-success" : "veiculo-create-success",
      });
      router.refresh();

      if (!isEditing) {
        form.reset({
          ano: "",
          marca: "",
          modelo: "",
          observacoes: "",
          placa: "",
          prefeitura_id: selectedPrefeituraId ?? null,
          prefixo: "",
          quilometragem: "",
          renavam: "",
          secretaria: "",
          status: "active",
          tipo: "",
          versao: "",
          combustivel: null,
        });
      }

      closeParentDialog(formRef.current);
    }
  }, [form, isEditing, router, selectedPrefeituraId, state.success]);

  function submitForm(values: VeiculoFormValues) {
    const formData = new FormData();

    if (veiculo) {
      formData.set("id", veiculo.id);
    }

    formData.set("prefeitura_id", values.prefeitura_id ?? "");
    formData.set("placa", values.placa);
    formData.set("prefixo", values.prefixo);
    formData.set("marca", values.marca);
    formData.set("modelo", values.modelo);
    formData.set("ano", values.ano);
    formData.set("tipo", values.tipo ?? "");
    formData.set("versao", values.versao);
    formData.set("combustivel", values.combustivel ?? "");
    formData.set("quilometragem", values.quilometragem);
    formData.set("secretaria", values.secretaria);
    formData.set("renavam", values.renavam);
    formData.set("status", values.status ?? "");
    formData.set("observacoes", values.observacoes);

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
                    value={field.value}
                    onChange={field.onChange}
                    prefeituras={prefeituras}
                    disabled={actionPending || isEditing}
                    invalid={fieldState.invalid}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
          ) : null}

          <div className="grid gap-3 sm:grid-cols-12">
            <TextField
              className="sm:col-span-3"
              control={form.control}
              disabled={actionPending}
              label="Placa"
              name="placa"
              rules={{
                minLength: {
                  value: 7,
                  message: "Informe uma placa válida.",
                },
                pattern: {
                  value: /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/,
                  message: "Informe uma placa brasileira válida.",
                },
                required: "Informe a placa.",
              }}
              maxLength={7}
              transform={(value) =>
                value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 7)
              }
            />
            <TextField
              className="sm:col-span-4"
              control={form.control}
              disabled={actionPending}
              label="Renavam"
              name="renavam"
              rules={{
                pattern: {
                  value: /^\d{11}$/,
                  message: "Informe o Renavam com 11 dígitos.",
                },
                required: "Informe o Renavam.",
              }}
              maxLength={11}
              transform={(value) => value.replace(/\D/g, "").slice(0, 11)}
            />
            <TextField
              className="sm:col-span-5"
              control={form.control}
              disabled={actionPending}
              label="Prefixo"
              name="prefixo"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-12">
            <TextField
              className="sm:col-span-5"
              control={form.control}
              disabled={actionPending}
              label="Marca"
              name="marca"
              rules={{ required: "Informe a marca." }}
            />
            <TextField
              className="sm:col-span-5"
              control={form.control}
              disabled={actionPending}
              label="Modelo"
              name="modelo"
              rules={{ required: "Informe o modelo." }}
            />
            <TextField
              className="sm:col-span-2"
              control={form.control}
              disabled={actionPending}
              inputMode="numeric"
              label="Ano"
              name="ano"
              rules={{
                pattern: {
                  value: /^\d{4}$/,
                  message: "Informe um ano válido.",
                },
                required: "Informe o ano.",
              }}
              transform={(value) => value.replace(/\D/g, "").slice(0, 4)}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-12">
            <Controller
              control={form.control}
              name="tipo"
              rules={{ required: "Selecione o tipo." }}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid} className="sm:col-span-4">
                  <FieldLabel htmlFor="tipo">Tipo</FieldLabel>
                  <Select
                    items={tipoItems}
                    name={field.name}
                    value={field.value}
                    onValueChange={field.onChange}
                    required
                    disabled={actionPending}
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
                        <SelectLabel>Tipos</SelectLabel>
                        {tipoItems.map((item) => (
                          <SelectItem key={item.value ?? "empty"} value={item.value}>
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
            <TextField
              className="sm:col-span-4"
              control={form.control}
              disabled={actionPending}
              label="Versão"
              name="versao"
            />
            <Controller
              control={form.control}
              name="combustivel"
              rules={{ required: "Selecione o combustível." }}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid} className="sm:col-span-4">
                  <FieldLabel htmlFor="combustivel">Combustível</FieldLabel>
                  <Select
                    items={combustivelItems}
                    name={field.name}
                    value={field.value}
                    onValueChange={field.onChange}
                    required
                    disabled={actionPending}
                  >
                    <SelectTrigger
                      id="combustivel"
                      className="w-full"
                      aria-invalid={fieldState.invalid}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Combustíveis</SelectLabel>
                        {combustivelItems.map((item) => (
                          <SelectItem key={item.value ?? "empty"} value={item.value}>
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

          <div className="grid gap-3 sm:grid-cols-12">
            <TextField
              className="sm:col-span-3"
              control={form.control}
              disabled={actionPending}
              inputMode="numeric"
              label="Quilometragem"
              name="quilometragem"
              rules={{
                required: "Informe a quilometragem.",
              }}
              transform={(value) => value.replace(/\D/g, "").slice(0, 7)}
            />
            <TextField
              className="sm:col-span-6"
              control={form.control}
              disabled={actionPending}
              label="Secretaria"
              name="secretaria"
              rules={{ required: "Informe a secretaria." }}
            />
            <Controller
              control={form.control}
              name="status"
              rules={{ required: "Selecione o status." }}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid} className="sm:col-span-3">
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

          <Controller
            control={form.control}
            name="observacoes"
            render={({ field }) => (
              <Field>
                <FieldLabel htmlFor="observacoes">Observações</FieldLabel>
                <Textarea
                  {...field}
                  disabled={actionPending}
                  id="observacoes"
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
          {actionPending
            ? "Salvando..."
            : isEditing
              ? "Salvar alterações"
              : "Cadastrar veículo"}
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

type TextFieldProps = {
  className?: string;
  control: ReturnType<typeof useForm<VeiculoFormValues>>["control"];
  disabled?: boolean;
  inputMode?: "numeric";
  label: string;
  maxLength?: number;
  name: keyof VeiculoFormValues;
  placeholder?: string;
  rules?: Parameters<typeof Controller<VeiculoFormValues>>[0]["rules"];
  transform?: (value: string) => string;
};

function TextField({
  className,
  control,
  disabled,
  inputMode,
  label,
  maxLength,
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
        <Field data-invalid={fieldState.invalid} className={className}>
          <FieldLabel htmlFor={name}>{label}</FieldLabel>
          <Input
            disabled={disabled}
            id={name}
            inputMode={inputMode}
            maxLength={maxLength}
            name={field.name}
            onBlur={field.onBlur}
            onChange={(event) => {
              const value = transform
                ? transform(event.target.value)
                : event.target.value;

              field.onChange(value);
            }}
            placeholder={placeholder}
            ref={field.ref}
            value={field.value ?? ""}
            aria-invalid={fieldState.invalid}
          />
          <FieldError errors={[fieldState.error]} />
        </Field>
      )}
    />
  );
}
