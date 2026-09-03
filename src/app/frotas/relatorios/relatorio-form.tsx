"use client";

import { startTransition, useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  SecretariaCombobox,
  type SecretariaComboboxOption,
} from "@/components/secretaria-combobox";
import { DialogFooter } from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
} from "@/components/ui/select";
import {
  fuelStatusOptions,
  maintenanceStatusOptions,
  reportTypeOptions,
  vehicleStatusOptions,
  type RelatorioTipo,
} from "@/lib/relatorios-data";
import type {
  FrotaPostoCredenciado,
  FrotaPrefeituraOption,
  FrotaVeiculo,
  VencimentoTipo,
} from "@/lib/frotas-data";
import { createRelatorio } from "./actions";

type RelatorioFormProps = {
  postos: FrotaPostoCredenciado[];
  prefeituras: FrotaPrefeituraOption[];
  secretarias: SecretariaComboboxOption[];
  selectedPrefeituraId?: string;
  showPrefeituraField: boolean;
  veiculos: FrotaVeiculo[];
};

const today = new Date();
const thirtyDaysAgo = new Date();
thirtyDaysAgo.setDate(today.getDate() - 30);

const vencimentoTypeOptions: Array<{ label: string; value: VencimentoTipo | "all" }> = [
  { label: "Todos", value: "all" },
  { label: "IPVA", value: "ipva" },
  { label: "Licenciamento", value: "licenciamento" },
  { label: "Seguro", value: "seguro" },
];

const vencimentoStatusOptions = [
  { label: "Todos", value: "all" },
  { label: "Pendentes", value: "pending" },
  { label: "Pagos", value: "paid" },
  { label: "Vencidos", value: "expired" },
];

