"use client";

import { FormDialogCancel } from "@/components/form-dialog-cancel";

import { startTransition, useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { DatePickerInput } from "@/app/licencas/date-picker-input";
import { PostoCombobox } from "@/components/posto-combobox";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { DialogFooter } from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";

import {
  Item,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@/components/ui/item";
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
  type FrotaPostoCredenciado,
  type FrotaAbastecimento,
  type FrotaVeiculo,
} from "@/lib/frotas-data";
import { createAbastecimento } from "./actions";

type AbastecimentoFormProps = {
  onCreated?: (abastecimento: FrotaAbastecimento) => void;
  motoristas: { id: string; nome: string; cpf: string | null }[];
  postos: FrotaPostoCredenciado[];
  veiculos: FrotaVeiculo[];
};

type AbastecimentoFormValues = {
  arla_incluso: boolean;
  combustivel: string | null;
  data_abastecimento: string;
  motorista: string;
  observacoes: string;
  posto_id: string | null;
  veiculo_id: string | null;
};

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

export function AbastecimentoForm({
  onCreated,
  motoristas,
  postos,
  veiculos,
}: AbastecimentoFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, actionPending] = useActionState(
    createAbastecimento,
    {}
  );
  const today = new Date().toISOString().slice(0, 10);
  const form = useForm<AbastecimentoFormValues>({
    defaultValues: {
      arla_incluso: false,
      combustivel: null,
      data_abastecimento: today,
      motorista: "",
      observacoes: "",
      posto_id: null,
      veiculo_id: null,
    },
  });
  const selectedCombustivel = useWatch({
    control: form.control,
    name: "combustivel",
  });
  const canUseArla = isDieselFuel(selectedCombustivel ?? "");
  useEffect(() => {
    if (!canUseArla) {
      form.setValue("arla_incluso", false);
    }
  }, [canUseArla, form]);

  useEffect(() => {
    if (state.success) {
      toast.success(state.success, {
        id: "abastecimento-create-success",
      });
      router.refresh();
      closeParentDialog(formRef.current);
      if (state.abastecimento) {
        onCreated?.(state.abastecimento);
      }
      form.reset({
        arla_incluso: false,
        combustivel: null,
        data_abastecimento: today,
          motorista: "",
        observacoes: "",
        posto_id: null,
        veiculo_id: null,
      });
    }
  }, [form, onCreated, router, state.abastecimento, state.success, today]);

  function submitForm(values: AbastecimentoFormValues) {
    const formData = new FormData();
    formData.set("veiculo_id", values.veiculo_id ?? "");
    formData.set("data_abastecimento", values.data_abastecimento);
    formData.set("motorista", values.motorista);
    formData.set("posto_id", values.posto_id ?? "");
    formData.set("combustivel", values.combustivel ?? "");
    formData.set("arla_incluso", values.arla_incluso ? "true" : "false");
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
                <Field className="sm:col-span-8" data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="veiculo_id">Veículo</FieldLabel>
                  <VehicleCombobox
                    id="veiculo_id"
                    invalid={fieldState.invalid}
                    onChange={(value) => {
                      const veiculo = veiculos.find((item) => item.id === value);
                      field.onChange(value);
                      form.setValue(
                        "combustivel",
                        veiculo?.combustivel ?? null
                      );
                      if (!isDieselFuel(veiculo?.combustivel ?? "")) {
                        form.setValue("arla_incluso", false);
                      }
                    }}
                    value={field.value}
                    veiculos={veiculos}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="data_abastecimento"
              rules={{ required: "Informe a data." }}
              render={({ field, fieldState }) => (
                <div className="sm:col-span-4">
                  <DatePickerInput
                    id="data_abastecimento"
                    name={field.name}
                    label="Data"
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
              name="motorista"
              rules={{ required: "Informe o motorista." }}
              render={({ field, fieldState }) => (
                <Field className="sm:col-span-8" data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="motorista">Motorista</FieldLabel>
                  <Combobox
                    items={motoristas}
                    inputValue={field.value}
                    value={motoristas.find((item) => item.nome === field.value) ?? null}
                    onInputValueChange={(value, details) => {
                      if (details.reason === "input-change") field.onChange(value);
                    }}
                    onValueChange={(item) => { if (item) field.onChange(item.nome); }}
                    itemToStringLabel={(item) => item.nome}
                    filter={(item, query) => {
                      const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
                      const digits = query.replace(/\D/g, "");
                      return normalize(item.nome).includes(normalize(query)) || Boolean(digits && item.cpf?.replace(/\D/g, "").includes(digits));
                    }}
                    disabled={actionPending}
                  >
                    <ComboboxInput id="motorista" ref={field.ref} onBlur={field.onBlur} aria-invalid={fieldState.invalid} placeholder="Pesquise por nome ou CPF" />
                    <ComboboxContent>
                      <ComboboxEmpty>Nenhum motorista encontrado. Você pode informar o nome.</ComboboxEmpty>
                      <ComboboxList>
                        {(item) => (
                          <ComboboxItem key={item.id} value={item}>
                            <div className="flex flex-col gap-0.5">
                              <span>{item.nome}</span>
                              <span className="text-xs text-muted-foreground">{item.cpf?.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4") ?? "CPF não informado"}</span>
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
            <Controller
              control={form.control}
              name="combustivel"
              rules={{ required: "Selecione o combustível." }}
              render={({ field, fieldState }) => (
                <Field className="sm:col-span-4" data-invalid={fieldState.invalid}>
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
                      className="!w-full"
                      style={{ width: "100%" }}
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

          <Controller
            control={form.control}
            name="arla_incluso"
            render={({ field }) => (
              <Field>
                <label className="flex cursor-pointer items-start gap-3 rounded-lg border bg-muted/20 p-3 text-sm">
                  <Checkbox
                    checked={field.value}
                    disabled={actionPending || !canUseArla}
                    onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                  />
                  <span className="grid gap-1">
                    <span className="font-medium">
                      Autorizar abastecimento com ARLA
                    </span>
                    <span className="text-muted-foreground">
                      Disponível apenas para combustível Diesel. O posto
                      preencherá litros e valores do ARLA na conclusão.
                    </span>
                  </span>
                </label>
              </Field>
            )}
          />

          <Controller
            control={form.control}
            name="posto_id"
            rules={{ required: "Selecione o posto credenciado." }}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="posto_id">Posto credenciado</FieldLabel>
                <PostoCombobox
                  id="posto_id"
                  value={field.value}
                  onChange={field.onChange}
                  postos={postos}
                  disabled={actionPending}
                  invalid={fieldState.invalid}
                  placeholder="Pesquisar posto credenciado"
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />

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
          {actionPending ? "Emitindo..." : "Emitir ordem"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function VehicleCombobox({
  id,
  invalid,
  onChange,
  value,
  veiculos,
}: {
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
        `${veiculo.modelo} ${veiculo.marca} ${veiculo.placa}`
      }
      isItemEqualToValue={(item: FrotaVeiculo, selected: FrotaVeiculo) =>
        item.id === selected.id
      }
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

function closeParentDialog(formElement: HTMLFormElement | null) {
  const closeButton = formElement
    ?.closest('[data-slot="dialog-content"]')
    ?.querySelector<HTMLElement>('[data-slot="dialog-close"]');

  closeButton?.click();
}

function isDieselFuel(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .includes("diesel");
}
