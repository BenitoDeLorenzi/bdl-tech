import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, CalendarClock, Car, CheckCircle2, CircleGauge, Fuel, KeyRound, Wrench } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ListMetrics } from "@/components/list-metrics";
import { requireUserProfile } from "@/lib/auth-data";
import { getFrotasPermissionAccess } from "@/lib/frotas-permissions";
import { formatFrotaDate, formatFrotaDaysRemaining, formatVencimentoTipo, getAbastecimentosData, getManutencoesData } from "@/lib/frotas-data";
import { getUsoVeiculosData } from "@/lib/uso-veiculos-data";
import { getDashboardMetrics } from "@/lib/frotas-dashboard-metrics";
import { cn } from "@/lib/utils";
import { FrotasShell } from "./frotas-shell";

export const dynamic = "force-dynamic";
type PageProps = { searchParams: Promise<{ prefeitura?: string }> };
const tones = {
  green: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  blue: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
  amber: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  red: "bg-red-500/10 text-red-700 dark:text-red-400",
};

export default async function FrotasDashboardPage({ searchParams }: PageProps) {
  const profile = await requireUserProfile();
  const params = await searchParams;
  const prefeituraId = profile.role === "bdl_admin" ? params.prefeitura : profile.prefeitura_id ?? undefined;
  const [fuelData, maintenanceData, usageData, access] = await Promise.all([
    getAbastecimentosData({ prefeituraId }), getManutencoesData({ prefeituraId }),
    getUsoVeiculosData({ prefeituraId }), getFrotasPermissionAccess(profile),
  ]);
  const metrics = getDashboardMetrics(fuelData.veiculos, usageData.usos, maintenanceData.manutencoes, fuelData.abastecimentos);
  const debts = fuelData.vencimentos.filter(item => item.status !== "paid" && item.dias_restantes <= 30).sort((a,b) => a.dias_restantes-b.dias_restantes);
  const overdue = debts.filter(item => item.dias_restantes < 0).length;
  const href = (path: string, status?: string) => {
    const query = new URLSearchParams();
    if (fuelData.selectedPrefeituraId) query.set("prefeitura", fuelData.selectedPrefeituraId);
    if (status) query.set("status", status);
    return `${path}${query.size ? `?${query}` : ""}`;
  };
  return (
    <FrotasShell active="dashboard" icon={CircleGauge} prefeituras={fuelData.prefeituras} profile={profile} selectedPrefeituraId={fuelData.selectedPrefeituraId} title="Painel">
      <main className="flex flex-1 flex-col gap-4 p-4">
        <section aria-label="Indicadores da frota" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {access.canViewVeiculos ? <Metric icon={Car} label="Veículos disponíveis" value={String(metrics.available)} note={`${fuelData.veiculos.length} cadastrados · ${metrics.availability}% disponíveis`} tone="green" href={href("/frotas/veiculos")} /> : null}
          {access.canViewUsoVeiculo ? <Metric icon={KeyRound} label="Veículos em uso" value={String(metrics.inUse)} note={`${metrics.openUsages.length} retirada(s) em aberto`} tone="blue" href={href("/frotas/uso-veiculo", "in_use")} /> : null}
          {access.canViewManutencao ? <Metric icon={Wrench} label="Manutenções abertas" value={String(metrics.openMaintenance.length)} note={`${metrics.maintenanceVehicles} veículo(s) em manutenção`} tone="amber" href={href("/frotas/manutencao", "open")} /> : null}
          {access.canViewAbastecimento ? <Metric icon={Fuel} label="Abastecimento · 30 dias" value={currency(metrics.fuelCost)} note={`${metrics.recentFuel.length} concluído(s) · ${metrics.liters.toLocaleString("pt-BR")} L de combustível`} tone="blue" href={href("/frotas/abastecimento")} /> : null}
        </section>

        {(access.canManageVencimentos || access.canViewAbastecimento) ? <Card>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-medium">Precisa de atenção</h2>
              <div className="flex flex-wrap gap-2">
                {access.canManageVencimentos ? <ListMetrics items={[{ label: "Vencidos", value: overdue, tone: overdue ? "warning" : "neutral" }, { label: "A vencer em 30 dias", value: debts.length-overdue, tone: "neutral" }]} /> : null}
              </div>
            </div>
            {access.canViewAbastecimento ? <div className="grid gap-2 sm:grid-cols-2">
              <AttentionLink href={href("/frotas/abastecimento", "issued")} label="Ordens de abastecimento pendentes" count={metrics.pendingFuel} tone="amber" />
              <AttentionLink href={href("/frotas/abastecimento", "expired")} label="Ordens de abastecimento vencidas" count={metrics.expiredFuel} tone="red" />
            </div> : null}
            {access.canManageVencimentos ? (debts.length ? <div className="divide-y rounded-lg border">
              {debts.slice(0,5).map(debt => <Link key={debt.id} href={`/frotas/veiculos/${debt.veiculo_id}/debitos`} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-ring">
                <div className="flex min-w-0 items-center gap-3"><CalendarClock className="size-4 shrink-0 text-muted-foreground" /><div><div className="text-sm font-medium">{debt.modelo} · {debt.placa}</div><div className="text-xs text-muted-foreground">{formatVencimentoTipo(debt.tipo)} · {formatFrotaDate(debt.data_vencimento)}</div></div></div>
                <Badge variant="outline" className={debt.dias_restantes < 0 ? tones.red : tones.amber}>{formatFrotaDaysRemaining(debt.dias_restantes)}</Badge>
              </Link>)}
              {debts.length > 5 ? <p className="px-3 py-2 text-xs text-muted-foreground">Exibindo os 5 prazos mais próximos de {debts.length} débitos.</p> : null}
            </div> : <Empty text="Nenhum débito vencido ou a vencer nos próximos 30 dias." />) : null}
          </CardContent>
        </Card> : null}

        <section aria-label="Operações da frota" className="grid items-start gap-4 xl:grid-cols-2">
          {access.canViewUsoVeiculo ? <Panel title="Retiradas em aberto" href={href("/frotas/uso-veiculo", "in_use")} total={metrics.openUsages.length}>
            {metrics.openUsages.length ? metrics.openUsages.slice(0,5).map(usage => <Operation key={usage.id} icon={KeyRound} tone="blue" model={usage.modelo} vehicle={`${usage.marca} · ${usage.placa}`} detail={`${usage.funcionario_nome}${usage.destino ? ` · ${usage.destino}` : ""}`} trailing={dateTime(usage.data_saida)} />) : <Empty text="Nenhum veículo em uso no momento." />}
          </Panel> : null}
          {access.canViewManutencao ? <Panel title="Manutenções em andamento" href={href("/frotas/manutencao", "open")} total={metrics.openMaintenance.length}>
            {metrics.openMaintenance.length ? metrics.openMaintenance.slice(0,5).map(item => <Operation key={item.id} icon={Wrench} tone="amber" model={item.modelo} vehicle={`${item.marca} · ${item.placa}`} detail={`${item.oficina || "Oficina não informada"} · ${item.descricao}`} trailing={formatFrotaDate(item.data_entrada)} />) : <Empty text="Nenhuma manutenção em andamento." />}
          </Panel> : null}
          {access.canViewAbastecimento ? <div className="xl:col-span-2"><Panel title="Últimos abastecimentos" href={href("/frotas/abastecimento", "completed")}>
            {metrics.completedFuel.length ? <div className="divide-y">{metrics.completedFuel.slice(0,4).map(item => <Operation key={item.id} icon={Fuel} tone="blue" model={item.modelo} vehicle={`${item.marca} · ${item.placa}`} detail={`${item.posto_nome || "Posto não informado"} · ${formatFrotaDate(item.data_abastecimento)}`} trailing={currency(item.valor_total ?? 0)} />)}</div> : <Empty text="Nenhum abastecimento concluído registrado." />}
          </Panel></div> : null}
        </section>
      </main>
    </FrotasShell>
  );
}

