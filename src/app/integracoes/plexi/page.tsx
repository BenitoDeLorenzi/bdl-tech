import Link from "next/link";
import {
  Activity,
  Bell,
  Car,
  CircleCheck,
  CircleX,
  Clock3,
  ExternalLink,
  KeyRound,
  Loader2,
  PlugZap,
  Search,
  ShieldCheck,
  Webhook,
  X,
} from "lucide-react";

import { AdminShell } from "@/components/admin-shell";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
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
import { requireRole } from "@/lib/auth-data";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    q?: string;
    status?: string;
  }>;
};

type PlexiConsultaStatus =
  | "disabled"
  | "error"
  | "pending"
  | "processing"
  | "success";

type PlexiConsulta = {
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
  status: PlexiConsultaStatus;
  updated_at: string;
  veiculo_id: string | null;
  frota_veiculos: {
    marca: string | null;
    modelo: string | null;
    placa: string | null;
    status: string | null;
  } | null;
  prefeituras: {
    nome: string;
  } | null;
};

type PlexiWebhookLog = {
  consulta_id: string | null;
  created_at: string;
  id: string;
  message: string | null;
  request_id: string | null;
  status: string;
};

const statusFilters = [
  { label: "Todos", value: undefined },
  { label: "Processando", value: "processing" },
  { label: "Falhas", value: "error" },
  { label: "Concluídas", value: "success" },
];

