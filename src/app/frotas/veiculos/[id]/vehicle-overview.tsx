import type { ReactNode } from "react";
import { ChevronDown, CircleDollarSign, FileText, Fuel, Gauge, ShieldAlert, UserRound, Wrench } from "lucide-react";
import { VeiculoFotoAvatarControl } from "@/app/frotas/veiculo-foto-avatar-control";
import { VeiculoAvatar } from "@/components/veiculo-avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { FrotaVeiculo } from "@/lib/frotas-data";

export function VehicleOverviewHeader({ veiculo, canUpdate, status }: {
  veiculo: FrotaVeiculo;
  canUpdate: boolean;
  status: ReactNode;
}) {
  return (
    <Card className="py-0">
      <CardContent className="flex flex-col gap-6 p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-5">
          {canUpdate ? <VeiculoFotoAvatarControl veiculo={veiculo} /> : <VeiculoAvatar fotoUrl={veiculo.foto_url} placa={veiculo.placa} className="size-24" />}
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md border bg-muted/30 px-2.5 py-1 font-mono text-sm font-semibold tracking-wider">{veiculo.placa}</span>
              {status}
            </div>
            <h2 className="break-words text-xl font-semibold tracking-tight">{veiculo.modelo || "Veículo em cadastro"}</h2>
            <p className="text-sm text-muted-foreground">{veiculo.marca || "Marca não informada"}</p>
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-5 border-t pt-4 lg:min-w-72 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6">
          <div className="space-y-1.5">
            <dt className="flex items-center gap-1.5 text-xs text-muted-foreground"><Fuel className="size-3.5" aria-hidden="true" />Combustível</dt>
            <dd className="text-sm font-medium">{veiculo.combustivel || "Não informado"}</dd>
          </div>
          <div className="space-y-1.5">
            <dt className="flex items-center gap-1.5 text-xs text-muted-foreground"><Gauge className="size-3.5" aria-hidden="true" />Quilometragem</dt>
            <dd className="text-sm font-medium tabular-nums">{veiculo.quilometragem === null ? "Não informada" : `${veiculo.quilometragem.toLocaleString("pt-BR")} km`}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}

type ConsultationSummary = {
  debtTotal: number;
  debtCount: number;
  fineTotal: number;
  fineHistory: number;
  consultedAt: string;
};

export function VehicleOverview({ veiculo, consultation }: {
  veiculo: FrotaVeiculo;
  consultation: ConsultationSummary | null;
}) {
  const technicalFields = [
    { label: "Tipo", value: veiculo.tipo },
    { label: "Espécie", value: veiculo.especie },
    { label: "Categoria", value: veiculo.categoria },
    { label: "Versão", value: veiculo.versao },
    { label: "Cor", value: veiculo.cor },
    { label: "Capacidade", value: veiculo.capacidade },
    { label: "Potência", value: veiculo.potencia },
    { label: "Cilindrada", value: veiculo.cilindrada },
  ];

  return (
    <div className="space-y-4 pt-2">
      {consultation ? (
        <section aria-label="Situação na última consulta" className="space-y-3">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex min-h-36 flex-col justify-between gap-4 rounded-xl border border-sky-200/70 bg-sky-50/60 p-5 dark:border-sky-900 dark:bg-sky-950/25">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-sky-800 dark:text-sky-300">Débitos na consulta</p>
                <span className="flex size-9 items-center justify-center rounded-lg bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300"><CircleDollarSign className="size-5" aria-hidden="true" /></span>
              </div>
              <div className="flex flex-wrap items-end justify-between gap-2">
                <p className="text-3xl font-semibold tracking-tight text-sky-950 tabular-nums dark:text-sky-100">{currency(consultation.debtTotal)}</p>
                <p className="text-xs text-sky-700 dark:text-sky-300">{consultation.debtCount} lançamento(s)</p>
              </div>
            </div>
            <div className="flex min-h-36 flex-col justify-between gap-4 rounded-xl border border-amber-200/70 bg-amber-50/60 p-5 dark:border-amber-900 dark:bg-amber-950/25">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Multas a pagar</p>
                <span className="flex size-9 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300"><ShieldAlert className="size-5" aria-hidden="true" /></span>
              </div>
              <div className="flex flex-wrap items-end justify-between gap-2">
                <p className="text-3xl font-semibold tracking-tight text-amber-950 tabular-nums dark:text-amber-100">{currency(consultation.fineTotal)}</p>
                <p className="text-xs text-amber-700 dark:text-amber-300">{consultation.fineHistory} multa(s) no histórico</p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 px-1 text-xs text-muted-foreground">
            <p>Consulta Detran/SC · {new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" }).format(new Date(consultation.consultedAt))}</p>
            <p>Multas podem compor os débitos. O histórico não confirma quitação.</p>
          </div>
        </section>
      ) : null}

      <div className="grid items-stretch gap-4 xl:grid-cols-2">
        <Card className="h-full gap-4 overflow-hidden pt-0">
          <CardHeader className="border-b bg-sky-50/40 py-4 dark:bg-sky-950/15"><CardTitle className="flex items-center gap-2 text-base"><FileText className="size-4 text-sky-600 dark:text-sky-400" aria-hidden="true" />Documento e registro</CardTitle></CardHeader>
          <CardContent>
            <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
              <OverviewField label="Renavam" value={veiculo.renavam} />
              <OverviewField label="Fabricação / modelo" value={`${veiculo.ano_fabricacao || "—"} / ${veiculo.ano_modelo || veiculo.ano || "—"}`} />
              <OverviewField label="Exercício" value={veiculo.exercicio} />
              <OverviewField label="Licenciado" value={veiculo.licenciado} />
              <OverviewField label="Situação no registro" value={veiculo.situacao_veicular} />
              <OverviewField label="Data do documento" value={documentDate(veiculo.data_documento)} />
              <OverviewField label="Município de emplacamento" value={veiculo.municipio_emplacamento} />
              <OverviewField label="Local de registro" value={veiculo.local_registro} />
            </dl>
          </CardContent>
        </Card>

        <Card className="h-full gap-4 overflow-hidden pt-0">
          <CardHeader className="border-b bg-violet-50/40 py-4 dark:bg-violet-950/15"><CardTitle className="flex items-center gap-2 text-base"><UserRound className="size-4 text-violet-600 dark:text-violet-400" aria-hidden="true" />Responsabilidade e restrições</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
              <OverviewField label="Empresa responsável" value={veiculo.prefeitura_nome} />
              <OverviewField label="Proprietário" value={veiculo.proprietario_atual} />
              <OverviewField label="CPF / CNPJ do proprietário" value={veiculo.proprietario_documento} />
              <OverviewField label="Restrição de venda" value={veiculo.restricao_venda} />
            </dl>
            <dl className="border-t pt-4"><OverviewField label="Outras restrições" value={veiculo.restricoes} /></dl>
            {veiculo.observacoes ? <dl className="border-t pt-4"><OverviewField label="Observações" value={veiculo.observacoes} /></dl> : null}
          </CardContent>
        </Card>
      </div>

      <details className="group overflow-hidden rounded-xl border bg-card">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-4 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset [&::-webkit-details-marker]:hidden">
          <Wrench className="size-4 text-muted-foreground" aria-hidden="true" />
          Características técnicas
          <ChevronDown className="ml-auto size-4 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true" />
        </summary>
        <dl className="grid gap-x-6 gap-y-5 border-t p-5 sm:grid-cols-2 xl:grid-cols-4">
          {technicalFields.map((field) => <OverviewField key={field.label} {...field} />)}
        </dl>
      </details>
    </div>
  );
}

function OverviewField({ label, value }: { label: string; value: string | number | null | undefined }) {
  const display = typeof value === "string" ? value.trim() : value;
  return (
    <div className="min-w-0 space-y-1">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="break-words text-sm leading-relaxed font-medium">{display === null || display === undefined || display === "" ? <span className="font-normal text-muted-foreground">Não informado</span> : display}</dd>
    </div>
  );
}

function documentDate(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(`${value}T00:00:00.000Z`));
}

function currency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}
