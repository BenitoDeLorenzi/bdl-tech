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
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Settings,
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
  formatVeiculoStatus,
  formatVencimentoTipo,
  getFrotasData,
  type FrotaVeiculo,
  type VeiculoStatus,
  type VencimentoTipo,
} from "@/lib/frotas-data";
import { requireUserProfile } from "@/lib/auth-data";
import { getFrotasPermissionAccess } from "@/lib/frotas-permissions";
import { getSecretariaOptions } from "@/lib/secretarias-data";
import { CopyValueButton } from "../copy-value-button";
import { DeleteVeiculoForm } from "../delete-veiculo-form";
import { FrotasShell } from "../frotas-shell";
import { FrotasToasts } from "../frotas-toasts";
import { VeiculoFotoAvatarControl } from "../veiculo-foto-avatar-control";
import { VeiculoForm } from "../veiculo-form";
import { syncVeiculoConsultaAutomatica } from "../actions";
import { VehicleRealtimeSync } from "./vehicle-realtime-sync";

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
  { label: "Processando", status: "processing" },
  { label: "Falha", status: "consult_error" },
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
  const secretarias = await getSecretariaOptions(data.selectedPrefeituraId);
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
          secretarias={secretarias}
          showPrefeituraField={profile.role === "bdl_admin"}
        />
      }
      icon={Car}
      prefeituras={data.prefeituras}
      profile={profile}
      selectedPrefeituraId={data.selectedPrefeituraId}
      title="Veículos"
    >
      <VehicleRealtimeSync prefeituraId={data.selectedPrefeituraId} />
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
                                  {veiculo.marca} · {veiculo.ano_modelo ?? veiculo.ano}
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
                                        href={`/frotas/veiculos/${veiculo.id}`}
                                        className={buttonVariants({
                                          variant: "ghost",
                                          size: "icon-sm",
                                        })}
                                        aria-label="Gestão do veículo"
                                      >
                                        <Settings className="size-4" />
                                      </Link>
                                    }
                                  />
                                  <TooltipContent>Gestão do veículo</TooltipContent>
                                </Tooltip>

                                {["processing", "consult_error"].includes(veiculo.status) ? (
                                  <Tooltip>
                                    <TooltipTrigger
                                      render={
                                        <form action={syncVeiculoConsultaAutomatica}>
                                          <input
                                            type="hidden"
                                            name="id"
                                            value={veiculo.id}
                                          />
                                          <Button
                                            type="submit"
                                            variant="ghost"
                                            size="icon-sm"
                                            aria-label="Sincronizar consulta"
                                          >
                                            <RefreshCw className="size-4" />
                                          </Button>
                                        </form>
                                      }
                                    />
                                    <TooltipContent>Sincronizar consulta</TooltipContent>
                                  </Tooltip>
                                ) : null}

                                {access.canUpdateVeiculos &&
                                veiculo.status !== "processing" ? (
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
                                    <DialogContent className="sm:max-w-5xl">
                                      <DialogHeader>
                                        <DialogTitle>Editar veículo</DialogTitle>
                                      </DialogHeader>
                                      <VeiculoForm
                                        prefeituras={data.prefeituras}
                                        secretarias={secretarias}
                                        selectedPrefeituraId={
                                          data.selectedPrefeituraId
                                        }
                                        showPrefeituraField={
                                          profile.role === "bdl_admin"
                                        }
                                        veiculo={veiculo}
                                      />
                                    </DialogContent>
                                  </Dialog>
                                ) : null}

                                {access.canDeleteVeiculos &&
                                veiculo.status !== "processing" ? (
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
                    secretarias={secretarias}
                    showPrefeituraField={profile.role === "bdl_admin"}
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
  secretarias,
  showPrefeituraField,
}: {
  access: Awaited<ReturnType<typeof getFrotasPermissionAccess>>;
  buildFilterHref: (values: {
    prefeitura?: string | null;
    status?: string | null;
  }) => string;
  data: Awaited<ReturnType<typeof getFrotasData>>;
  params: Awaited<PageProps["searchParams"]>;
  secretarias: Awaited<ReturnType<typeof getSecretariaOptions>>;
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
          <DialogContent className="sm:max-w-5xl">
            <DialogHeader>
              <DialogTitle>Novo veículo</DialogTitle>
            </DialogHeader>
            <VeiculoForm
              prefeituras={data.prefeituras}
              secretarias={secretarias}
              selectedPrefeituraId={data.selectedPrefeituraId}
              showPrefeituraField={showPrefeituraField}
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
  secretarias,
  showPrefeituraField,
  selectedPrefeituraId,
}: {
  canCreate: boolean;
  prefeituras: Awaited<ReturnType<typeof getFrotasData>>["prefeituras"];
  secretarias: Awaited<ReturnType<typeof getSecretariaOptions>>;
  showPrefeituraField: boolean;
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
          <DialogContent className="sm:max-w-5xl">
            <DialogHeader>
              <DialogTitle>Novo veículo</DialogTitle>
            </DialogHeader>
            <VeiculoForm
              prefeituras={prefeituras}
              secretarias={secretarias}
              selectedPrefeituraId={selectedPrefeituraId}
              showPrefeituraField={showPrefeituraField}
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
                  {veiculo.marca} · {veiculo.ano_modelo ?? veiculo.ano}
                </div>
                <div className="text-xs text-muted-foreground">
                  {veiculo.situacao_veicular ?? "Situação não informada"} ·{" "}
                  {veiculo.licenciado ?? "Licenciamento não informado"}
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
                {veiculo.cor ? (
                  <Badge variant="outline" className="font-normal">
                    {veiculo.cor}
                  </Badge>
                ) : null}
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
              label="Débitos"
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
            <CompactDetail label="Espécie" value={veiculo.especie ?? "-"} />
            <CompactDetail label="Categoria" value={veiculo.categoria ?? "-"} />
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
            <CompactDetail label="Cor" value={veiculo.cor ?? "-"} />
            <CompactDetail
              label="Ano fabricação"
              value={veiculo.ano_fabricacao ? String(veiculo.ano_fabricacao) : "-"}
            />
            <CompactDetail
              label="Ano modelo"
              value={veiculo.ano_modelo ? String(veiculo.ano_modelo) : "-"}
            />
            <CompactDetail label="Lugares" value={veiculo.lugares ?? "-"} />
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
                Débitos
              </div>
              <VehicleDueDates vencimentos={veiculo.vencimentos} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border p-2.5">
          <div className="flex items-center gap-2 text-xs font-medium">
            <Hash className="size-3.5 text-muted-foreground" />
            Dados oficiais
          </div>
          <div className="mt-2 grid gap-1.5">
            <CompactDetail
              label="Data aquisição"
              value={formatVehicleDate(veiculo.data_aquisicao)}
            />
            <CompactDetail
              label="Município emplacamento"
              value={veiculo.municipio_emplacamento ?? "-"}
            />
            <CompactDetail
              label="Situação"
              value={veiculo.situacao_veicular ?? "-"}
            />
            <CompactDetail
              label="Licenciado"
              value={veiculo.licenciado ?? "-"}
            />
            <CompactDetail
              label="Origem"
              value={veiculo.origem_dados ?? "Cadastro"}
            />
          </div>
        </div>

        <div className="rounded-lg border p-2.5">
          <div className="flex items-center gap-2 text-xs font-medium">
            <Car className="size-3.5 text-muted-foreground" />
            Proprietários e restrições
          </div>
          <div className="mt-2 grid gap-1.5">
            <CompactDetail
              label="Proprietário atual"
              value={veiculo.proprietario_atual ?? "-"}
            />
            <CompactDetail
              label="Proprietário anterior"
              value={veiculo.proprietario_anterior ?? "-"}
            />
            <CompactDetail
              label="Restrição venda"
              value={veiculo.restricao_venda ?? "-"}
            />
            <CompactDetail
              label="Principal condutor"
              value={veiculo.principal_condutor ?? "-"}
            />
          </div>
        </div>
      </div>

      {veiculo.restricoes || veiculo.observacoes ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {veiculo.restricoes ? (
            <div className="rounded-lg border p-2.5">
              <div className="text-xs font-medium">Restrições</div>
              <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">
                {veiculo.restricoes}
              </p>
            </div>
          ) : null}
          {veiculo.observacoes ? (
            <div className="rounded-lg border p-2.5">
              <div className="text-xs font-medium">Observações</div>
              <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">
                {veiculo.observacoes}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
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

function formatMileage(value: number | null) {
  if (value === null) {
    return "-";
  }

  return `${new Intl.NumberFormat("pt-BR").format(value)} km`;
}

function formatVehicleDate(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00.000Z`));
}

function VehicleStatusBadge({ status }: { status: VeiculoStatus }) {
  const styles: Record<VeiculoStatus, string> = {
    active:
      "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50",
    inactive:
      "border-zinc-200 bg-zinc-100 text-zinc-700 hover:bg-zinc-100",
    maintenance:
      "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-50",
    consult_error: "border-red-200 bg-red-50 text-red-700 hover:bg-red-50",
    processing: "border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-50",
  };
  const icons = {
    active: CircleCheck,
    consult_error: CircleX,
    inactive: CircleX,
    maintenance: Wrench,
    processing: Loader2,
  } satisfies Record<VeiculoStatus, typeof CircleCheck>;
  const Icon = icons[status];

  return (
    <Badge variant="outline" className={styles[status]}>
      <Icon className={status === "processing" ? "size-3.5 animate-spin" : "size-3.5"} />
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
    return <span className="text-sm text-muted-foreground">Sem débitos</span>;
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
