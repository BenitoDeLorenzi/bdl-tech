import {
  AlertTriangle,
  CalendarClock,
  Car,
  CheckCircle2,
  CircleGauge,
  Clock3,
  Fuel,
  ShieldAlert,
  TrendingUp,
  Wrench,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireUserProfile } from "@/lib/auth-data";
import {
  formatAbastecimentoStatus,
  formatFrotaDate,
  formatFrotaDaysRemaining,
  formatManutencaoStatus,
  formatVencimentoTipo,
  formatVeiculoStatus,
  getAbastecimentosData,
  getManutencoesData,
  type AbastecimentoStatus,
  type FrotaAbastecimento,
  type FrotaManutencao,
  type FrotaVencimento,
  type VeiculoStatus,
} from "@/lib/frotas-data";
import { cn } from "@/lib/utils";
import { FrotasShell } from "./frotas-shell";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    prefeitura?: string;
  }>;
};

const vehicleStatusMeta: Record<
  VeiculoStatus,
  {
    badge: string;
    label: string;
  }
> = {
  active: {
    badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
    label: "Ativos",
  },
  inactive: {
    badge: "border-zinc-200 bg-zinc-50 text-zinc-700",
    label: "Inativos",
  },
  maintenance: {
    badge: "border-amber-200 bg-amber-50 text-amber-700",
    label: "Em manutenção",
  },
};

const abastecimentoStatusMeta: Record<
  AbastecimentoStatus,
  {
    badge: string;
    label: string;
  }
> = {
  cancelled: {
    badge: "border-zinc-200 bg-zinc-50 text-zinc-700",
    label: "Canceladas",
  },
  completed: {
    badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
    label: "Concluídas",
  },
  expired: {
    badge: "border-red-200 bg-red-50 text-red-700",
    label: "Vencidas",
  },
  issued: {
    badge: "border-amber-200 bg-amber-50 text-amber-700",
    label: "Pendentes",
  },
};

