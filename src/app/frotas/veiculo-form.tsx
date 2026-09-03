"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  Loader2,
  SearchCheck,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

import { PrefeituraCombobox } from "@/components/prefeitura-combobox";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
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
  type FrotaPrefeituraOption,
  type FrotaVeiculo,
  type VeiculoStatus,
} from "@/lib/frotas-data";
import { createVeiculo, createVeiculoAutomatico, updateVeiculo } from "./actions";

type VeiculoFormProps = {
  prefeituras: FrotaPrefeituraOption[];
  secretarias?: unknown[];
  selectedPrefeituraId?: string;
  showPrefeituraField?: boolean;
  veiculo?: FrotaVeiculo;
};

type VeiculoFormValues = {
  ano_fabricacao: string;
  ano_modelo: string;
  carroceria: string;
  categoria: string;
  combustivel: string;
  cor: string;
  data_aquisicao: string;
  especie: string;
  licenciado: string;
  lugares: string;
  marca: string;
  modelo: string;
  municipio_emplacamento: string;
  origem_dados: string;
  placa: string;
  prefeitura_id: string | null;
  principal_condutor: string;
  proprietario_anterior: string;
  proprietario_atual: string;
  renavam: string;
  restricao_venda: string;
  restricoes: string;
  situacao_veicular: string;
  status: VeiculoStatus | null;
  tipo: string;
};

const tipoItems = [
  { label: "Automóvel", value: "Automovel" },
  { label: "Motocicleta", value: "Motocicleta" },
  { label: "Caminhonete", value: "Caminhonete" },
  { label: "Utilitário", value: "Utilitario" },
  { label: "Van", value: "Van" },
  { label: "Ônibus", value: "Onibus" },
  { label: "Caminhão", value: "Caminhao" },
  { label: "Máquina pesada", value: "Maquina pesada" },
  { label: "Implemento", value: "Implemento" },
];

const especieItems = [
  { label: "Passageiro", value: "Passageiro" },
  { label: "Carga", value: "Carga" },
  { label: "Misto", value: "Misto" },
  { label: "Tração", value: "Tracao" },
  { label: "Especial", value: "Especial" },
  { label: "Coleção", value: "Colecao" },
];

const combustivelItems = [
  { label: "Álcool/Gasolina", value: "Alcool-Gasol" },
  { label: "Gasolina", value: "Gasolina" },
  { label: "Etanol", value: "Etanol" },
  { label: "Flex", value: "Flex" },
  { label: "Diesel", value: "Diesel" },
  { label: "GNV", value: "GNV" },
  { label: "Elétrico", value: "Eletrico" },
  { label: "Híbrido", value: "Hibrido" },
];