export default async function PlexiIntegracaoPage({ searchParams }: PageProps) {
  const profile = await requireRole(["bdl_admin"]);
  const params = await searchParams;
  const [{ consultas, logs }, certificateStatus] = await Promise.all([
    getPlexiDashboardData({
      query: params.q,
      status: params.status,
    }),
    getPlexiCertificateStatus(),
  ]);
  const processingCount = consultas.filter(
    (consulta) => consulta.status === "processing"
  ).length;
  const errorCount = consultas.filter((consulta) => consulta.status === "error")
    .length;
  const successCount = consultas.filter(
    (consulta) => consulta.status === "success"
  ).length;
  const lastWebhook = logs[0];
  const hasActiveFilters = Boolean(params.q?.trim() || params.status);

  return (
    <AdminShell
      active="integracoes"
      actions={
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
          <form className="flex min-w-0 shrink-0 justify-end gap-2">
            <div className="relative min-w-0 w-[320px]">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="h-9 pl-9"
                defaultValue={params.q}
                name="q"
                placeholder="Buscar placa, renavam ou requestId"
              />
            </div>
            {params.status ? (
              <input type="hidden" name="status" value={params.status} />
            ) : null}
            {hasActiveFilters ? (
              <Link
                href="/integracoes/plexi"
                className={buttonVariants({
                  variant: "outline",
                  className: "h-9 gap-2",
                })}
              >
                <X className="size-4" />
                Limpar
              </Link>
            ) : (
              <button
                type="submit"
                className={buttonVariants({
                  variant: "outline",
                  className: "h-9 gap-2",
                })}
              >
                <Search className="size-4" />
                Filtrar
              </button>
            )}
          </form>

          <div className="hidden shrink-0 gap-1 rounded-lg bg-muted p-1 lg:flex">
            {statusFilters.map((filter) => {
              const isActive = filter.value
                ? params.status === filter.value
                : !params.status;
              const href = buildFilterHref(params.q, filter.value);

              return (
                <Link
                  key={filter.label}
                  href={href}
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
      }
      icon={PlugZap}
      profile={profile}
      title="Integração Plexi"
    >
      <main className="flex flex-1 flex-col gap-3 p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <StatusCard
            icon={KeyRound}
            label="Certificado"
            tone={certificateStatus.ok ? "success" : "error"}
            value={certificateStatus.label}
          />
          <StatusCard
            icon={Webhook}
            label="Último callback"
            tone={lastWebhook ? "success" : "neutral"}
            value={lastWebhook ? formatDateTime(lastWebhook.created_at) : "Sem retorno"}
          />
          <StatusCard
            icon={Loader2}
            label="Processando"
            tone="processing"
            value={String(processingCount)}
          />
          <StatusCard
            icon={CircleX}
            label="Falhas"
            tone={errorCount ? "error" : "success"}
            value={String(errorCount)}
          />
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Car className="size-4 text-muted-foreground" />
                Consultas veiculares
              </CardTitle>
              <div className="flex items-center gap-1.5">
                <Badge variant="outline">{consultas.length} registros</Badge>
                <Badge
                  variant="outline"
                  className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50"
                >
                  {successCount} concluídas
                </Badge>
              </div>
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
                      <TableHead>Prefeitura</TableHead>
                      <TableHead>RequestId</TableHead>
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
                          <PlexiStatusBadge status={consulta.status} />
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
                          <div className="min-w-[180px] truncate text-sm">
                            {consulta.prefeituras?.nome ?? "-"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[250px] truncate font-mono text-xs">
                            {consulta.id_consult ?? consulta.id}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatDateTime(consulta.created_at)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm">
                            <Clock3 className="size-4 text-muted-foreground" />
                            {formatElapsed(
                              consulta.created_at,
                              consulta.updated_at
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[320px] truncate text-sm">
                            {getConsultaMessage(consulta)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {consulta.veiculo_id ? (
                            <Link
                              aria-label="Abrir veículo"
                              className={buttonVariants({
                                variant: "ghost",
                                size: "icon-sm",
                              })}
                              href={`/frotas/veiculos/${consulta.veiculo_id}`}
                              target="_blank"
                            >
                              <ExternalLink className="size-4" />
                            </Link>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <EmptyState />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Bell className="size-4 text-muted-foreground" />
                Últimos webhooks
              </CardTitle>
              <Badge variant="outline">{logs.length} eventos</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {logs.length ? (
              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Status</TableHead>
                      <TableHead>RequestId</TableHead>
                      <TableHead>Mensagem</TableHead>
                      <TableHead className="text-right">Recebido em</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          <WebhookStatusBadge status={log.status} />
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[320px] truncate font-mono text-xs">
                            {log.request_id ?? "-"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[520px] truncate text-sm">
                            {log.message ?? "Callback recebido."}
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {formatDateTime(log.created_at)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex min-h-[180px] items-center justify-center rounded-lg border bg-muted/20 text-sm text-muted-foreground">
                Nenhum webhook recebido ainda.
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </AdminShell>
  );
}

async function getPlexiDashboardData({
  query,
  status,
}: {
  query?: string;
  status?: string;
}) {
  const supabase = createSupabaseServerClient();
  let consultasQuery = supabase
    .from("frota_debito_consultas")
    .select(
      "id,prefeitura_id,veiculo_id,provider,id_consult,status,state,license_plate,renavam,request_payload,response_payload,error_message,created_at,updated_at,frota_veiculos(placa,marca,modelo,status),prefeituras(nome)"
    )
    .eq("provider", "plexi")
    .order("created_at", { ascending: false })
    .limit(100);

  if (status && status !== "all") {
    consultasQuery = consultasQuery.eq("status", status);
  }

  const [{ data: consultasData, error: consultasError }, { data: logsData, error: logsError }] =
    await Promise.all([
      consultasQuery,
      supabase
        .from("frota_plexi_webhook_logs")
        .select("id,request_id,consulta_id,status,message,created_at")
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

  if (consultasError) {
    throw new Error(consultasError.message);
  }

  if (logsError) {
    throw new Error(logsError.message);
  }

  const normalizedQuery = query?.trim().toLowerCase();
  const rows = (consultasData ?? []) as unknown as PlexiConsulta[];
  const consultas = normalizedQuery
    ? rows.filter((consulta) =>
        [
          consulta.license_plate,
          consulta.renavam,
          consulta.id_consult,
          consulta.error_message,
          consulta.prefeituras?.nome,
          consulta.frota_veiculos?.marca,
          consulta.frota_veiculos?.modelo,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery)
      )
    : rows;

  return {
    consultas,
    logs: (logsData ?? []) as unknown as PlexiWebhookLog[],
  };
}

async function getPlexiCertificateStatus() {
  const token = process.env.PLEXI_API_TOKEN;
  const secretName = process.env.PLEXI_SECRET_NAME;

  if (!token || !secretName) {
    return {
      label: "Incompleto",
      ok: false,
    };
  }

  return {
    label: secretName,
    ok: true,
  };
}

function buildFilterHref(query?: string, status?: string) {
  const params = new URLSearchParams();

  if (query?.trim()) {
    params.set("q", query.trim());
  }

  if (status) {
    params.set("status", status);
  }

  const queryString = params.toString();
  return `/integracoes/plexi${queryString ? `?${queryString}` : ""}`;
}

function StatusCard({
  icon: Icon,
  label,
  tone,
  value,
}: {
  icon: typeof Activity;
  label: string;
  tone: "error" | "neutral" | "processing" | "success";
  value: string;
}) {
  const styles = {
    error: "border-red-100 bg-red-50/70 text-red-700",
    neutral: "border-border bg-card text-foreground",
    processing: "border-sky-100 bg-sky-50/70 text-sky-700",
    success: "border-emerald-100 bg-emerald-50/70 text-emerald-700",
  };

  return (
    <Card className={styles[tone]}>
      <CardContent className="flex items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <div className="text-sm text-muted-foreground">{label}</div>
          <div className="mt-1 truncate text-2xl font-semibold">{value}</div>
        </div>
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border bg-background/80">
          <Icon className="size-5" />
        </div>
      </CardContent>
    </Card>
  );
}

function PlexiStatusBadge({ status }: { status: PlexiConsultaStatus }) {
  const styles: Record<PlexiConsultaStatus, string> = {
    disabled: "border-zinc-200 bg-zinc-100 text-zinc-700 hover:bg-zinc-100",
    error: "border-red-200 bg-red-50 text-red-700 hover:bg-red-50",
    pending: "border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-50",
    processing: "border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-50",
    success:
      "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50",
  };
  const labels: Record<PlexiConsultaStatus, string> = {
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
  } satisfies Record<PlexiConsultaStatus, typeof CircleCheck>;
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

function WebhookStatusBadge({ status }: { status: string }) {
  const isGood = ["received", "success", "not_found"].includes(status);
  const Icon = isGood ? CircleCheck : CircleX;

  return (
    <Badge
      variant="outline"
      className={
        isGood
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50"
          : "border-red-200 bg-red-50 text-red-700 hover:bg-red-50"
      }
    >
      <Icon className="size-3.5" />
      {formatWebhookStatus(status)}
    </Badge>
  );
}

function EmptyState() {
  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center rounded-lg border bg-muted/20 p-8 text-center">
      <div className="flex size-12 items-center justify-center rounded-lg border bg-background">
        <PlugZap className="size-6 text-muted-foreground" />
      </div>
      <h3 className="mt-4 text-base font-semibold">
        Nenhuma consulta encontrada
      </h3>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">
        As consultas automáticas de veículos aparecerão aqui quando forem
        iniciadas pelo módulo de Frotas Públicas.
      </p>
    </div>
  );
}

function formatVehicleLabel(consulta: PlexiConsulta) {
  const marca = consulta.frota_veiculos?.marca;
  const modelo = consulta.frota_veiculos?.modelo;

  if (marca || modelo) {
    return [marca, modelo].filter(Boolean).join(" · ");
  }

  return `Renavam ${consulta.renavam}`;
}

function getConsultaMessage(consulta: PlexiConsulta) {
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

function formatWebhookStatus(status: string) {
  const labels: Record<string, string> = {
    error: "Erro",
    invalid: "Inválido",
    not_found: "Não vinculado",
    persist_error: "Erro ao gravar",
    received: "Recebido",
    success: "Gravado",
  };

  return labels[status] ?? status;
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
