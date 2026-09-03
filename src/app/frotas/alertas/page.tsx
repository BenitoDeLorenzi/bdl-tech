import Link from "next/link";
import {
  Bell,
  Car,
  CircleCheck,
  CircleX,
  Clock3,
  ExternalLink,
  Loader2,
  Search,
  X,
} from "lucide-react";

import { FrotasShell } from "@/app/frotas/frotas-shell";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { requireUserProfile } from "@/lib/auth-data";
import { getFrotasData } from "@/lib/frotas-data";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    prefeitura?: string;
    q?: string;
    status?: string;
  }>;
};

type ConsultaStatus = "pending" | "processing" | "success" | "error" | "disabled";

type ConsultaAlerta = {
  created_at: string;
  error_message: string | null;
  id: string;
  id_consult: string | null;
  license_plate: string;
  prefeitura_id: string;
  provider: string;
  renavam: string;
  request_payload: Record<string, unknown> | null;
  response_payload: Record<string, unknown> | null;
  status: ConsultaStatus;
  updated_at: string;
  veiculo_id: string | null;
  frota_veiculos: {
    marca: string;
    modelo: string;
    placa: string;
    status: string;
  } | null;
  prefeituras: {
    nome: string;
  } | null;
};

const statusFilters = [
  { label: "Todos", value: undefined },
  { label: "Processando", value: "processing" },
  { label: "Falhas", value: "error" },
  { label: "Concluídas", value: "success" },
];