export function VeiculoForm({
  prefeituras,
  selectedPrefeituraId,
  showPrefeituraField = true,
  veiculo,
}: VeiculoFormProps) {
  const isEditing = Boolean(veiculo);
  const [createMode, setCreateMode] = useState<"choice" | "manual" | "automatic">(
    isEditing ? "manual" : "choice"
  );
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, actionPending] = useActionState(
    isEditing ? updateVeiculo : createVeiculo,
    {}
  );
  const [automaticState, automaticFormAction, automaticPending] = useActionState(
    createVeiculoAutomatico,
    {}
  );
  const form = useForm<VeiculoFormValues>({
    defaultValues: getDefaultValues(veiculo, selectedPrefeituraId),
  });

  useEffect(() => {
    if (state.success) {
      toast.success(state.success, {
        id: isEditing ? "veiculo-edit-success" : "veiculo-create-success",
      });
      router.refresh();

      if (!isEditing) {
        form.reset(getDefaultValues(undefined, selectedPrefeituraId));
      }

      closeParentDialog(formRef.current);
    }
  }, [form, isEditing, router, selectedPrefeituraId, state.success]);

  useEffect(() => {
    if (automaticState.success) {
      toast.success(automaticState.success, {
        id: "veiculo-auto-create-success",
      });
      router.refresh();
      form.reset(getDefaultValues(undefined, selectedPrefeituraId));
      closeParentDialog(formRef.current);
    }
  }, [automaticState.success, form, router, selectedPrefeituraId]);

  function submitForm(values: VeiculoFormValues) {
    const formData = new FormData();

    if (veiculo) {
      formData.set("id", veiculo.id);
    }

    formData.set("prefeitura_id", values.prefeitura_id ?? "");
    formData.set("renavam", values.renavam);
    formData.set("placa", values.placa);
    formData.set("lugares", values.lugares);
    formData.set("ano_fabricacao", values.ano_fabricacao);
    formData.set("ano_modelo", values.ano_modelo);
    formData.set("tipo", values.tipo);
    formData.set("marca", values.marca);
    formData.set("modelo", values.modelo);
    formData.set("cor", values.cor);
    formData.set("combustivel", values.combustivel);
    formData.set("carroceria", values.carroceria);
    formData.set("categoria", values.categoria);
    formData.set("municipio_emplacamento", values.municipio_emplacamento);
    formData.set("data_aquisicao", values.data_aquisicao);
    formData.set("status", values.status ?? "active");
    formData.set("proprietario_atual", values.proprietario_atual);
    formData.set("especie", values.especie);
    formData.set("principal_condutor", values.principal_condutor);
    formData.set("proprietario_anterior", values.proprietario_anterior);
    formData.set("restricao_venda", values.restricao_venda);
    formData.set("restricoes", values.restricoes);
    formData.set("licenciado", values.licenciado);
    formData.set("situacao_veicular", values.situacao_veicular);
    formData.set("origem_dados", values.origem_dados || "Cadastro");

    startTransition(() => {
      formAction(formData);
    });
  }

  function submitAutomaticForm(values: VeiculoFormValues) {
    const formData = new FormData();

    formData.set("prefeitura_id", values.prefeitura_id ?? "");
    formData.set("renavam", values.renavam);
    formData.set("placa", values.placa);

    startTransition(() => {
      automaticFormAction(formData);
    });
  }

  if (!isEditing && createMode === "choice") {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setCreateMode("manual")}
            className="group h-auto min-h-36 flex-col items-start justify-between gap-4 whitespace-normal rounded-xl p-4 text-left transition-all hover:border-foreground/30 hover:bg-muted/40"
          >
            <div className="flex w-full items-start justify-between gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg border bg-background transition-colors group-hover:bg-muted">
                <ClipboardList className="size-5" />
              </div>
            </div>
            <div>
              <div className="font-medium">Cadastro manual</div>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Preencha os dados do documento do veículo sem consultar API externa.
              </p>
            </div>
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setCreateMode("automatic")}
            className="group h-auto min-h-36 flex-col items-start justify-between gap-4 whitespace-normal rounded-xl p-4 text-left transition-all hover:border-foreground/30 hover:bg-muted/40"
          >
            <div className="flex w-full items-start justify-between gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg border bg-background transition-colors group-hover:bg-muted">
                <SearchCheck className="size-5" />
              </div>
              <span className="rounded-full bg-sky-100 px-2 py-1 text-xs font-medium text-sky-800">
                Mais rápido
              </span>
            </div>
            <div>
              <div className="font-medium">Consulta automática</div>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Informe placa e Renavam para buscar os dados do veículo.
              </p>
            </div>
          </Button>
        </div>
        <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          <ShieldCheck className="mt-0.5 size-4 shrink-0" />
          <span>
            A consulta automática fica bloqueada até a integração estar habilitada,
            evitando chamadas repetidas durante o cadastro.
          </span>
        </div>
      </div>
    );
  }

  if (!isEditing && createMode === "automatic") {
    const automaticBusy = automaticPending;

    return (
      <form
        ref={formRef}
        onSubmit={form.handleSubmit(submitAutomaticForm)}
        className="space-y-3"
        noValidate
      >
        {automaticState.error ? (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{automaticState.error}</span>
          </div>
        ) : null}

        <fieldset disabled={automaticBusy} className="disabled:opacity-70">
          <FieldGroup className="gap-3">
            {showPrefeituraField ? (
              <Controller
                control={form.control}
                name="prefeitura_id"
                rules={{ required: "Selecione a prefeitura." }}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="prefeitura_id_auto">Prefeitura</FieldLabel>
                    <PrefeituraCombobox
                      id="prefeitura_id_auto"
                      value={field.value}
                      onChange={field.onChange}
                      prefeituras={prefeituras}
                      disabled={automaticBusy}
                      invalid={fieldState.invalid}
                    />
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />
            ) : null}

            <div className="grid gap-3 sm:grid-cols-12">
              <TextField className="sm:col-span-6" control={form.control} disabled={automaticBusy} label="Placa" maxLength={7} name="placa" rules={{ pattern: { value: /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/, message: "Informe uma placa brasileira válida." }, required: "Informe a placa." }} transform={formatPlateInput} />
              <TextField className="sm:col-span-6" control={form.control} disabled={automaticBusy} label="Renavam" maxLength={11} name="renavam" rules={{ pattern: { value: /^\d{11}$/, message: "Informe o Renavam com 11 dígitos." }, required: "Informe o Renavam." }} transform={(value) => onlyDigits(value).slice(0, 11)} />
            </div>
          </FieldGroup>
        </fieldset>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={automaticBusy}
            onClick={() => setCreateMode("choice")}
          >
            Voltar
          </Button>
          <Button type="submit" className="gap-2" disabled={automaticBusy}>
            {automaticBusy ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
            {automaticBusy ? "Consultando..." : "Cadastrar e consultar"}
          </Button>
        </DialogFooter>
      </form>
    );
  }

  return (
    <form
      ref={formRef}
      onSubmit={form.handleSubmit(submitForm)}
      className="space-y-3"
      noValidate
    >
      {state.error ? (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{state.error}</span>
        </div>
      ) : null}

      <fieldset disabled={actionPending} className="disabled:opacity-70">
        <FieldGroup className="gap-3">
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
            <TextField className="sm:col-span-3" control={form.control} disabled={actionPending} label="Placa" maxLength={7} name="placa" rules={{ pattern: { value: /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/, message: "Informe uma placa brasileira válida." }, required: "Informe a placa." }} transform={formatPlateInput} />
            <TextField className="sm:col-span-3" control={form.control} disabled={actionPending} label="Renavam" maxLength={11} name="renavam" rules={{ pattern: { value: /^\d{11}$/, message: "Informe o Renavam com 11 dígitos." }, required: "Informe o Renavam." }} transform={(value) => onlyDigits(value).slice(0, 11)} />
            <TextField className="sm:col-span-2" control={form.control} disabled={actionPending} inputMode="numeric" label="Lugares" name="lugares" transform={(value) => onlyDigits(value).slice(0, 2)} />
            <TextField className="sm:col-span-2" control={form.control} disabled={actionPending} inputMode="numeric" label="Ano fabricação" name="ano_fabricacao" rules={{ pattern: { value: /^\d{4}$/, message: "Informe um ano válido." }, required: "Informe o ano de fabricação." }} transform={(value) => onlyDigits(value).slice(0, 4)} />
            <TextField className="sm:col-span-2" control={form.control} disabled={actionPending} inputMode="numeric" label="Ano modelo" name="ano_modelo" rules={{ pattern: { value: /^\d{4}$/, message: "Informe um ano válido." }, required: "Informe o ano modelo." }} transform={(value) => onlyDigits(value).slice(0, 4)} />
          </div>

          <div className="grid gap-3 sm:grid-cols-12">
            <SelectField className="sm:col-span-3" control={form.control} disabled={actionPending} label="Tipo" name="tipo" options={tipoItems} rules={{ required: "Informe o tipo." }} />
            <SelectField className="sm:col-span-3" control={form.control} disabled={actionPending} label="Espécie" name="especie" options={especieItems} />
            <TextField className="sm:col-span-3" control={form.control} disabled={actionPending} label="Marca" name="marca" rules={{ required: "Informe a marca." }} />
            <TextField className="sm:col-span-3" control={form.control} disabled={actionPending} label="Modelo" name="modelo" rules={{ required: "Informe o modelo." }} />
          </div>

          <div className="grid gap-3 sm:grid-cols-12">
            <TextField className="sm:col-span-3" control={form.control} disabled={actionPending} label="Cor" name="cor" />
            <SelectField className="sm:col-span-3" control={form.control} disabled={actionPending} label="Combustível" name="combustivel" options={combustivelItems} rules={{ required: "Informe o combustível." }} />
            <TextField className="sm:col-span-3" control={form.control} disabled={actionPending} label="Carroceria" name="carroceria" />
            <TextField className="sm:col-span-3" control={form.control} disabled={actionPending} label="Categoria" name="categoria" />
          </div>

          <div className="grid gap-3 sm:grid-cols-12">
            <TextField className="sm:col-span-4" control={form.control} disabled={actionPending} label="Data aquisição" name="data_aquisicao" placeholder="dd/mm/aaaa" transform={formatDateInputValue} />
            <TextField className="sm:col-span-4" control={form.control} disabled={actionPending} label="Município emplacamento" name="municipio_emplacamento" />
            <TextField className="sm:col-span-4" control={form.control} disabled={actionPending} label="Situação" name="situacao_veicular" placeholder="Em circulação" />
          </div>

          <div className="grid gap-3 sm:grid-cols-12">
            <TextField className="sm:col-span-4" control={form.control} disabled={actionPending} label="Licenciado" name="licenciado" placeholder="2026 CRLV Digital" />
            <TextField className="sm:col-span-4" control={form.control} disabled={actionPending} label="Origem dos dados" name="origem_dados" />
            <TextField className="sm:col-span-4" control={form.control} disabled={actionPending} label="Principal condutor" name="principal_condutor" />
          </div>

          <div className="grid gap-3 sm:grid-cols-12">
            <TextField className="sm:col-span-6" control={form.control} disabled={actionPending} label="Proprietário atual" name="proprietario_atual" />
            <TextField className="sm:col-span-6" control={form.control} disabled={actionPending} label="Proprietário anterior" name="proprietario_anterior" />
          </div>

          <div className="grid gap-3 sm:grid-cols-12">
            <TextField className="sm:col-span-4" control={form.control} disabled={actionPending} label="Restrição de venda" name="restricao_venda" placeholder="Sem gravame" />
            <TextField className="sm:col-span-8" control={form.control} disabled={actionPending} label="Restrições" name="restricoes" />
          </div>
        </FieldGroup>
      </fieldset>

      <DialogFooter>
        <Button type="submit" className="gap-2" disabled={actionPending}>
          {actionPending ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
          {actionPending ? "Salvando..." : isEditing ? "Salvar alterações" : "Cadastrar veículo"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function getDefaultValues(
  veiculo: FrotaVeiculo | undefined,
  selectedPrefeituraId: string | undefined
): VeiculoFormValues {
  return {
    ano_fabricacao: veiculo?.ano_fabricacao ? String(veiculo.ano_fabricacao) : veiculo?.ano ? String(veiculo.ano) : "",
    ano_modelo: veiculo?.ano_modelo ? String(veiculo.ano_modelo) : veiculo?.ano ? String(veiculo.ano) : "",
    carroceria: veiculo?.carroceria ?? "",
    categoria: veiculo?.categoria ?? "",
    combustivel: veiculo?.combustivel ?? "",
    cor: veiculo?.cor ?? "",
    data_aquisicao: formatDateInput(veiculo?.data_aquisicao),
    especie: veiculo?.especie ?? "",
    licenciado: veiculo?.licenciado ?? "",
    lugares: veiculo?.lugares ?? "",
    marca: veiculo?.marca ?? "",
    modelo: veiculo?.modelo ?? "",
    municipio_emplacamento: veiculo?.municipio_emplacamento ?? "",
    origem_dados: veiculo?.origem_dados ?? "Documento",
    placa: veiculo?.placa ?? "",
    prefeitura_id: veiculo?.prefeitura_id ?? selectedPrefeituraId ?? null,
    principal_condutor: veiculo?.principal_condutor ?? "",
    proprietario_anterior: veiculo?.proprietario_anterior ?? "",
    proprietario_atual: veiculo?.proprietario_atual ?? "",
    renavam: veiculo?.renavam ?? "",
    restricao_venda: veiculo?.restricao_venda ?? "",
    restricoes: veiculo?.restricoes ?? "",
    situacao_veicular: veiculo?.situacao_veicular ?? "",
    status: veiculo?.status ?? "active",
    tipo: veiculo?.tipo ?? "",
  };
}

function closeParentDialog(formElement: HTMLFormElement | null) {
  const closeButton = formElement
    ?.closest('[data-slot="dialog-content"]')
    ?.querySelector<HTMLElement>('[data-slot="dialog-close"]');

  closeButton?.click();
}

function formatDateInput(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  const [year, month, day] = value.split("-");

  if (!year || !month || !day) {
    return value;
  }

  return `${day}/${month}/${year}`;
}

function formatDateInputValue(value: string) {
  const digits = onlyDigits(value).slice(0, 8);

  return digits
    .replace(/(\d{2})(\d)/, "$1/$2")
    .replace(/(\d{2})(\d)/, "$1/$2");
}

function formatPlateInput(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 7);
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
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

type SelectFieldProps = {
  className?: string;
  control: ReturnType<typeof useForm<VeiculoFormValues>>["control"];
  disabled?: boolean;
  label: string;
  name: keyof VeiculoFormValues;
  options: { label: string; value: string }[];
  rules?: Parameters<typeof Controller<VeiculoFormValues>>[0]["rules"];
};

function SelectField({
  className,
  control,
  disabled,
  label,
  name,
  options,
  rules,
}: SelectFieldProps) {
  return (
    <Controller
      control={control}
      name={name}
      rules={rules}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid} className={className}>
          <FieldLabel htmlFor={name}>{label}</FieldLabel>
          <Select
            items={options}
            name={field.name}
            value={typeof field.value === "string" ? field.value : ""}
            onValueChange={(value) => field.onChange(value ?? "")}
            disabled={disabled}
          >
            <SelectTrigger id={name} className="w-full" aria-invalid={fieldState.invalid}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>{label}</SelectLabel>
                {options.map((item) => (
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
  );
}
