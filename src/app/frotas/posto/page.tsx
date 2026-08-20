import {
  BadgeCheck,
  Building2,
  CalendarClock,
  Car,
  Clock,
  Fuel,
  LogOut,
  ReceiptText,
  Search,
  SquareCheckBig,
} from "lucide-react";

import { AbastecimentoCompleteForm } from "@/app/frotas/abastecimento-complete-form";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  formatFrotaDate,
  getAbastecimentosData,
  type FrotaAbastecimento,
} from "@/lib/frotas-data";
import { requirePostoSession } from "@/lib/posto-auth";
import { logoutPostoAction } from "./actions";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    q?: string;
  }>;
};

export default async function PortalPostoPage({ searchParams }: PageProps) {
  const session = await requirePostoSession();
  const params = await searchParams;
  const data = await getAbastecimentosData({
    postoId: session.id,
    prefeituraId: session.prefeitura_id,
    query: params.q,
    status: "issued",
  });
  const ordens = data.abastecimentos;
  const prefeitura = data.prefeituras.find(
    (item) => item.id === session.prefeitura_id
  );
  const prefeituraNome = prefeitura?.nome ?? ordens[0]?.prefeitura_nome ?? "Prefeitura";
  const ordensVencendoHoje = ordens.filter((ordem) =>
    isTodayOrPast(ordem.expires_at)
  ).length;
  const veiculosUnicos = new Set(ordens.map((ordem) => ordem.veiculo_id)).size;

  return (
    <main className="min-h-screen bg-muted/30 p-4">
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        <header className="overflow-hidden rounded-xl border bg-background">
          <div className="grid gap-4 p-4 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Fuel className="size-6" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-2xl font-semibold tracking-normal">
                    {session.nome}
                  </h1>
                  <Badge
                    variant="outline"
                    className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50"
                  >
                    <BadgeCheck className="size-3" />
                    Credenciado
                  </Badge>
                </div>
                <p className="mt-1 truncate text-sm text-muted-foreground">
                  CNPJ {formatCnpj(session.cnpj)} · Portal do posto
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:justify-end">
              <div className="flex min-w-0 items-center gap-3 rounded-lg border bg-muted/20 px-3 py-2">
                {prefeitura?.brasao_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={prefeitura.brasao_url}
                    alt={`Brasão de ${prefeituraNome}`}
                    className="size-11 shrink-0 rounded-md object-contain"
                  />
                ) : (
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-md bg-background">
                    <Building2 className="size-5 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">
                    {formatMunicipalityName(prefeituraNome)}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    Frotas Públicas
                  </div>
                </div>
              </div>
              <form action={logoutPostoAction}>
                <Button type="submit" variant="outline" className="h-9 gap-2">
                  <LogOut className="size-4" />
                  Sair
                </Button>
              </form>
            </div>
          </div>
        </header>

        <section className="grid gap-3 md:grid-cols-3">
          <SummaryCard
            icon={ReceiptText}
            label="Ordens pendentes"
            value={String(ordens.length)}
          />
          <SummaryCard
            icon={CalendarClock}
            label="Vencendo hoje"
            value={String(ordensVencendoHoje)}
          />
          <SummaryCard
            icon={Car}
            label="Veículos aguardando"
            value={String(veiculosUnicos)}
          />
        </section>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle>Ordens pendentes</CardTitle>
                <div className="mt-1 text-sm text-muted-foreground">
                  {session.nome} · {ordens.length} ordem(ns)
                </div>
              </div>
              <PortalPostoFilters q={params.q} />
            </div>
          </CardHeader>
          <CardContent>
            {ordens.length ? (
              <div className="grid gap-3">
                {ordens.map((ordem) => (
                  <OrdemPostoCard key={ordem.id} ordem={ordem} />
                ))}
              </div>
            ) : (
              <div className="flex min-h-[280px] flex-col items-center justify-center rounded-lg border bg-muted/20 p-8 text-center">
                <Building2 className="size-10 text-muted-foreground" />
                <h2 className="mt-3 text-base font-semibold">
                  Nenhuma ordem pendente
                </h2>
                <p className="mt-1 max-w-md text-sm text-muted-foreground">
                  Não há abastecimentos aguardando preenchimento para este
                  posto no momento.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Fuel;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-background p-4">
      <div className="flex size-10 items-center justify-center rounded-lg bg-muted/50">
        <Icon className="size-5 text-muted-foreground" />
      </div>
      <div>
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="text-2xl font-semibold tracking-normal">{value}</div>
      </div>
    </div>
  );
}

function PortalPostoFilters({
  q,
}: {
  q?: string;
}) {
  return (
    <form className="flex w-full flex-col gap-2 lg:w-auto lg:min-w-[420px] lg:flex-row">
      <div className="relative min-w-0 flex-1">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="h-9 pl-9"
          name="q"
          placeholder="Buscar por ordem, placa ou veículo"
          defaultValue={q}
        />
      </div>
      <Button type="submit" className="h-9 gap-2">
        <Search className="size-4" />
        Buscar
      </Button>
    </form>
  );
}

function OrdemPostoCard({ ordem }: { ordem: FrotaAbastecimento }) {
  const validade = ordem.expires_at ? formatDateTime(ordem.expires_at) : "-";

  return (
    <div className="grid gap-3 rounded-xl border bg-background p-4 lg:grid-cols-[1fr_auto] lg:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-base font-semibold">{ordem.numero_ordem}</div>
          <Badge
            variant="outline"
            className="border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-50"
          >
            <Clock className="size-3" />
            Pendente
          </Badge>
          {ordem.arla_incluso ? <Badge variant="secondary">ARLA</Badge> : null}
        </div>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted/50">
              <Car className="size-5 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <div className="text-xl font-semibold tracking-normal">
                {ordem.placa}
              </div>
              <div className="truncate text-sm text-muted-foreground">
                {ordem.modelo} · {ordem.marca}
                {ordem.ano ? ` · ${ordem.ano}` : ""}
              </div>
            </div>
          </div>
          <Info label="Validade" value={validade} />
        </div>
        <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
          <Info label="Motorista" value={ordem.motorista} />
          <Info label="Combustível" value={ordem.combustivel} />
          <Info label="Secretaria" value={ordem.secretaria} />
        </div>
        <Separator className="my-3" />
        <div className="text-xs text-muted-foreground">
          Emitida em {formatFrotaDate(ordem.data_abastecimento)} por{" "}
          {ordem.emitido_por ?? "-"} · {ordem.secretaria}
        </div>
      </div>
      <Dialog>
        <DialogTrigger
          className={buttonVariants({
            className: "h-9 gap-2 justify-self-start lg:justify-self-end",
          })}
        >
          <SquareCheckBig className="size-4" />
          Concluir ordem
        </DialogTrigger>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Concluir ordem</DialogTitle>
            <DialogDescription>
              Informe os dados reais do abastecimento de {ordem.placa}.
            </DialogDescription>
          </DialogHeader>
          <AbastecimentoCompleteForm abastecimento={ordem} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md bg-muted/35 px-2.5 py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="truncate text-sm font-medium">{value}</div>
    </div>
  );
}

function formatCnpj(value: string | null) {
  const digits = value?.replace(/\D/g, "") ?? "";

  if (digits.length !== 14) {
    return value ?? "-";
  }

  return digits.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    "$1.$2.$3/$4-$5"
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function isTodayOrPast(value: string | null) {
  if (!value) {
    return false;
  }

  const date = new Date(value);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  return date.getTime() <= endOfToday.getTime();
}

function formatMunicipalityName(name: string) {
  const cleanName = name.trim().replace(/\s+/g, " ");
  const lowerName = cleanName.toLowerCase();
  const prefixes = [
    "prefeitura municipal de ",
    "prefeitura municipal da ",
    "prefeitura municipal do ",
    "prefeitura municipal das ",
    "prefeitura municipal dos ",
    "prefeitura de ",
    "prefeitura da ",
    "prefeitura do ",
    "prefeitura das ",
    "prefeitura dos ",
  ];
  const prefix = prefixes.find((item) => lowerName.startsWith(item));

  if (!prefix) {
    return cleanName;
  }

  const city = cleanName.slice(prefix.length).trim();
  return city ? `Município de ${city}` : cleanName;
}