function Metric({ icon: Icon, label, value, note, tone, href }: { icon: typeof Car; label: string; value: string; note: string; tone: keyof typeof tones; href: string }) {
  return <Link href={href} className="rounded-xl focus-visible:outline-2 focus-visible:outline-ring"><Card className="h-full transition-colors hover:bg-muted/30"><CardContent className="space-y-3"><div className="flex items-center justify-between gap-2"><span className="text-sm text-muted-foreground">{label}</span><span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", tones[tone])}><Icon className="size-4" /></span></div><div><div className="text-2xl font-semibold tabular-nums tracking-tight">{value}</div><p className="mt-1 text-xs text-muted-foreground">{note}</p></div></CardContent></Card></Link>;
}
function AttentionLink({ href, label, count, tone }: { href: string; label: string; count: number; tone: keyof typeof tones }) {
  return <Link href={href} className={cn("flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm focus-visible:outline-2 focus-visible:outline-ring", count ? tones[tone] : "bg-muted/40 text-muted-foreground")}><span className="text-lg font-semibold tabular-nums">{count}</span><span className="flex-1">{label}</span><ArrowRight className="size-4 shrink-0" /></Link>;
}
function Panel({ title, href, total, children }: { title: string; href: string; total?: number; children: ReactNode }) {
  return <Card><CardContent className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-medium">{title}</h2><Link href={href} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">Ver todos<ArrowRight className="size-3.5" /></Link></div>{total !== undefined ? <ListMetrics items={[{ label: "Em aberto", value: total, tone: total ? "inUse" : "neutral" }]} /> : null}<div>{children}</div></CardContent></Card>;
}
function Operation({ icon: Icon, tone, model, vehicle, detail, trailing }: { icon: typeof Car; tone: keyof typeof tones; model: string; vehicle: string; detail: string; trailing: string }) {
  return <div className="flex items-start gap-3 border-b py-3 last:border-0"><span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", tones[tone])}><Icon className="size-4" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap justify-between gap-x-3 gap-y-1"><span className="text-sm font-medium">{model}</span><span className="text-xs font-medium tabular-nums">{trailing}</span></div><div className="text-xs text-muted-foreground">{vehicle}</div><p className="mt-1 break-words text-xs text-muted-foreground">{detail}</p></div></div>;
}
function Empty({ text }: { text: string }) {
  return <div className="flex items-center gap-2 rounded-lg bg-muted/30 px-3 py-4 text-sm text-muted-foreground"><CheckCircle2 className="size-4 shrink-0" />{text}</div>;
}
function currency(value: number) { return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value); }
function dateTime(value: string) { return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(value)); }