export default async function AlertasPage({ searchParams }: PageProps) {
  const profile = await requireUserProfile();
  const params = await searchParams;
  const prefeituraId =
    profile.role === "bdl_admin"
      ? params.prefeitura
      : profile.prefeitura_id ?? undefined;
  const frotasData = await getFrotasData({ prefeituraId });
  const selectedPrefeituraId = prefeituraId ?? frotasData.selectedPrefeituraId;
  const consultas = await getVehicleConsultAlerts({
    prefeituraId: selectedPrefeituraId,
    query: params.q,
    status: params.status,
  });
  const totalProcessing = consultas.filter(
    (consulta) => consulta.status === "processing"
  ).length;
  const totalErrors = consultas.filter(
    (consulta) => consulta.status === "error"
  ).length;

  return (
    <FrotasShell
      active="alertas"
      actions={
        <AlertasToolbar
          params={params}
          selectedPrefeituraId={selectedPrefeituraId}
        />
      }
      icon={Bell}
      prefeituras={frotasData.prefeituras}
      profile={profile}
      selectedPrefeituraId={selectedPrefeituraId}
      title="Alertas"
    >
      <main className="flex flex-1 flex-col gap-3 p-4">
        <div className="grid gap-3 md:grid-cols-3">
          <StatusSummary
            icon={Loader2}
            label="Em processamento"
            value={String(totalProcessing)}
            variant="processing"
          />
          <StatusSummary
            icon={CircleX}
            label="Falhas"
            value={String(totalErrors)}
            variant="error"
          />
          <StatusSummary
            icon={Bell}
            label="Eventos monitorados"
            value={String(consultas.length)}
            variant="neutral"
          />
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Car className="size-4 text-muted-foreground" />
                Consultas de veículos
              </CardTitle>
              <Badge variant="outline">{consultas.length} registro(s)</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {consultas.length ? (
              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Status</TableHead>
                      <TableHead>Veículo</TableHead>
                      <TableHead>Consulta</TableHead>
                      <TableHead>Tempo</TableHead>
                      <TableHead>Mensagem</TableHead>
                      <TableHead className="w-[64px] text-right">
                        Ação
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {consultas.map((consulta) => (
                      <TableRow key={consulta.id}>
                        <TableCell>
                          <ConsultaStatusBadge status={consulta.status} />
                        </TableCell>
                        <TableCell>
                          <div className="min-w-[180px]">
                            <div className="font-medium">
                              {consulta.frota_veiculos?.placa ??
                                consulta.license_plate}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatVehicleLabel(consulta)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[260px] space-y-1">
                            <div className="truncate font-mono text-xs">
                              {consulta.id_consult ?? consulta.id}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatDateTime(consulta.created_at)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm">
                            <Clock3 className="size-4 text-muted-foreground" />
                            {formatElapsed(consulta.created_at, consulta.updated_at)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[340px] truncate text-sm">
                            {getConsultaMessage(consulta)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {consulta.veiculo_id ? (
                            <Tooltip>
                              <TooltipTrigger
                                render={
                                  <Link
                                    href={`/frotas/veiculos/${consulta.veiculo_id}`}
                                    className={buttonVariants({
                                      variant: "ghost",
                                      size: "icon-sm",
                                    })}
                                    aria-label="Abrir veículo"
                                  >
                                    <ExternalLink className="size-4" />
                                  </Link>
                                }
                              />
                              <TooltipContent>Abrir veículo</TooltipContent>
                            </Tooltip>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex min-h-[280px] flex-col items-center justify-center rounded-lg border bg-muted/20 p-8 text-center">
                <div className="flex size-12 items-center justify-center rounded-lg border bg-background">
                  <Bell className="size-6 text-muted-foreground" />
                </div>
                <h3 className="mt-4 text-base font-semibold">
                  Nenhum alerta encontrado
                </h3>
                <p className="mt-1 max-w-md text-sm text-muted-foreground">
                  As consultas automáticas de veículos aparecerão aqui quando
                  forem iniciadas, concluídas ou retornarem falha.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </FrotasShell>
  );
}

function AlertasToolbar({
  params,
  selectedPrefeituraId,
}: {
  params: Awaited<PageProps["searchParams"]>;
  selectedPrefeituraId?: string;
}) {
  const hasActiveFilters = Boolean(params.q?.trim() || params.status);
  const buildHref = (status?: string | null) => {
    const query = new URLSearchParams();

    if (params.q?.trim()) {
      query.set("q", params.q.trim());
    }

    if (status) {
      query.set("status", status);
    }

    if (selectedPrefeituraId) {
      query.set("prefeitura", selectedPrefeituraId);
    }

    const queryString = query.toString();
    return `/frotas/alertas${queryString ? `?${queryString}` : ""}`;
  };

  return (
    <div className="flex w-full min-w-0 items-center justify-end gap-2">
      <form className="hidden min-w-0 shrink-0 gap-2 xl:flex">
        <div className="relative w-[320px] min-w-0">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-9 pl-9"
            defaultValue={params.q}
            name="q"
            placeholder="Buscar placa ou consulta"
          />
        </div>
        {params.status ? (
          <input type="hidden" name="status" value={params.status} />
        ) : null}
        {selectedPrefeituraId ? (
          <input type="hidden" name="prefeitura" value={selectedPrefeituraId} />
        ) : null}
        {hasActiveFilters ? (
          <Link
            href={selectedPrefeituraId ? `/frotas/alertas?prefeitura=${selectedPrefeituraId}` : "/frotas/alertas"}
            className={buttonVariants({
              variant: "outline",
              className: "h-9 gap-2",
            })}
          >
            <X className="size-4" />
            Limpar
          </Link>
        ) : (
          <Button type="submit" variant="outline" className="h-9">
            <Search className="size-4" />
            Filtrar
          </Button>
        )}
      </form>

      <div className="hidden shrink-0 gap-1 rounded-lg bg-muted p-1 lg:flex">
        {statusFilters.map((filter) => {
          const isActive = filter.value
            ? params.status === filter.value
            : !params.status;

          return (
            <Link
              key={filter.label}
              href={buildHref(filter.value ?? null)}
              className={buttonVariants({
                variant: isActive ? "default" : "ghost",
                size: "sm",
                className: isActive
                  ? "h-7 shrink-0 px-2 text-xs shadow-sm"
                  : "h-7 shrink-0 px-2 text-xs text-muted-foreground",
              })}
            >
              {filter.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

async function getVehicleConsultAlerts({
  prefeituraId,
  query,
  status,
}: {
  prefeituraId?: string;
  query?: string;
  status?: string;
}) {
  const supabase = createSupabaseServerClient();
  let dbQuery = supabase
    .from("frota_debito_consultas")
    .select(
      "id,prefeitura_id,veiculo_id,provider,id_consult,status,state,license_plate,renavam,request_payload,response_payload,error_message,created_at,updated_at,frota_veiculos(placa,marca,modelo,status),prefeituras(nome)"
    )
    .eq("provider", "plexi")
    .order("created_at", { ascending: false })
    .limit(80);

  if (prefeituraId) {
    dbQuery = dbQuery.eq("prefeitura_id", prefeituraId);
  }

  if (status && status !== "all") {
    dbQuery = dbQuery.eq("status", status);
  }

  const { data, error } = await dbQuery;

  if (error) {
    throw new Error(error.message);
  }

  const normalizedQuery = query?.trim().toLowerCase();
  const rows = (data ?? []) as unknown as ConsultaAlerta[];

  if (!normalizedQuery) {
    return rows;
  }

  return rows.filter((consulta) =>
    [
      consulta.license_plate,
      consulta.renavam,
      consulta.id_consult,
      consulta.error_message,
      consulta.frota_veiculos?.marca,
      consulta.frota_veiculos?.modelo,
    ]
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery)
  );
}

function ConsultaStatusBadge({ status }: { status: ConsultaStatus }) {
  const styles: Record<ConsultaStatus, string> = {
    disabled: "border-zinc-200 bg-zinc-100 text-zinc-700 hover:bg-zinc-100",
    error: "border-red-200 bg-red-50 text-red-700 hover:bg-red-50",
    pending: "border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-50",
    processing: "border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-50",
    success:
      "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50",
  };
  const labels: Record<ConsultaStatus, string> = {
    disabled: "Desativada",
    error: "Falha",
    pending: "Pendente",
    processing: "Processando",
    success: "Concluída",
  };
  const icons = {
    disabled: CircleX,
    error: CircleX,
    pending: Loader2,
    processing: Loader2,
    success: CircleCheck,
  } satisfies Record<ConsultaStatus, typeof CircleCheck>;
  const Icon = icons[status];

  return (
    <Badge variant="outline" className={styles[status]}>
      <Icon
        className={
          status === "processing" || status === "pending"
            ? "size-3.5 animate-spin"
            : "size-3.5"
        }
      />
      {labels[status]}
    </Badge>
  );
}

function StatusSummary({
  icon: Icon,
  label,
  value,
  variant,
}: {
  icon: typeof Bell;
  label: string;
  value: string;
  variant: "error" | "neutral" | "processing";
}) {
  const styles = {
    error: "border-red-100 bg-red-50/70 text-red-700",
    neutral: "border-border bg-card text-foreground",
    processing: "border-sky-100 bg-sky-50/70 text-sky-700",
  };

  return (
    <Card className={styles[variant]}>
      <CardContent className="flex items-center justify-between gap-3 p-4">
        <div>
          <div className="text-sm text-muted-foreground">{label}</div>
          <div className="mt-1 text-2xl font-semibold">{value}</div>
        </div>
        <div className="flex size-10 items-center justify-center rounded-lg border bg-background/80">
          <Icon className="size-5" />
        </div>
      </CardContent>
    </Card>
  );
}

function formatVehicleLabel(consulta: ConsultaAlerta) {
  const vehicle = consulta.frota_veiculos;

  if (!vehicle) {
    return `Renavam ${consulta.renavam}`;
  }

  return `${vehicle.marca} · ${vehicle.modelo}`;
}

function getConsultaMessage(consulta: ConsultaAlerta) {
  if (consulta.error_message) {
    return consulta.error_message;
  }

  if (consulta.status === "processing") {
    return "Aguardando retorno da consulta automática.";
  }

  if (consulta.status === "success") {
    return "Dados do veículo gravados com sucesso.";
  }

  return "Consulta registrada.";
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

function formatElapsed(start: string, end: string) {
  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();
  const minutes = Math.max(0, Math.round((endTime - startTime) / 60000));

  if (minutes < 1) {
    return "menos de 1 min";
  }

  if (minutes === 1) {
    return "1 min";
  }

  return `${minutes} min`;
}
