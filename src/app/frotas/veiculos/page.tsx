import Link from "next/link";
import {
  CalendarClock,
  Car,
  CircleCheck,
  CircleX,
  Eye,
  Fuel,
  Gauge,
  Hash,
  Paperclip,
  Pencil,
  Plus,
  Search,
  Trash2,
  Wrench,
  X,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import {
  formatFrotaDate,
  formatManutencaoStatus,
  formatVeiculoStatus,
  formatVencimentoTipo,
  getFrotasData,
  type FrotaVeiculoManutencao,
  type FrotaVeiculo,
  type VeiculoStatus,
  type VencimentoTipo,
} from "@/lib/frotas-data";
import { requireUserProfile } from "@/lib/auth-data";
import { getFrotasPermissionAccess } from "@/lib/frotas-permissions";
import { AnexosManagerForm } from "../anexos-manager-form";
import { CopyValueButton } from "../copy-value-button";
import { DeleteVeiculoForm } from "../delete-veiculo-form";
import { FrotasShell } from "../frotas-shell";
import { FrotasToasts } from "../frotas-toasts";
import { VeiculoFotoAvatarControl } from "../veiculo-foto-avatar-control";
import { VeiculoForm } from "../veiculo-form";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    deleted?: string;
    error?: string;
    prefeitura?: string;
    q?: string;
    status?: string;
  }>;
};

const statusFilters = [
  { label: "Todos", status: undefined },
  { label: "Ativos", status: "active" },
  { label: "Manutenção", status: "maintenance" },
  { label: "Inativos", status: "inactive" },
];

