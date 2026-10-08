"use client";

import { FormDialogCancel } from "@/components/form-dialog-cancel";

import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
} from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

import { DatePickerInput } from "@/app/licencas/date-picker-input";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
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
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@/components/ui/item";
import { Textarea } from "@/components/ui/textarea";
import {  type FrotaVeiculo } from "@/lib/frotas-data";
import { OficinaCombobox } from "@/components/oficina-combobox";
import type { FrotaOficina } from "@/lib/oficinas-data";
import { createManutencao } from "./actions";

type ManutencaoFormProps = {
  selectedVeiculoId?: string;
  veiculos: FrotaVeiculo[];
  oficinas: FrotaOficina[];
};

type ManutencaoFormValues = {
  data_entrada: string;
  descricao: string;
  oficina_id: string;
  observacoes: string;
  quilometragem: string;
  responsavel: string;
  tipo: string | null;
  valor: string;
  veiculo_id: string | null;
};

const tipoItems = [
  { label: "Selecione o tipo", value: null },
  { label: "Preventiva", value: "Preventiva" },
  { label: "Corretiva", value: "Corretiva" },
  { label: "Revisão", value: "Revisão" },
  { label: "Pneus", value: "Pneus" },
  { label: "Óleo e filtros", value: "Óleo e filtros" },
  { label: "Freios", value: "Freios" },
  { label: "Elétrica", value: "Elétrica" },
  { label: "Funilaria", value: "Funilaria" },
  { label: "Outro", value: "Outro" },
];