export default async function FrotasDashboardPage({ searchParams }: PageProps) {
  const profile = await requireUserProfile();
  const params = await searchParams;
  const prefeituraId =
    profile.role === "bdl_admin"
      ? params.prefeitura
      : profile.prefeitura_id ?? undefined;

  const [manutencoesData, abastecimentosData] = await Promise.all([
    getManutencoesData({ prefeituraId }),
    getAbastecimentosData({ prefeituraId }),
  ]);
  const data = abastecimentosData;
  const selectedPrefeitura = data.prefeituras.find(
    (prefeitura) => prefeitura.id === data.selectedPrefeituraId
  );
  const manutencoes = manutencoesData.manutencoes;
  const abastecimentos = abastecimentosData.abastecimentos;
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 30);

  const vencimentosCriticos = data.vencimentos
    .filter((vencimento) => vencimento.status !== "paid")
    .filter((vencimento) => vencimento.dias_restantes <= 30)
    .sort((a, b) => a.dias_restantes - b.dias_restantes)
    .slice(0, 5);
  const manutencoesAbertas = manutencoes
    .filter((manutencao) => manutencao.status === "open")
    .slice(0, 5);
  const ultimosAbastecimentos = abastecimentos
    .filter((abastecimento) => abastecimento.status === "completed")
    .slice(0, 5);
  const abastecimentosRecentes = abastecimentos.filter((abastecimento) => {
    if (abastecimento.status !== "completed") {
      return false;
    }

    const date = new Date(
      abastecimento.completed_at ?? `${abastecimento.data_abastecimento}T00:00:00`
    );

    return date >= thirtyDaysAgo;
  });

  const valorAbastecimento30Dias = abastecimentosRecentes.reduce(
    (total, abastecimento) => total + getAbastecimentoTotal(abastecimento),
    0
  );
  const litros30Dias = abastecimentosRecentes.reduce(
    (total, abastecimento) =>
      total + (abastecimento.litros ?? 0) + (abastecimento.arla_litros ?? 0),
    0
  );
  const ordensPendentes = abastecimentos.filter(
    (abastecimento) =>
      abastecimento.status === "issued" &&
      (!abastecimento.expires_at || new Date(abastecimento.expires_at) >= now)
  ).length;
  const ordensVencidas = abastecimentos.filter(
    (abastecimento) =>
      abastecimento.status === "expired" ||
      (abastecimento.status === "issued" &&
        abastecimento.expires_at &&
        new Date(abastecimento.expires_at) < now)
  ).length;

  const totalVeiculos = data.veiculos.length;
  const activeVehicles = data.veiculos.filter(
    (veiculo) => veiculo.status === "active"
  ).length;
  const maintenanceVehicles = data.veiculos.filter(
    (veiculo) => veiculo.status === "maintenance"
  ).length;
  const inactiveVehicles = data.veiculos.filter(
    (veiculo) => veiculo.status === "inactive"
  ).length;
  const fleetAvailability =
    totalVeiculos > 0 ? Math.round((activeVehicles / totalVeiculos) * 100) : 0;

  return (
    <FrotasShell
      active="dashboard"
      icon={CircleGauge}
      prefeituras={data.prefeituras}
      profile={profile}
      selectedPrefeituraId={data.selectedPrefeituraId}
      title="Visão geral"
    >
      <main className="flex flex-1 flex-col gap-4 p-4">
        <Card className="border-foreground/10 bg-gradient-to-r from-card via-card to-muted/40">
          <CardContent className="flex flex-col gap-4 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CircleGauge className="size-4" />
                Frotas Públicas
              </div>
              <h2 className="mt-1 truncate text-2xl font-semibold">
                {formatPrefeituraName(selectedPrefeitura?.nome ?? "Prefeitura")}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Panorama operacional da frota municipal com base nos registros
                atuais.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-right">
              <HeroStat label="Disponibilidade" value={`${fleetAvailability}%`} />
              <HeroStat label="Veículos" value={totalVeiculos.toString()} />
              <HeroStat label="Pendências" value={(data.metricas.vencidos + ordensVencidas).toString()} />
            </div>
          </CardContent>
        </Card>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <MetricCard
            icon={Car}
            label="Frota cadastrada"
            note={`${activeVehicles} ativo(s)`}
            value={totalVeiculos.toString()}
          />
          <MetricCard
            icon={Wrench}
            label="Em manutenção"
            note={`${manutencoesAbertas.length} ordem(ns) aberta(s)`}
            value={maintenanceVehicles.toString()}
            variant="warning"
          />
          <MetricCard
            icon={CalendarClock}
            label="Vencendo em 30 dias"
            note={`${data.metricas.vencidos} vencido(s)`}
            value={data.metricas.vencendo.toString()}
            variant={data.metricas.vencidos > 0 ? "danger" : "default"}
          />
          <MetricCard
            icon={Fuel}
            label="Ordens pendentes"
            note={`${ordensVencidas} vencida(s)`}
            value={ordensPendentes.toString()}
            variant={ordensVencidas > 0 ? "danger" : "warning"}
          />
          <MetricCard
            icon={TrendingUp}
            label="Abastecimento 30 dias"
            note={`${formatDecimal(litros30Dias)} L registrados`}
            value={formatCurrency(valorAbastecimento30Dias)}
          />
        </section>

        <section className="grid gap-4 xl:grid-cols-[1fr_1.25fr]">
          <Card>
            <CardHeader>
              <CardTitle>Situação da frota</CardTitle>
              <CardDescription>
                Distribuição dos veículos cadastrados por status operacional.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FleetStatusRow
                count={activeVehicles}
                status="active"
                total={totalVeiculos}
              />
              <FleetStatusRow
                count={maintenanceVehicles}
                status="maintenance"
                total={totalVeiculos}
              />
              <FleetStatusRow
                count={inactiveVehicles}
                status="inactive"
                total={totalVeiculos}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Vencimentos críticos</CardTitle>
              <CardDescription>
                IPVA, licenciamento e seguro vencidos ou próximos do prazo.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {vencimentosCriticos.length ? (
                <div className="space-y-2">
                  {vencimentosCriticos.map((vencimento) => (
                    <VencimentoRow
                      key={vencimento.id}
                      vencimento={vencimento}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={CheckCircle2}
                  text="Nenhum vencimento crítico para os próximos 30 dias."
                />
              )}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Manutenções em andamento</CardTitle>
              <CardDescription>
                Ordens abertas, responsáveis e veículos atualmente em cuidado.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {manutencoesAbertas.length ? (
                <div className="space-y-2">
                  {manutencoesAbertas.map((manutencao) => (
                    <ManutencaoRow
                      key={manutencao.id}
                      manutencao={manutencao}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={CheckCircle2}
                  text="Nenhuma manutenção em andamento."
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Abastecimento</CardTitle>
              <CardDescription>
                Leitura das ordens e dos abastecimentos concluídos recentemente.
              </CardDescription>
              <CardAction>
                <Badge
                  className="border-sky-200 bg-sky-50 text-sky-700"
                  variant="outline"
                >
                  {abastecimentosRecentes.length} em 30 dias
                </Badge>
              </CardAction>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2 sm:grid-cols-3">
                <SmallStat label="Pendentes" value={ordensPendentes} />
                <SmallStat label="Vencidas" value={ordensVencidas} tone="danger" />
                <SmallStat
                  label="Concluídas"
                  value={
                    abastecimentos.filter(
                      (abastecimento) => abastecimento.status === "completed"
                    ).length
                  }
                  tone="success"
                />
              </div>

              {ultimosAbastecimentos.length ? (
                <div className="space-y-2">
                  {ultimosAbastecimentos.map((abastecimento) => (
                    <AbastecimentoRow
                      abastecimento={abastecimento}
                      key={abastecimento.id}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={Fuel}
                  text="Nenhum abastecimento concluído registrado."
                />
              )}
            </CardContent>
          </Card>
        </section>
      </main>
    </FrotasShell>
  );
}

type MetricCardProps = {
  icon: typeof Car;
  label: string;
  note: string;
  value: string;
  variant?: "default" | "danger" | "warning";
};

function MetricCard({
  icon: Icon,
  label,
  note,
  value,
  variant = "default",
}: MetricCardProps) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 py-4">
        <div
          className={cn(
            "flex size-10 items-center justify-center rounded-lg border",
            variant === "danger"
              ? "border-red-200 bg-red-50 text-red-700"
              : variant === "warning"
                ? "border-amber-200 bg-amber-50 text-amber-700"
                : "border-sky-200 bg-sky-50 text-sky-700"
          )}
        >
          <Icon className="size-5" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-xl font-semibold">{value}</div>
          <div className="truncate text-xs font-medium text-muted-foreground">
            {label}
          </div>
          <div className="truncate text-xs text-muted-foreground">{note}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-background/80 px-4 py-3">
      <div className="text-lg font-semibold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function FleetStatusRow({
  count,
  status,
  total,
}: {
  count: number;
  status: VeiculoStatus;
  total: number;
}) {
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
  const meta = vehicleStatusMeta[status];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Badge className={meta.badge} variant="outline">
            {formatVeiculoStatus(status)}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {count} veículo(s)
          </span>
        </div>
        <span className="text-sm font-medium">{percentage}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full",
            status === "active"
              ? "bg-emerald-500"
              : status === "maintenance"
                ? "bg-amber-500"
                : "bg-zinc-400"
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function VencimentoRow({ vencimento }: { vencimento: FrotaVencimento }) {
  const isExpired = vencimento.dias_restantes < 0;

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border bg-background px-3 py-2">
      <div className="flex min-w-0 items-center gap-3">
        <div
          className={cn(
            "flex size-9 items-center justify-center rounded-lg border",
            isExpired
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-amber-200 bg-amber-50 text-amber-700"
          )}
        >
          {isExpired ? (
            <ShieldAlert className="size-4" />
          ) : (
            <Clock3 className="size-4" />
          )}
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">
            {vencimento.modelo} · {vencimento.placa}
          </div>
          <div className="truncate text-xs text-muted-foreground">
            {formatVencimentoTipo(vencimento.tipo)} ·{" "}
            {formatFrotaDate(vencimento.data_vencimento)}
          </div>
        </div>
      </div>
      <Badge
        className={
          isExpired
            ? "border-red-200 bg-red-50 text-red-700"
            : "border-amber-200 bg-amber-50 text-amber-700"
        }
        variant="outline"
      >
        {formatFrotaDaysRemaining(vencimento.dias_restantes)}
      </Badge>
    </div>
  );
}

function ManutencaoRow({ manutencao }: { manutencao: FrotaManutencao }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border bg-background px-3 py-2">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 text-amber-700">
          <Wrench className="size-4" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">
            {manutencao.modelo} · {manutencao.placa}
          </div>
          <div className="truncate text-xs text-muted-foreground">
            {manutencao.tipo} · {manutencao.responsavel || "Sem responsável"}
          </div>
        </div>
      </div>
      <div className="text-right">
        <Badge className="border-amber-200 bg-amber-50 text-amber-700" variant="outline">
          {formatManutencaoStatus(manutencao.status)}
        </Badge>
        <div className="mt-1 text-xs text-muted-foreground">
          {formatFrotaDate(manutencao.data_entrada)}
        </div>
      </div>
    </div>
  );
}

function AbastecimentoRow({
  abastecimento,
}: {
  abastecimento: FrotaAbastecimento;
}) {
  const meta = abastecimentoStatusMeta[abastecimento.status];

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border bg-background px-3 py-2">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-lg border border-sky-200 bg-sky-50 text-sky-700">
          <Fuel className="size-4" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">
            {abastecimento.numero_ordem} · {abastecimento.placa}
          </div>
          <div className="truncate text-xs text-muted-foreground">
            {abastecimento.posto_nome || "Posto não informado"} ·{" "}
            {formatFrotaDate(abastecimento.data_abastecimento)}
          </div>
        </div>
      </div>
      <div className="text-right">
        <div className="text-sm font-semibold">
          {formatCurrency(getAbastecimentoTotal(abastecimento))}
        </div>
        <Badge className={meta.badge} variant="outline">
          {formatAbastecimentoStatus(abastecimento.status)}
        </Badge>
      </div>
    </div>
  );
}

function SmallStat({
  label,
  tone = "default",
  value,
}: {
  label: string;
  tone?: "danger" | "default" | "success";
  value: number;
}) {
  return (
    <div className="rounded-lg border bg-muted/30 px-3 py-2">
      <div
        className={cn(
          "text-lg font-semibold",
          tone === "danger"
            ? "text-red-700"
            : tone === "success"
              ? "text-emerald-700"
              : "text-foreground"
        )}
      >
        {value}
      </div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  text,
}: {
  icon: typeof AlertTriangle;
  text: string;
}) {
  return (
    <div className="flex min-h-24 items-center justify-center rounded-lg border border-dashed bg-muted/20 px-4 text-center text-sm text-muted-foreground">
      <div>
        <Icon className="mx-auto mb-2 size-5" />
        {text}
      </div>
    </div>
  );
}

function getAbastecimentoTotal(abastecimento: FrotaAbastecimento) {
  return (abastecimento.valor_total ?? 0) + (abastecimento.arla_valor_total ?? 0);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    maximumFractionDigits: 2,
    style: "currency",
  }).format(value);
}

function formatDecimal(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  }).format(value);
}

function formatPrefeituraName(name: string) {
  return name
    .replace(/^prefeitura\s+municipal\s+de\s+/i, "Município de ")
    .replace(/^prefeitura\s+municipal\s+da\s+/i, "Município da ")
    .replace(/^prefeitura\s+municipal\s+do\s+/i, "Município do ")
    .replace(/^prefeitura\s+de\s+/i, "Município de ");
}