export default async function FrotasPage({ searchParams }: PageProps) {
  const profile = await requireUserProfile();
  const access = await getFrotasPermissionAccess(profile);

  const params = await searchParams;
  const prefeituraId =
    profile.role === "bdl_admin"
      ? params.prefeitura
      : profile.prefeitura_id ?? undefined;
  const data = await getFrotasData({
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
    return `/frotas/veiculos${queryString ? `?${queryString}` : ""}`;
  };

  return (
    <FrotasShell
      active="veiculos"
      actions={
        <VeiculosToolbar
          access={access}
          buildFilterHref={buildFilterHref}
          data={data}
          params={params}
        />
      }
      icon={Car}
      prefeituras={data.prefeituras}
      profile={profile}
      selectedPrefeituraId={data.selectedPrefeituraId}
      title="Veículos"
    >
      <FrotasToasts deleted={params.deleted} error={params.error} />
        <main className="flex flex-1 flex-col gap-3 p-4">
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-lg border bg-muted/40">
                      <Car className="size-5 text-muted-foreground" />
                    </div>
                    <div>
                      <CardTitle>Veículos cadastrados</CardTitle>
                      <CardDescription>
                        Lista operacional da frota municipal.
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline">{data.veiculos.length} registro(s)</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {data.veiculos.length ? (
                  <div className="overflow-hidden rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="w-[72px]">Foto</TableHead>
                          <TableHead>Veículo</TableHead>
                          <TableHead>Secretaria</TableHead>
                          <TableHead>Placa / Renavam</TableHead>
                          <TableHead>Combustível</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="w-[92px] text-right">
                            Ações
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.veiculos.map((veiculo) => (
                          <TableRow key={veiculo.id}>
                            <TableCell>
                              <Avatar className="size-12 rounded-lg">
                                {veiculo.foto_url ? (
                                  <AvatarImage
                                    src={veiculo.foto_url}
                                    alt={`Foto do veículo ${veiculo.placa}`}
                                    className="rounded-lg"
                                  />
                                ) : null}
                                <AvatarFallback className="rounded-lg">
                                  <Car className="size-5" />
                                </AvatarFallback>
                              </Avatar>
                            </TableCell>
                            <TableCell>
                              <div className="min-w-[190px]">
                                <div className="truncate font-medium">
                                  {veiculo.modelo}
                                </div>
                                <div className="truncate text-sm text-muted-foreground">
                                  {veiculo.marca} · {veiculo.ano}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="max-w-[180px] truncate">
                                {veiculo.secretaria || "-"}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="flex items-center gap-1">
                                  <span className="font-medium">
                                    {veiculo.placa}
                                  </span>
                                  <CopyValueButton
                                    label="placa"
                                    value={veiculo.placa}
                                  />
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="text-xs text-muted-foreground">
                                    {veiculo.renavam ?? "-"}
                                  </span>
                                  <CopyValueButton
                                    label="Renavam"
                                    value={veiculo.renavam}
                                  />
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="font-normal">
                                {veiculo.combustivel ?? "-"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <VehicleStatusBadge status={veiculo.status} />
                            </TableCell>
                            <TableCell>
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
                                          aria-label="Ver detalhes"
                                        >
                                          <Eye className="size-4" />
                                        </DialogTrigger>
                                      }
                                    />
                                    <TooltipContent>Ver detalhes</TooltipContent>
                                  </Tooltip>
                                  <DialogContent className="sm:max-w-3xl">
                                    <DialogHeader>
                                      <DialogTitle>Detalhes do veículo</DialogTitle>
                                      <DialogDescription>
                                        Informações completas de {veiculo.placa}.
                                      </DialogDescription>
                                    </DialogHeader>
                                    <VeiculoDetails
                                      canUpdate={access.canUpdateVeiculos}
                                      veiculo={veiculo}
                                    />
                                  </DialogContent>
                                </Dialog>

                                <Tooltip>
                                  <TooltipTrigger
                                    render={
                                      <Link
                                        href={`/frotas/veiculos/${veiculo.id}/vencimentos`}
                                        className={buttonVariants({
                                          variant: "ghost",
                                          size: "icon-sm",
                                        })}
                                        aria-label="Vencimentos"
                                      >
                                        <CalendarClock className="size-4" />
                                      </Link>
                                    }
                                  />
                                  <TooltipContent>Vencimentos</TooltipContent>
                                </Tooltip>

                                <Dialog>
                                  <Tooltip>
                                    <TooltipTrigger
                                      render={
                                        <DialogTrigger
                                          className={buttonVariants({
                                            variant: "ghost",
                                            size: "icon-sm",
                                          })}
                                          aria-label="Histórico de manutenção"
                                        >
                                          <Wrench className="size-4" />
                                        </DialogTrigger>
                                      }
                                    />
                                    <TooltipContent>
                                      Histórico de manutenção
                                    </TooltipContent>
                                  </Tooltip>
                                  <DialogContent className="sm:max-w-2xl">
                                    <DialogHeader>
                                      <DialogTitle>
                                        Histórico de manutenção
                                      </DialogTitle>
                                      <DialogDescription>
                                        Registros vinculados ao veículo{" "}
                                        {veiculo.placa}.
                                      </DialogDescription>
                                    </DialogHeader>
                                    <VeiculoMaintenanceHistory
                                      manutencoes={veiculo.manutencoes}
                                    />
                                  </DialogContent>
                                </Dialog>

                                {access.canUpdateVeiculos ? (
                                  <Dialog>
                                    <Tooltip>
                                      <TooltipTrigger
                                        render={
                                          <DialogTrigger
                                            className={buttonVariants({
                                              variant: "ghost",
                                              size: "icon-sm",
                                            })}
                                            aria-label="Gerenciar anexos"
                                          >
                                            <Paperclip className="size-4" />
                                          </DialogTrigger>
                                        }
                                      />
                                      <TooltipContent>
                                        Gerenciar anexos
                                      </TooltipContent>
                                    </Tooltip>
                                    <DialogContent className="sm:max-w-2xl">
                                      <DialogHeader>
                                        <DialogTitle>Anexos do veículo</DialogTitle>
                                        <DialogDescription>
                                          Documentos vinculados ao veículo{" "}
                                          {veiculo.placa}.
                                        </DialogDescription>
                                      </DialogHeader>
                                      <AnexosManagerForm
                                        anexos={veiculo.anexos}
                                        ownerId={veiculo.id}
                                        ownerLabel="veículo"
                                        type="veiculo"
                                      />
                                    </DialogContent>
                                  </Dialog>
                                ) : null}

                                {access.canUpdateVeiculos ? (
                                  <Dialog>
                                    <Tooltip>
                                      <TooltipTrigger
                                        render={
                                          <DialogTrigger
                                            className={buttonVariants({
                                              variant: "ghost",
                                              size: "icon-sm",
                                            })}
                                            aria-label="Editar veículo"
                                          >
                                            <Pencil className="size-4" />
                                          </DialogTrigger>
                                        }
                                      />
                                      <TooltipContent>Editar veículo</TooltipContent>
                                    </Tooltip>
                                    <DialogContent className="sm:max-w-3xl">
                                      <DialogHeader>
                                        <DialogTitle>Editar veículo</DialogTitle>
                                      </DialogHeader>
                                      <VeiculoForm
                                        prefeituras={data.prefeituras}
                                        selectedPrefeituraId={
                                          data.selectedPrefeituraId
                                        }
                                        veiculo={veiculo}
                                      />
                                    </DialogContent>
                                  </Dialog>
                                ) : null}

                                {access.canDeleteVeiculos ? (
                                  <Dialog>
                                    <Tooltip>
                                      <TooltipTrigger
                                        render={
                                          <DialogTrigger
                                            className={buttonVariants({
                                              variant: "destructive",
                                              size: "icon-sm",
                                            })}
                                            aria-label="Excluir veículo"
                                          >
                                            <Trash2 className="size-4" />
                                          </DialogTrigger>
                                        }
                                      />
                                      <TooltipContent>Excluir veículo</TooltipContent>
                                    </Tooltip>
                                    <DialogContent className="sm:max-w-md">
                                      <DialogHeader>
                                        <DialogTitle>Excluir veículo</DialogTitle>
                                        <DialogDescription>
                                          Esta ação remove o veículo {veiculo.placa}
                                          e todos os dados vinculados a ele.
                                        </DialogDescription>
                                      </DialogHeader>
                                      <DeleteVeiculoForm id={veiculo.id} />
                                    </DialogContent>
                                  </Dialog>
                                ) : null}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <EmptyFleetState
                    canCreate={access.canCreateVeiculos}
                    prefeituras={data.prefeituras}
                    selectedPrefeituraId={data.selectedPrefeituraId}
                  />
                )}
              </CardContent>
            </Card>
        </main>
    </FrotasShell>
  );
}

function VeiculosToolbar({
  access,
  buildFilterHref,
  data,
  params,
}: {
  access: Awaited<ReturnType<typeof getFrotasPermissionAccess>>;
  buildFilterHref: (values: {
    prefeitura?: string | null;
    status?: string | null;
  }) => string;
  data: Awaited<ReturnType<typeof getFrotasData>>;
  params: Awaited<PageProps["searchParams"]>;
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
            placeholder="Buscar veículo"
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
            href="/frotas/veiculos"
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

      <div className="hidden shrink-0 items-center gap-1.5 md:flex">
        <Badge variant="outline" className="h-7">
          {data.metricas.total} total
        </Badge>
        <Badge variant="secondary" className="h-7">
          {data.metricas.ativos} ativos
        </Badge>
      </div>

      {access.canCreateVeiculos ? (
        <Dialog>
          <DialogTrigger
            className={buttonVariants({
              className: "h-9 shrink-0 gap-2",
            })}
          >
            <Plus className="size-4" />
            Novo veículo
          </DialogTrigger>
          <DialogContent className="sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>Novo veículo</DialogTitle>
            </DialogHeader>
            <VeiculoForm
              prefeituras={data.prefeituras}
              selectedPrefeituraId={data.selectedPrefeituraId}
            />
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}

function EmptyFleetState({
  canCreate,
  prefeituras,
  selectedPrefeituraId,
}: {
  canCreate: boolean;
  prefeituras: Awaited<ReturnType<typeof getFrotasData>>["prefeituras"];
  selectedPrefeituraId?: string;
}) {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center rounded-lg border bg-muted/20 p-8 text-center">
      <div className="flex size-12 items-center justify-center rounded-lg border bg-background">
        <Car className="size-6 text-muted-foreground" />
      </div>
      <h3 className="mt-4 text-base font-semibold">
        Nenhum veículo encontrado
      </h3>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">
        Cadastre o primeiro veículo da prefeitura selecionada ou ajuste os
        filtros para visualizar outros registros.
      </p>
      {canCreate ? (
        <Dialog>
          <DialogTrigger
            className={buttonVariants({
              className: "mt-4 gap-2",
            })}
          >
            <Plus className="size-4" />
            Cadastrar veículo
          </DialogTrigger>
          <DialogContent className="sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>Novo veículo</DialogTitle>
            </DialogHeader>
            <VeiculoForm
              prefeituras={prefeituras}
              selectedPrefeituraId={selectedPrefeituraId}
            />
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}

function VeiculoDetails({
  canUpdate,
  veiculo,
}: {
  canUpdate: boolean;
  veiculo: FrotaVeiculo;
}) {
  return (
    <div className="space-y-3">
      <div className="rounded-lg border bg-muted/20 p-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            {canUpdate ? (
              <VeiculoFotoAvatarControl veiculo={veiculo} />
            ) : (
              <Avatar className="size-24 rounded-lg">
                {veiculo.foto_url ? (
                  <AvatarImage
                    src={veiculo.foto_url}
                    alt={`Foto do veículo ${veiculo.placa}`}
                    className="rounded-lg"
                  />
                ) : null}
                <AvatarFallback className="rounded-lg">
                  <Car className="size-8" />
                </AvatarFallback>
              </Avatar>
            )}
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate text-lg font-semibold leading-none">
                  {veiculo.modelo}
                </h3>
                <VehicleStatusBadge status={veiculo.status} />
              </div>
              <div>
                <div className="text-base font-medium leading-tight">
                  {veiculo.marca} · {veiculo.ano}
                </div>
                <div className="text-xs text-muted-foreground">
                  {veiculo.secretaria || "Sem secretaria"} ·{" "}
                  {veiculo.combustivel ?? "-"}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="font-normal">
                  <Hash className="size-3.5" />
                  {veiculo.placa}
                </Badge>
                <Badge variant="outline" className="font-normal">
                  <Fuel className="size-3.5" />
                  {veiculo.combustivel ?? "-"}
                </Badge>
                <Badge variant="outline" className="font-normal">
                  <Gauge className="size-3.5" />
                  {formatMileage(veiculo.quilometragem)}
                </Badge>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:min-w-64">
            <MetricTile label="Anexos" value={String(veiculo.anexos.length)} />
            <MetricTile
              label="Manutenções"
              value={String(veiculo.manutencoes.length)}
            />
            <MetricTile
              label="Vencimentos"
              value={String(Object.values(veiculo.vencimentos).filter(Boolean).length)}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border p-2.5">
          <div className="flex items-center gap-2 text-xs font-medium">
            <Car className="size-3.5 text-muted-foreground" />
            Identificação
          </div>
          <div className="mt-2 grid gap-1.5">
            <CompactDetail label="Prefeitura" value={veiculo.prefeitura_nome} />
            <CompactDetail label="Secretaria" value={veiculo.secretaria || "-"} />
            <CompactDetail label="Tipo" value={veiculo.tipo} />
            <CompactDetail label="Prefixo" value={veiculo.prefixo || "-"} />
            <CompactDetail label="Renavam" value={veiculo.renavam ?? "-"} />
            <CompactDetail
              label="Cadastro"
              value={new Intl.DateTimeFormat("pt-BR").format(
                new Date(veiculo.created_at)
              )}
            />
          </div>
        </div>

        <div className="rounded-lg border p-2.5">
          <div className="flex items-center gap-2 text-xs font-medium">
            <CalendarClock className="size-3.5 text-muted-foreground" />
            Operação
          </div>
          <div className="mt-2 grid gap-1.5">
            <CompactDetail
              label="Quilometragem"
              value={formatMileage(veiculo.quilometragem)}
            />
            <CompactDetail label="Combustível" value={veiculo.combustivel ?? "-"} />
            <CompactDetail
              label="Foto"
              value={veiculo.foto_url ? "Cadastrada" : "Pendente"}
            />
            <CompactDetail
              label="Anexos"
              value={`${veiculo.anexos.length} documento(s)`}
            />
            <div className="rounded-md bg-muted/35 px-2.5 py-1.5">
              <div className="mb-1 text-xs text-muted-foreground">
                Vencimentos
              </div>
              <VehicleDueDates vencimentos={veiculo.vencimentos} />
            </div>
          </div>
        </div>
      </div>

      {veiculo.observacoes ? (
        <div className="rounded-lg border p-2.5">
          <div className="text-xs font-medium">Observações</div>
          <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">
            {veiculo.observacoes}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function VeiculoMaintenanceHistory({
  manutencoes,
}: {
  manutencoes: FrotaVeiculoManutencao[];
}) {
  if (!manutencoes.length) {
    return (
      <div className="flex min-h-52 flex-col items-center justify-center rounded-lg border bg-muted/20 p-8 text-center">
        <div className="flex size-11 items-center justify-center rounded-lg border bg-background">
          <Wrench className="size-5 text-muted-foreground" />
        </div>
        <h3 className="mt-3 text-sm font-semibold">
          Nenhuma manutenção registrada
        </h3>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Quando este veículo tiver manutenções, o histórico aparecerá aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
      {manutencoes.map((manutencao) => (
        <div key={manutencao.id} className="rounded-lg border p-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="font-normal">
                  {manutencao.tipo}
                </Badge>
                <MaintenanceStatusBadge status={manutencao.status} />
              </div>
              <div className="mt-2 font-medium">{manutencao.descricao}</div>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span>Entrada: {formatFrotaDate(manutencao.data_entrada)}</span>
                {manutencao.data_saida ? (
                  <span>Saída: {formatFrotaDate(manutencao.data_saida)}</span>
                ) : null}
                {manutencao.oficina ? <span>{manutencao.oficina}</span> : null}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:min-w-48">
              <MetricTile
                label="Valor"
                value={
                  manutencao.valor ? formatCurrency(manutencao.valor) : "-"
                }
              />
              <MetricTile
                label="Km"
                value={formatMileage(manutencao.quilometragem)}
              />
            </div>
          </div>

          {manutencao.responsavel || manutencao.observacoes ? (
            <div className="mt-3 rounded-lg bg-muted/40 p-2 text-sm text-muted-foreground">
              {manutencao.responsavel ? (
                <div>Responsável: {manutencao.responsavel}</div>
              ) : null}
              {manutencao.observacoes ? (
                <div className="mt-1">{manutencao.observacoes}</div>
              ) : null}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function CompactDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md bg-muted/35 px-2.5 py-1.5 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate text-right font-medium">{value}</span>
    </div>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-background px-2.5 py-1.5">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="truncate text-base font-semibold leading-tight">
        {value}
      </div>
    </div>
  );
}

function MaintenanceStatusBadge({
  status,
}: {
  status: FrotaVeiculoManutencao["status"];
}) {
  const styles: Record<FrotaVeiculoManutencao["status"], string> = {
    cancelled: "border-zinc-200 bg-zinc-100 text-zinc-700 hover:bg-zinc-100",
    completed:
      "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50",
    open: "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-50",
  };

  return (
    <Badge variant="outline" className={styles[status]}>
      {formatManutencaoStatus(status)}
    </Badge>
  );
}

function formatMileage(value: number | null) {
  if (value === null) {
    return "-";
  }

  return `${new Intl.NumberFormat("pt-BR").format(value)} km`;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency",
  }).format(value);
}

function VehicleStatusBadge({ status }: { status: VeiculoStatus }) {
  const styles: Record<VeiculoStatus, string> = {
    active:
      "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50",
    inactive:
      "border-zinc-200 bg-zinc-100 text-zinc-700 hover:bg-zinc-100",
    maintenance:
      "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-50",
  };
  const icons = {
    active: CircleCheck,
    inactive: CircleX,
    maintenance: Wrench,
  } satisfies Record<VeiculoStatus, typeof CircleCheck>;
  const Icon = icons[status];

  return (
    <Badge variant="outline" className={styles[status]}>
      <Icon className="size-3.5" />
      {formatVeiculoStatus(status)}
    </Badge>
  );
}

function VehicleDueDates({
  vencimentos,
}: {
  vencimentos: Partial<Record<VencimentoTipo, string>>;
}) {
  const items: VencimentoTipo[] = ["seguro", "ipva", "licenciamento"];
  const visibleItems = items
    .map((tipo) => ({
      data: vencimentos[tipo],
      tipo,
    }))
    .filter(
      (item): item is { data: string; tipo: VencimentoTipo } =>
        Boolean(item.data)
    );

  if (!visibleItems.length) {
    return <span className="text-sm text-muted-foreground">Sem vencimentos</span>;
  }

  return (
    <div className="flex max-w-[380px] flex-wrap gap-1">
      {visibleItems.map((item) => (
        <Badge
          key={item.tipo}
          variant="outline"
          className="font-normal"
        >
          <CalendarClock className="size-3" />
          {`${formatVencimentoTipo(item.tipo)} ${formatFrotaDate(item.data)}`}
        </Badge>
      ))}
    </div>
  );
}
