import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BadgeCheck,
  Car,
  CircleCheck,
  CircleX,
  ClipboardCheck,
  Pencil,
  Plus,
  Search,
  X,
} from "lucide-react";

import { FrotasShell } from "@/app/frotas/frotas-shell";
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
import { getFrotasPermissionAccess } from "@/lib/frotas-permissions";
import {
  formatSecretariaStatus,
  getSecretariasData,
  type FrotaSecretaria,
  type SecretariaStatus,
} from "@/lib/secretarias-data";
import { SecretariaForm } from "./secretaria-form";
import { SecretariaStatusButton } from "./secretaria-status-button";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    prefeitura?: string;
    q?: string;
    status?: string;
  }>;
};

const statusFilters = [
  { label: "Todas", status: undefined },
  { label: "Ativas", status: "active" },
  { label: "Inativas", status: "inactive" },
];

export default async function SecretariasPage({ searchParams }: PageProps) {
  const profile = await requireUserProfile();
  const access = await getFrotasPermissionAccess(profile);

  if (!access.canViewSecretarias) {
    redirect("/frotas");
  }

  const params = await searchParams;
  const prefeituraId =
    profile.role === "bdl_admin"
      ? params.prefeitura
      : profile.prefeitura_id ?? undefined;
  const data = await getSecretariasData({
    prefeituraId,
    query: params.q,
    status: params.status,
  });
  const searchTerm = params.q?.trim();
  const buildFilterHref = (values: {
    prefeitura?: string | null;
    status?: string | null;
  }) => {
    const query = new URLSearchParams();
    const status = Object.hasOwn(values, "status")
      ? values.status
      : params.status;
    const prefeitura = Object.hasOwn(values, "prefeitura")
      ? values.prefeitura
      : data.selectedPrefeituraId;

    if (searchTerm) {
      query.set("q", searchTerm);
    }

    if (status) {
      query.set("status", status);
    }

    if (prefeitura) {
      query.set("prefeitura", prefeitura);
    }

    const queryString = query.toString();
    return `/frotas/secretarias${queryString ? `?${queryString}` : ""}`;
  };

  return (
    <FrotasShell
      active="secretarias"
      actions={
        <SecretariasToolbar
          access={access}
          buildFilterHref={buildFilterHref}
          data={data}
          params={params}
          showPrefeituraField={profile.role === "bdl_admin"}
        />
      }
      icon={ClipboardCheck}
      prefeituras={data.prefeituras}
      profile={profile}
      selectedPrefeituraId={data.selectedPrefeituraId}
      title="Secretarias"
    >
      <main className="flex flex-1 flex-col gap-3 p-4">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg border bg-muted/40">
                  <ClipboardCheck className="size-5 text-muted-foreground" />
                </div>
                <div>
                  <CardTitle>Secretarias cadastradas</CardTitle>
                  <CardDescription>
                    Padronização das áreas responsáveis pelos veículos.
                  </CardDescription>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <MetricBadge label="Ativas" value={data.metricas.ativas} />
                <MetricBadge label="Inativas" value={data.metricas.inativas} />
                <MetricBadge label="Total" value={data.metricas.total} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {data.secretarias.length ? (
              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Secretaria</TableHead>
                      <TableHead>Prefeitura</TableHead>
                      <TableHead>Veículos</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[96px] text-right">
                        Ações
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.secretarias.map((secretaria) => (
                      <TableRow key={secretaria.id}>
                        <TableCell>
                          <div className="min-w-[220px]">
                            <div className="font-medium">{secretaria.nome}</div>
                            <div className="text-xs text-muted-foreground">
                              Cadastro da frota municipal
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{secretaria.prefeitura_nome}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            <Car className="size-3.5" />
                            {secretaria.total_veiculos} veículo(s)
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <SecretariaStatusBadge status={secretaria.status} />
                        </TableCell>
                        <TableCell>
                          <SecretariaActions
                            access={access}
                            prefeituras={data.prefeituras}
                            secretaria={secretaria}
                            selectedPrefeituraId={data.selectedPrefeituraId}
                            showPrefeituraField={profile.role === "bdl_admin"}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <EmptySecretariasState
                canCreate={access.canManageSecretarias}
                prefeituras={data.prefeituras}
                selectedPrefeituraId={data.selectedPrefeituraId}
                showPrefeituraField={profile.role === "bdl_admin"}
              />
            )}
          </CardContent>
        </Card>
      </main>
    </FrotasShell>
  );
}

function SecretariasToolbar({
  access,
  buildFilterHref,
  data,
  params,
  showPrefeituraField,
}: {
  access: Awaited<ReturnType<typeof getFrotasPermissionAccess>>;
  buildFilterHref: (values: {
    prefeitura?: string | null;
    status?: string | null;
  }) => string;
  data: Awaited<ReturnType<typeof getSecretariasData>>;
  params: Awaited<PageProps["searchParams"]>;
  showPrefeituraField: boolean;
}) {
  const hasActiveFilters = Boolean(params.q?.trim() || params.status || params.prefeitura);

  return (
    <div className="flex w-full min-w-0 items-center justify-end gap-2">
      <form className="hidden min-w-0 shrink-0 gap-2 xl:flex">
        <div className="relative min-w-0 w-[320px]">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-9 pl-9"
            name="q"
            placeholder="Buscar secretaria"
            defaultValue={params.q}
          />
        </div>
        {params.status ? (
          <input type="hidden" name="status" value={params.status} />
        ) : null}
        {data.selectedPrefeituraId ? (
          <input
            type="hidden"
            name="prefeitura"
            value={data.selectedPrefeituraId}
          />
        ) : null}
        {hasActiveFilters ? (
          <Link
            href="/frotas/secretarias"
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
        {statusFilters.map((option) => {
          const isActive = option.status
            ? params.status === option.status
            : !params.status;

          return (
            <Link
              key={option.label}
              href={buildFilterHref({ status: option.status ?? null })}
              className={buttonVariants({
                variant: isActive ? "default" : "ghost",
                size: "sm",
                className: isActive
                  ? "h-7 shrink-0 px-2 text-xs shadow-sm"
                  : "h-7 shrink-0 px-2 text-xs text-muted-foreground",
              })}
            >
              {option.label}
            </Link>
          );
        })}
      </div>

      <Separator orientation="vertical" className="hidden h-5 xl:block" />

      {access.canManageSecretarias ? (
        <Dialog>
          <DialogTrigger
            className={buttonVariants({
              className: "h-9 shrink-0 gap-2",
            })}
          >
            <Plus className="size-4" />
            Nova secretaria
          </DialogTrigger>
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>Nova secretaria</DialogTitle>
            </DialogHeader>
            <SecretariaForm
              prefeituraId={data.selectedPrefeituraId}
              prefeituras={data.prefeituras}
              showPrefeituraField={showPrefeituraField}
            />
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}

function SecretariaActions({
  access,
  prefeituras,
  secretaria,
  selectedPrefeituraId,
  showPrefeituraField,
}: {
  access: Awaited<ReturnType<typeof getFrotasPermissionAccess>>;
  prefeituras: Awaited<ReturnType<typeof getSecretariasData>>["prefeituras"];
  secretaria: FrotaSecretaria;
  selectedPrefeituraId?: string;
  showPrefeituraField: boolean;
}) {
  if (!access.canManageSecretarias) {
    return null;
  }

  return (
    <div className="flex justify-end gap-1">
      <Dialog>
        <Tooltip>
          <TooltipTrigger
            render={
              <DialogTrigger
                className={buttonVariants({
                  variant: "ghost",
                  size: "icon-sm",
                })}
                aria-label="Editar secretaria"
              >
                <Pencil className="size-4" />
              </DialogTrigger>
            }
          />
          <TooltipContent>Editar secretaria</TooltipContent>
        </Tooltip>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Editar secretaria</DialogTitle>
          </DialogHeader>
          <SecretariaForm
            prefeituraId={selectedPrefeituraId}
            prefeituras={prefeituras}
            secretaria={secretaria}
            showPrefeituraField={showPrefeituraField}
          />
        </DialogContent>
      </Dialog>

      <SecretariaStatusButton
        secretariaId={secretaria.id}
        status={secretaria.status}
      />
    </div>
  );
}

function EmptySecretariasState({
  canCreate,
  prefeituras,
  selectedPrefeituraId,
  showPrefeituraField,
}: {
  canCreate: boolean;
  prefeituras: Awaited<ReturnType<typeof getSecretariasData>>["prefeituras"];
  selectedPrefeituraId?: string;
  showPrefeituraField: boolean;
}) {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center rounded-lg border bg-muted/20 p-8 text-center">
      <div className="flex size-12 items-center justify-center rounded-lg border bg-background">
        <ClipboardCheck className="size-6 text-muted-foreground" />
      </div>
      <h3 className="mt-4 text-base font-semibold">
        Nenhuma secretaria cadastrada
      </h3>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">
        Cadastre as secretarias para padronizar os veículos, filtros e
        relatórios da frota municipal.
      </p>
      {canCreate ? (
        <Dialog>
          <DialogTrigger
            className={buttonVariants({
              className: "mt-4 gap-2",
            })}
          >
            <Plus className="size-4" />
            Cadastrar secretaria
          </DialogTrigger>
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>Nova secretaria</DialogTitle>
            </DialogHeader>
            <SecretariaForm
              prefeituraId={selectedPrefeituraId}
              prefeituras={prefeituras}
              showPrefeituraField={showPrefeituraField}
            />
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}

function SecretariaStatusBadge({ status }: { status: SecretariaStatus }) {
  return (
    <Badge
      variant="outline"
      className={
        status === "active"
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50"
          : "border-zinc-200 bg-zinc-100 text-zinc-700 hover:bg-zinc-100"
      }
    >
      {status === "active" ? (
        <CircleCheck className="size-3.5" />
      ) : (
        <CircleX className="size-3.5" />
      )}
      {formatSecretariaStatus(status)}
    </Badge>
  );
}

function MetricBadge({ label, value }: { label: string; value: number }) {
  return (
    <Badge variant="outline" className="h-8 gap-1.5 rounded-lg px-3">
      <BadgeCheck className="size-3.5 text-muted-foreground" />
      <span className="font-semibold">{value}</span>
      <span className="text-muted-foreground">{label}</span>
    </Badge>
  );
}