export function ManutencaoForm({
  selectedVeiculoId,
  veiculos,
  oficinas,
}: ManutencaoFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const defaultVeiculoId = selectedVeiculoId ?? null;
  const [state, formAction, actionPending] = useActionState(
    createManutencao,
    {}
  );
  const today = new Date().toISOString().slice(0, 10);
  const form = useForm<ManutencaoFormValues>({
    defaultValues: {
      data_entrada: today,
      descricao: "",
      oficina_id: "",
      observacoes: "",
      quilometragem: "",
      responsavel: "",
      tipo: null,
      valor: "",
      veiculo_id: defaultVeiculoId,
    },
  });
  useEffect(() => {
    if (state.success) {
      toast.success(state.success, {
        id: "manutencao-create-success",
      });
      router.refresh();
      closeParentDialog(formRef.current);
      {
        form.reset({
          data_entrada: today,
          descricao: "",
          oficina_id: "",
          observacoes: "",
          quilometragem: "",
          responsavel: "",
          tipo: null,
          valor: "",
          veiculo_id: selectedVeiculoId ?? null,
        });
      }
    }
  }, [
    form,
    router,
    selectedVeiculoId,
    state.success,
    today,
  ]);

  function submitForm(values: ManutencaoFormValues) {
    const formData = new FormData();

formData.set("veiculo_id", values.veiculo_id ?? "");
    formData.set("tipo", values.tipo ?? "");
    formData.set("descricao", values.descricao);
    formData.set("data_entrada", values.data_entrada);
    formData.set("oficina_id", values.oficina_id);
    formData.set("responsavel", values.responsavel);
    formData.set("valor", values.valor);
    formData.set("quilometragem", values.quilometragem);
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
          <div className="grid gap-3 sm:grid-cols-12">
            <Controller
              control={form.control}
              name="veiculo_id"
              rules={{ required: "Selecione o veículo." }}
              render={({ field, fieldState }) => (
                <Field
                  className="sm:col-span-8"
                  data-invalid={fieldState.invalid}
                >
                  <FieldLabel htmlFor="veiculo_id">Veículo</FieldLabel>
                  <VehicleCombobox
                    id="veiculo_id"
                    disabled={actionPending}
                    invalid={fieldState.invalid}
                    onChange={field.onChange}
                    value={field.value}
                    veiculos={veiculos}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="data_entrada"
              rules={{ required: "Informe a data de entrada." }}
              render={({ field, fieldState }) => (
                <div className="sm:col-span-4">
                  <DatePickerInput
                    id="data_entrada"
                    name={field.name}
                    label="Entrada"
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={actionPending}
                    error={fieldState.error?.message}
                    required
                  />
                </div>
              )}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-12">
            <Controller
              control={form.control}
              name="tipo"
              rules={{ required: "Selecione o tipo." }}
              render={({ field, fieldState }) => (
                <Field
                  className="sm:col-span-4"
                  data-invalid={fieldState.invalid}
                >
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
            <Controller
              control={form.control}
              name="oficina_id"
              rules={{ required: "Selecione uma oficina." }}
              render={({ field, fieldState }) => (
                <Field className="sm:col-span-4" data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="oficina_id">Oficina</FieldLabel>
                  <OficinaCombobox id="oficina_id" value={field.value} onChange={field.onChange} disabled={actionPending} invalid={fieldState.invalid} oficinas={oficinas.filter(item => item.status === "active")} />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
            <TextField
              className="sm:col-span-4"
              control={form.control}
              disabled={actionPending}
              label="Responsável"
              name="responsavel"
            />
          </div>

          <Controller
            control={form.control}
            name="descricao"
            rules={{ required: "Descreva o serviço realizado." }}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="descricao">Serviço</FieldLabel>
                <Textarea
                  id="descricao"
                  value={field.value}
                  onChange={field.onChange}
                  aria-invalid={fieldState.invalid}
                  rows={3}
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />

          <div className="grid gap-3 sm:grid-cols-12">
            <TextField
              className="sm:col-span-6"
              control={form.control}
              disabled={actionPending}
              inputMode="numeric"
              label="Valor"
              name="valor"
              placeholder="R$ 0,00"
              transform={formatCurrencyInput}
            />
            <TextField
              className="sm:col-span-6"
              control={form.control}
              disabled={actionPending}
              inputMode="numeric"
              label="Quilometragem"
              name="quilometragem"
              transform={(value) => value.replace(/\D/g, "").slice(0, 7)}
            />
          </div>

          <Controller
            control={form.control}
            name="observacoes"
            render={({ field }) => (
              <Field>
                <FieldLabel htmlFor="observacoes">Observações</FieldLabel>
                <Textarea
                  id="observacoes"
                  value={field.value}
                  onChange={field.onChange}
                  rows={3}
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
          {actionPending ? "Registrando..." : "Registrar manutenção"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function VehicleCombobox({
  disabled,
  id,
  invalid,
  onChange,
  value,
  veiculos,
}: {
  disabled?: boolean;
  id: string;
  invalid?: boolean;
  onChange: (value: string | null) => void;
  value: string | null;
  veiculos: FrotaVeiculo[];
}) {
  const selectedVehicle = veiculos.find((veiculo) => veiculo.id === value);

  return (
    <Combobox
      items={veiculos}
      value={selectedVehicle ?? null}
      onValueChange={(veiculo: FrotaVeiculo | null) =>
        onChange(veiculo?.id ?? null)
      }
      itemToStringLabel={(veiculo: FrotaVeiculo) =>
        `${veiculo.modelo} · ${veiculo.placa}`
      }
      itemToStringValue={(veiculo: FrotaVeiculo) =>
        `${veiculo.modelo} ${veiculo.marca} ${veiculo.placa} ${veiculo.prefixo}`
      }
      isItemEqualToValue={(item: FrotaVeiculo, selected: FrotaVeiculo) =>
        item.id === selected.id
      }
      disabled={disabled}
    >
      <ComboboxInput
        id={id}
        placeholder="Pesquisar por modelo, marca ou placa"
        aria-invalid={invalid}
      />
      <ComboboxContent>
        <ComboboxEmpty>Nenhum veículo encontrado.</ComboboxEmpty>
        <ComboboxList>
          {(veiculo: FrotaVeiculo) => (
            <ComboboxItem key={veiculo.id} value={veiculo}>
              <Item size="xs" className="p-0 pr-6">
                <ItemContent>
                  <ItemTitle className="whitespace-nowrap">
                    {veiculo.modelo} · {veiculo.placa}
                  </ItemTitle>
                  <ItemDescription>
                    {veiculo.marca}
                  </ItemDescription>
                </ItemContent>
              </Item>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

type TextFieldProps = {
  className?: string;
  control: ReturnType<typeof useForm<ManutencaoFormValues>>["control"];
  disabled?: boolean;
  inputMode?: "numeric";
  label: string;
  name: keyof ManutencaoFormValues;
  placeholder?: string;
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
  transform,
}: TextFieldProps) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Field className={className}>
          <FieldLabel htmlFor={name}>{label}</FieldLabel>
          <Input
            id={name}
            value={String(field.value ?? "")}
            disabled={disabled}
            inputMode={inputMode}
            placeholder={placeholder}
            onChange={(event) =>
              field.onChange(
                transform ? transform(event.target.value) : event.target.value
              )
            }
          />
        </Field>
      )}
    />
  );
}

function formatCurrencyInput(value: string) {
  const digits = value.replace(/\D/g, "");

  if (!digits) {
    return "";
  }

  const numericValue = Number(digits) / 100;

  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency",
  }).format(numericValue);
}

function closeParentDialog(formElement: HTMLFormElement | null) {
  const closeButton = formElement
    ?.closest('[data-slot="dialog-content"]')
    ?.querySelector<HTMLElement>('[data-slot="dialog-close"]');

  closeButton?.click();
}