export function RelatorioForm({
  postos,
  prefeituras,
  secretarias,
  selectedPrefeituraId,
  showPrefeituraField,
  veiculos,
}: RelatorioFormProps) {
  const router = useRouter();
  const [state, formAction, actionPending] = useActionState(createRelatorio, {});
  const [tipo, setTipo] = useState<RelatorioTipo>("vehicles");
  const [prefeituraId, setPrefeituraId] = useState(selectedPrefeituraId ?? "");
  const [status, setStatus] = useState("all");
  const [postoId, setPostoId] = useState("all");
  const [veiculoId, setVeiculoId] = useState("all");
  const [secretaria, setSecretaria] = useState("all");
  const [combustivel, setCombustivel] = useState("all");
  const [vencimentoTipo, setVencimentoTipo] = useState("all");
  const [titulo, setTitulo] = useState(getDefaultReportTitle("vehicles"));

  const combustiveis = useMemo(
    () =>
      Array.from(
        new Set(veiculos.map((veiculo) => veiculo.combustivel).filter(Boolean))
      ).sort() as string[],
    [veiculos]
  );
  const titlePlaceholder = useMemo(() => getDefaultReportTitle(tipo), [tipo]);

  useEffect(() => {
    if (state.success && state.relatorioId) {
      toast.success(state.success, { id: "relatorio-create-success" });
      router.push(`/frotas/relatorios/${state.relatorioId}`);
      router.refresh();
    }
  }, [router, state.relatorioId, state.success]);

  function submitForm(formData: FormData) {
    startTransition(() => {
      formAction(formData);
    });
  }

  return (
    <form action={submitForm} className="space-y-4">
      {state.error ? (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{state.error}</span>
        </div>
      ) : null}

      <input name="tipo" type="hidden" value={tipo} />
      <input name="prefeitura_id" type="hidden" value={prefeituraId} />
      <input name="status" type="hidden" value={status} />
      <input name="posto_id" type="hidden" value={postoId} />
      <input name="veiculo_id" type="hidden" value={veiculoId} />
      <input name="secretaria" type="hidden" value={secretaria} />
      <input name="combustivel" type="hidden" value={combustivel} />
      <input name="vencimento_tipo" type="hidden" value={vencimentoTipo} />

      <fieldset disabled={actionPending} className="disabled:opacity-70">
        <FieldGroup className="grid gap-4 sm:grid-cols-12">
          <SelectField
            className={showPrefeituraField ? "sm:col-span-5" : "sm:col-span-12"}
            label="Tipo de relatório"
            options={reportTypeOptions.filter((item) => item.value !== "all")}
            value={tipo}
            onChange={(value) => {
                const nextType = value as RelatorioTipo;
                setTipo(nextType);
                setStatus(nextType === "fuel" ? "completed" : "all");
                setTitulo(getDefaultReportTitle(nextType));
              }}
            />
          {showPrefeituraField ? (
            <SelectField
              className="sm:col-span-7"
              label="Prefeitura"
              options={prefeituras.map((prefeitura) => ({
                label: prefeitura.nome,
                value: prefeitura.id,
              }))}
              value={prefeituraId}
              onChange={setPrefeituraId}
              placeholder="Selecione a prefeitura"
            />
          ) : null}

          <Field className="sm:col-span-12">
            <FieldLabel htmlFor="titulo">Título</FieldLabel>
            <Input
              id="titulo"
              name="titulo"
              required
              placeholder={titlePlaceholder}
              value={titulo}
              onChange={(event) => setTitulo(event.target.value)}
            />
            <FieldError />
          </Field>

          {tipo !== "vehicles" ? (
            <>
              <Field className="sm:col-span-6">
                <FieldLabel htmlFor="periodo_inicio">Início</FieldLabel>
                <Input
                  id="periodo_inicio"
                  name="periodo_inicio"
                  required
                  type="date"
                  defaultValue={toDateInputValue(thirtyDaysAgo)}
                />
              </Field>
              <Field className="sm:col-span-6">
                <FieldLabel htmlFor="periodo_fim">Fim</FieldLabel>
                <Input
                  id="periodo_fim"
                  name="periodo_fim"
                  required
                  type="date"
                  defaultValue={toDateInputValue(today)}
                />
              </Field>
            </>
          ) : null}

          {tipo !== "vehicles" ? (
            <SelectField
              className={tipo === "expirations" ? "sm:col-span-4" : "sm:col-span-6"}
              label="Veículo"
              options={[
                { label: "Todos", value: "all" },
                ...veiculos.map((veiculo) => ({
                  label: `${veiculo.modelo} · ${veiculo.placa}`,
                  value: veiculo.id,
                })),
              ]}
              value={veiculoId}
              onChange={setVeiculoId}
            />
          ) : null}
          {tipo === "fuel" ? (
            <SelectField
              className="sm:col-span-6"
              label="Posto"
              options={[
                { label: "Todos", value: "all" },
                ...postos.map((posto) => ({
                  label: posto.nome,
                  value: posto.id,
                })),
              ]}
              value={postoId}
              onChange={setPostoId}
            />
          ) : null}
          {(tipo === "fuel" || tipo === "maintenance" || tipo === "vehicles") ? (
            <Field
              className={
                tipo === "vehicles" ? "sm:col-span-4" : "sm:col-span-6"
              }
            >
              <FieldLabel htmlFor="secretaria">Secretaria</FieldLabel>
              <SecretariaCombobox
                id="secretaria"
                value={secretaria}
                onChange={(value) => setSecretaria(value ?? "all")}
                secretarias={[
                  {
                    id: "all",
                    label: "Todas",
                    nome: "all",
                    prefeitura_id: selectedPrefeituraId,
                    prefeitura_nome: "Todas as secretarias",
                    status: "active",
                  },
                  ...secretarias,
                ]}
              />
            </Field>
          ) : null}
          {tipo === "vehicles" ? (
            <SelectField
              className="sm:col-span-4"
              label="Combustível"
              options={[
                { label: "Todos", value: "all" },
                ...combustiveis.map((item) => ({ label: item, value: item })),
              ]}
              value={combustivel}
              onChange={setCombustivel}
            />
          ) : null}
          {tipo === "expirations" ? (
            <SelectField
              className="sm:col-span-4"
              label="Tipo de débito"
              options={vencimentoTypeOptions}
              value={vencimentoTipo}
              onChange={setVencimentoTipo}
            />
          ) : null}
            <SelectField
              className={
                tipo === "vehicles" || tipo === "expirations"
                  ? "sm:col-span-4"
                  : "sm:col-span-6"
              }
              label="Status"
              options={
                tipo === "fuel"
                  ? fuelStatusOptions
                  : tipo === "maintenance"
                    ? maintenanceStatusOptions
                    : tipo === "vehicles"
                      ? vehicleStatusOptions
                      : vencimentoStatusOptions
              }
              value={status}
              onChange={setStatus}
            />
        </FieldGroup>
      </fieldset>

      <DialogFooter>
        <Button className="gap-2" disabled={actionPending} type="submit">
          {actionPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <CheckCircle2 className="size-4" />
          )}
          {actionPending ? "Gerando..." : "Gerar relatório"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function SelectField({
  className,
  label,
  onChange,
  options,
  placeholder = "Selecione",
  value,
}: {
  className?: string;
  label: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  placeholder?: string;
  value: string;
}) {
  const selectedLabel =
    options.find((option) => option.value === value)?.label ?? placeholder;

  return (
    <Field className={className}>
      <FieldLabel>{label}</FieldLabel>
      <Select value={value} onValueChange={(nextValue) => nextValue && onChange(nextValue)}>
        <SelectTrigger className="h-9 w-full">
          <span className="truncate text-left">{selectedLabel}</span>
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>{label}</SelectLabel>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  );
}

function toDateInputValue(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getDefaultReportTitle(tipo: RelatorioTipo) {
  const labels: Record<RelatorioTipo, string> = {
    expirations: "Relatório de débitos",
    fuel: "Relatório de abastecimentos",
    maintenance: "Relatório de manutenções",
    vehicles: "Relatório geral de veículos",
  };

  return labels[tipo];
}
