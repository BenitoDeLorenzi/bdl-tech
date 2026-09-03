import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Archive,
  Eye,
  FileText,
  Plus,
  Printer,
  Search,
  Trash2,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
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
import { getAbastecimentosData } from "@/lib/frotas-data";
import { getFrotasPermissionAccess } from "@/lib/frotas-permissions";
import {
  formatRelatorioStatus,
  formatRelatorioTipo,
  getRelatorios,
  reportTypeOptions,
  type FrotaRelatorio,
  type RelatorioStatus,
  type RelatorioTipo,
} from "@/lib/relatorios-data";
import { getSecretariaOptions } from "@/lib/secretarias-data";
import { cn } from "@/lib/utils";
import { FrotasShell } from "../frotas-shell";
import { deleteRelatorio } from "./actions";
import { RelatorioForm } from "./relatorio-form";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    prefeitura?: string;
    q?: string;
    status?: string;
    tipo?: string;
  }>;
};

const reportTypeStyles: Record<RelatorioTipo, string> = {
  expirations: "border-amber-200 bg-amber-50 text-amber-700",
  fuel: "border-sky-200 bg-sky-50 text-sky-700",
  maintenance: "border-violet-200 bg-violet-50 text-violet-700",
  vehicles: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

const reportStatusStyles: Record<RelatorioStatus, string> = {
  archived: "border-zinc-200 bg-zinc-50 text-zinc-700",
  cancelled: "border-red-200 bg-red-50 text-red-700",
  generated: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

export default async function RelatoriosPage({ searchParams }: PageProps) {
  const profile = await requireUserProfile();
  const access = await getFrotasPermissionAccess(profile);

  if (!access.canViewRelatorios) {
    redirect("/frotas");
  }

  const params = await searchParams;
  const prefeituraId =
    profile.role === "bdl_admin"
      ? params.prefeitura
      : profile.prefeitura_id ?? undefined;
  const [data, relatorios] = await Promise.all([
    getAbastecimentosData({ prefeituraId }),
    getRelatorios({
      prefeituraId,
      query: params.q,
      status: params.status,
      tipo: params.tipo,
    }),
  ]);
  const secretarias = await getSecretariaOptions(data.selectedPrefeituraId);
  const buildFilterHref = (values: {
    status?: string | null;
    tipo?: string | null;
  }) => {
    const query = new URLSearchParams();
    const tipo = Object.hasOwn(values, "tipo") ? values.tipo : params.tipo;
    const status = Object.hasOwn(values, "status")
      ? values.status
      : params.status;

    if (params.q?.trim()) {
      query.set("q", params.q.trim());
    }

    if (tipo && tipo !== "all") {
      query.set("tipo", tipo);
    }

    if (status && status !== "all") {
      query.set("status", status);
    }

    if (data.selectedPrefeituraId) {
      query.set("prefeitura", data.selectedPrefeituraId);
    }

    const queryString = query.toString();
    return `/frotas/relatorios${queryString ? `?${queryString}` : ""}`;
  };

  return (
    <FrotasShell
      active="relatorios"
      actions={
        <RelatoriosToolbar
          buildFilterHref={buildFilterHref}
          data={data}
          params={params}
          secretarias={secretarias}
        />
      }
      icon={FileText}
      prefeituras={data.prefeituras}
      profile={profile}
      selectedPrefeituraId={data.selectedPrefeituraId}
      title="Relatórios"
    >
      <main className="flex flex-1 flex-col gap-4 p-4">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>Relatórios criados</CardTitle>
                <CardDescription>
                  Documentos oficiais para conferência, impressão e envio aos
                  setores da prefeitura.
                </CardDescription>
              </div>
              <Badge variant="outline">{relatorios.length} registro(s)</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {relatorios.length ? (
              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Relatório</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Período</TableHead>
                      <TableHead>Registros</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[88px] text-right">
                        Ações
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {relatorios.map((relatorio) => (
                      <RelatorioRow key={relatorio.id} relatorio={relatorio} />
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <EmptyReportsState
                data={data}
                profile={profile}
                secretarias={secretarias}
                showPrefeituraField={profile.role === "bdl_admin"}
              />
            )}
          </CardContent>
        </Card>
      </main>
    </FrotasShell>
  );
}

function RelatoriosToolbar({
  buildFilterHref,
  data,
  params,
  secretarias,
}: {
  buildFilterHref: (values: {
    status?: string | null;
    tipo?: string | null;
  }) => string;
  data: Awaited<ReturnType<typeof getAbastecimentosData>>;
  params: Awaited<PageProps["searchParams"]>;
  secretarias: Awaited<ReturnType<typeof getSecretariaOptions>>;
}) {
  const hasFilters = Boolean(params.q?.trim() || params.tipo || params.status);

  return (
    <div className="flex w-full min-w-0 items-center justify-end gap-2">
      <form className="hidden min-w-0 shrink-0 gap-2 xl:flex">
        <div className="relative min-w-0 w-[280px]">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-9 pl-9"
            name="q"
            placeholder="Buscar relatório"
            defaultValue={params.q}
          />
        </div>
        {params.tipo ? <input name="tipo" type="hidden" value={params.tipo} /> : null}
        {params.status ? (
          <input name="status" type="hidden" value={params.status} />
        ) : null}
        {data.selectedPrefeituraId ? (
          <input name="prefeitura" type="hidden" value={data.selectedPrefeituraId} />
        ) : null}
        {hasFilters ? (
          <Link
            className={buttonVariants({
              className: "h-9 gap-2",
              variant: "outline",
            })}
            href="/frotas/relatorios"
          >
            <X className="size-4" />
            Limpar
          </Link>
        ) : (
          <Button className="h-9" type="submit" variant="outline">
            <Search className="size-4" />
            Filtrar
          </Button>
        )}
      </form>

      <div className="hidden shrink-0 gap-1 rounded-lg bg-muted p-1 lg:flex">
        {reportTypeOptions.map((option) => {
          const isActive = option.value === (params.tipo ?? "all");

          return (
            <Link
              key={option.value}
              href={buildFilterHref({ tipo: option.value })}
              className={buttonVariants({
                className: isActive
                  ? "h-7 shrink-0 px-2 text-xs shadow-sm"
                  : "h-7 shrink-0 px-2 text-xs text-muted-foreground",
                size: "sm",
                variant: isActive ? "default" : "ghost",
              })}
            >
              {option.label}
            </Link>
          );
        })}
      </div>

      <Separator orientation="vertical" className="hidden h-5 xl:block" />

      <Dialog>
        <DialogTrigger
          className={buttonVariants({
            className: "h-9 shrink-0 gap-2",
          })}
        >
          <Plus className="size-4" />
          Novo relatório
        </DialogTrigger>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Novo relatório</DialogTitle>
          </DialogHeader>
          <RelatorioForm
            postos={data.postos}
            prefeituras={data.prefeituras}
            selectedPrefeituraId={data.selectedPrefeituraId}
            secretarias={secretarias}
            showPrefeituraField={false}
            veiculos={data.veiculos}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RelatorioRow({ relatorio }: { relatorio: FrotaRelatorio }) {
  return (
    <TableRow>
      <TableCell>
        <div className="min-w-[220px]">
          <div className="font-medium">{relatorio.titulo}</div>
          <div className="text-xs text-muted-foreground">
            Criado por {relatorio.criado_por ?? "-"} em{" "}
            {formatDateTime(relatorio.created_at)}
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge
          className={cn(reportTypeStyles[relatorio.tipo], "hover:bg-current/0")}
          variant="outline"
        >
          {formatRelatorioTipo(relatorio.tipo)}
        </Badge>
      </TableCell>
      <TableCell>{formatReportPeriod(relatorio)}</TableCell>
      <TableCell>{relatorio.total_registros}</TableCell>
      <TableCell>{formatCurrency(relatorio.valor_total)}</TableCell>
      <TableCell>
        <Badge
          className={reportStatusStyles[relatorio.status]}
          variant="outline"
        >
          {relatorio.status === "archived" ? (
            <Archive className="size-3.5" />
          ) : null}
          {formatRelatorioStatus(relatorio.status)}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex justify-end gap-1">
          <Tooltip>
            <TooltipTrigger
              render={
                <Link
                  aria-label="Visualizar relatório"
                  className={buttonVariants({
                    size: "icon-sm",
                    variant: "ghost",
                  })}
                  href={`/frotas/relatorios/${relatorio.id}`}
                >
                  <Eye className="size-4" />
                </Link>
              }
            />
            <TooltipContent>Visualizar relatório</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger
              render={
                <Link
                  aria-label="Imprimir relatório"
                  className={buttonVariants({
                    size: "icon-sm",
                    variant: "ghost",
                  })}
                  href={`/frotas/relatorios/${relatorio.id}?print=1`}
                >
                  <Printer className="size-4" />
                </Link>
              }
            />
            <TooltipContent>Imprimir relatório</TooltipContent>
          </Tooltip>
          <Dialog>
            <Tooltip>
              <TooltipTrigger
                render={
                  <DialogTrigger
                    aria-label="Remover relatório"
                    className={buttonVariants({
                      size: "icon-sm",
                      variant: "destructive",
                    })}
                  >
                    <Trash2 className="size-4" />
                  </DialogTrigger>
                }
              />
              <TooltipContent>Remover relatório</TooltipContent>
            </Tooltip>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Remover relatório</DialogTitle>
                <DialogDescription>
                  Esta ação remove o relatório {relatorio.titulo}. O documento
                  poderá ser gerado novamente depois, se necessário.
                </DialogDescription>
              </DialogHeader>
              <form action={deleteRelatorio} className="flex justify-end gap-2">
                <input name="id" type="hidden" value={relatorio.id} />
                <Button type="submit" variant="destructive" className="gap-2">
                  <Trash2 className="size-4" />
                  Remover relatório
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </TableCell>
    </TableRow>
  );
}

function EmptyReportsState({
  data,
  profile,
  secretarias,
  showPrefeituraField,
}: {
  data: Awaited<ReturnType<typeof getAbastecimentosData>>;
  profile: Awaited<ReturnType<typeof requireUserProfile>>;
  secretarias: Awaited<ReturnType<typeof getSecretariaOptions>>;
  showPrefeituraField: boolean;
}) {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center rounded-lg border bg-muted/20 p-8 text-center">
      <div className="flex size-12 items-center justify-center rounded-lg border bg-background">
        <FileText className="size-6 text-muted-foreground" />
      </div>
      <h3 className="mt-4 text-base font-semibold">
        Nenhum relatório criado
      </h3>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">
        Gere relatórios oficiais para conferência, impressão e envio aos setores
        responsáveis da prefeitura.
      </p>
      <Dialog>
        <DialogTrigger
          className={buttonVariants({
            className: "mt-4 gap-2",
          })}
        >
          <Plus className="size-4" />
          Criar relatório
        </DialogTrigger>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Novo relatório</DialogTitle>
          </DialogHeader>
          <RelatorioForm
            postos={data.postos}
            prefeituras={data.prefeituras}
            selectedPrefeituraId={data.selectedPrefeituraId}
            secretarias={secretarias}
            showPrefeituraField={showPrefeituraField && profile.role === "bdl_admin"}
            veiculos={data.veiculos}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function formatReportPeriod(relatorio: FrotaRelatorio) {
  if (!relatorio.periodo_inicio || !relatorio.periodo_fim) {
    return "Atual";
  }

  return `${formatDate(relatorio.periodo_inicio)} - ${formatDate(
    relatorio.periodo_fim
  )}`;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency",
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00.000Z`));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}
