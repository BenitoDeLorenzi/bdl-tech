import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Car,
  CircleAlert,
  CircleCheck,
  CircleDollarSign,
  CircleX,
  FileText,
  Fuel,
  Gauge,
  Hash,
  Loader2,
  Paperclip,
  Pencil,
  Plus,
  ShieldAlert,
  Wrench,
} from "lucide-react";

import { AnexosManagerForm } from "@/app/frotas/anexos-manager-form";
import { DebitoManualForm } from "@/app/frotas/debito-manual-form";
import { FrotasShell } from "@/app/frotas/frotas-shell";
import { MultaManualForm } from "@/app/frotas/multa-manual-form";
import { VehicleRealtimeSync } from "@/app/frotas/veiculos/vehicle-realtime-sync";
import { VeiculoFotoAvatarControl } from "@/app/frotas/veiculo-foto-avatar-control";
import { VeiculoForm } from "@/app/frotas/veiculo-form";
import { VencimentoDataForm } from "@/app/frotas/vencimento-data-form";
import { VencimentoPagamentoForm } from "@/app/frotas/vencimento-pagamento-form";
import { requireUserProfile } from "@/lib/auth-data";
import {
  formatAbastecimentoStatus,
  formatFrotaDate,
  formatFrotaDaysRemaining,
  formatManutencaoStatus,
  formatVeiculoStatus,
  formatVencimentoTipo,
  getFrotasData,
  getVeiculoConsultaVeicularData,
  getVeiculoDebitosData,
  type AbastecimentoStatus,
  type FrotaDebitoVeicular,
  type FrotaMultaVeicular,
  type FrotaProcessoVeicular,
  type FrotaRecursoInfracao,
  type FrotaVeiculo,
  type FrotaVeiculoAbastecimento,
  type FrotaVeiculoManutencao,
  type FrotaVencimento,
  type PagamentoStatus,
  type VeiculoStatus,
} from "@/lib/frotas-data";
import { getFrotasPermissionAccess } from "@/lib/frotas-permissions";
import { getSecretariaOptions } from "@/lib/secretarias-data";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function VeiculoGestaoPage({ params }: PageProps) {
  const profile = await requireUserProfile();
  const access = await getFrotasPermissionAccess(profile);
  const { id } = await params;
  const data = await getFrotasData({ veiculoId: id });
  const debitosData = await getVeiculoDebitosData(id);
  const consultaVeicularData = await getVeiculoConsultaVeicularData(id);
  const veiculo = data.veiculos[0];

  if (!veiculo) {
    notFound();
  }

  const secretarias = await getSecretariaOptions(veiculo.prefeitura_id);
  const totalDebitos = data.vencimentos.length + debitosData.debitos.length;
  const title = `${veiculo.marca} ${veiculo.modelo} · ${veiculo.placa}`;

  return (
    <FrotasShell
      active="veiculos"
      actions={
        <div className="flex items-center justify-end gap-2">
          <Link
            href="/frotas/veiculos"
            className={buttonVariants({
              variant: "outline",
              className: "h-9 gap-2",
            })}
          >
            <ArrowLeft className="size-4" />
            Voltar
          </Link>
          {access.canUpdateVeiculos ? (
            <Dialog>
              <DialogTrigger
                className={buttonVariants({
                  className: "h-9 gap-2",
                })}
              >
                <Pencil className="size-4" />
                Editar
              </DialogTrigger>
              <DialogContent className="sm:max-w-4xl">
                <DialogHeader>
                  <DialogTitle>Editar veículo</DialogTitle>
                </DialogHeader>
                <VeiculoForm
                  prefeituras={data.prefeituras}
                  secretarias={secretarias}
                  selectedPrefeituraId={veiculo.prefeitura_id}
                  showPrefeituraField={profile.role === "bdl_admin"}
                  veiculo={veiculo}
                />
              </DialogContent>
            </Dialog>
          ) : null}
        </div>
      }
      icon={Car}
      prefeituras={data.prefeituras}
      profile={profile}
      selectedPrefeituraId={veiculo.prefeitura_id}
      title={title}
    >
      <VehicleRealtimeSync
        prefeituraId={veiculo.prefeitura_id}
        vehicleId={veiculo.id}
      />
      <main className="flex flex-1 flex-col gap-3 p-4">
        <VehicleHero canUpdate={access.canUpdateVeiculos} veiculo={veiculo} />

        <Tabs defaultValue="resumo" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="resumo">
              <Car className="size-4" />
              Resumo
            </TabsTrigger>
            <TabsTrigger value="debitos">
              <CircleDollarSign className="size-4" />
              Débitos
            </TabsTrigger>
            <TabsTrigger value="multas">
              <ShieldAlert className="size-4" />
              Multas
            </TabsTrigger>
            <TabsTrigger value="processos">
              <FileText className="size-4" />
              Processos
            </TabsTrigger>
            <TabsTrigger value="manutencoes">
              <Wrench className="size-4" />
              Manutenção
            </TabsTrigger>
            <TabsTrigger value="abastecimentos">
              <Fuel className="size-4" />
              Abastecimento
            </TabsTrigger>
            <TabsTrigger value="anexos">
              <Paperclip className="size-4" />
              Anexos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="resumo">
            <VehicleSummary veiculo={veiculo} />
          </TabsContent>

          <TabsContent value="debitos">
            <VehicleDebitsTab
              automaticDebts={debitosData.debitos}
              canManage={access.canManageVencimentos}
              manualDebts={data.vencimentos}
              totalDebitos={totalDebitos}
              veiculo={veiculo}
            />
          </TabsContent>

          <TabsContent value="multas">
            <VehicleFinesTab
              canManage={access.canManageVeiculos}
              multas={consultaVeicularData.multas}
              veiculo={veiculo}
            />
          </TabsContent>

          <TabsContent value="processos">
            <VehicleProcessesTab
              processos={consultaVeicularData.processos}
              recursos={consultaVeicularData.recursos}
            />
          </TabsContent>

          <TabsContent value="manutencoes">
            <VehicleMaintenanceHistory manutencoes={veiculo.manutencoes} />
          </TabsContent>

          <TabsContent value="abastecimentos">
            <VehicleFuelHistory abastecimentos={veiculo.abastecimentos} />
          </TabsContent>

          <TabsContent value="anexos">
            <Card>
              <CardHeader>
                <CardTitle>Anexos</CardTitle>
                <CardDescription>
                  Documentos vinculados ao veículo {veiculo.placa}.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {access.canUpdateVeiculos ? (
                  <AnexosManagerForm
                    anexos={veiculo.anexos}
                    ownerId={veiculo.id}
                    ownerLabel="veículo"
                    type="veiculo"
                  />
                ) : (
                  <ReadOnlyAttachments veiculo={veiculo} />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </FrotasShell>
  );
}

function VehicleHero({
  canUpdate,
  veiculo,
}: {
  canUpdate: boolean;
  veiculo: FrotaVeiculo;
}) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
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
                <h2 className="truncate text-xl font-semibold">
                  {veiculo.modelo}
                </h2>
                <VehicleStatusBadge status={veiculo.status} />
              </div>
              <div className="text-sm text-muted-foreground">
                {veiculo.marca} · {veiculo.ano_modelo ?? veiculo.ano} ·{" "}
                {veiculo.secretaria || "Sem secretaria"}
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="font-normal">
                  <Hash className="size-3.5" />
                  {veiculo.placa}
                </Badge>
                <Badge variant="outline" className="font-normal">
                  Renavam {veiculo.renavam ?? "-"}
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

          <div className="grid gap-2 sm:grid-cols-2 lg:w-[420px]">
            <CompactDetail label="Prefeitura" value={veiculo.prefeitura_nome} />
            <CompactDetail label="Tipo" value={veiculo.tipo} />
            <CompactDetail label="Categoria" value={veiculo.categoria ?? "-"} />
            <CompactDetail label="Cor" value={veiculo.cor ?? "-"} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function VehicleDebitsTab({
  automaticDebts,
  canManage,
  manualDebts,
  totalDebitos,
  veiculo,
}: {
  automaticDebts: FrotaDebitoVeicular[];
  canManage: boolean;
  manualDebts: FrotaVencimento[];
  totalDebitos: number;
  veiculo: FrotaVeiculo;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Débitos</CardTitle>
            <CardDescription>
              Cadastro manual e retornos de integração em uma única lista.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{totalDebitos} débito(s)</Badge>
            {canManage ? (
              <Dialog>
                <DialogTrigger
                  className={buttonVariants({
                    className: "h-9 gap-2",
                  })}
                >
                  <Plus className="size-4" />
                  Novo débito
                </DialogTrigger>
                <DialogContent className="sm:max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Novo débito</DialogTitle>
                    <DialogDescription>
                      Cadastre manualmente um débito de {veiculo.modelo} ·{" "}
                      {veiculo.placa}.
                    </DialogDescription>
                  </DialogHeader>
                  <DebitoManualForm veiculoId={veiculo.id} />
                </DialogContent>
              </Dialog>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {totalDebitos ? (
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Débito</TableHead>
                  <TableHead>Data limite</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead>Pagamento</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead className="w-[92px] text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {manualDebts.map((vencimento) => (
                  <TableRow key={vencimento.id}>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <div className="font-medium">
                          {formatVencimentoTipo(vencimento.tipo)}
                        </div>
                        <div className="max-w-[260px] truncate text-xs text-muted-foreground">
                          {vencimento.descricao ?? "Cadastro manual"}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {formatFrotaDate(vencimento.data_vencimento)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {vencimento.valor ? formatCurrency(vencimento.valor) : "-"}
                    </TableCell>
                    <TableCell>
                      <VencimentoSituationBadge
                        days={vencimento.dias_restantes}
                      />
                    </TableCell>
                    <TableCell>
                      <PaymentSummary vencimento={vencimento} />
                    </TableCell>
                    <TableCell>
                      <DebtOriginBadge origem={vencimento.origem} />
                    </TableCell>
                    <TableCell>
                      <VencimentoActions
                        canManage={canManage}
                        vencimento={vencimento}
                      />
                    </TableCell>
                  </TableRow>
                ))}
                {automaticDebts.map((debito) => (
                  <TableRow key={debito.id}>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <div className="font-medium">
                          {debito.title ?? "Débito veicular"}
                        </div>
                        <div className="max-w-[260px] truncate text-xs text-muted-foreground">
                          {formatExternalDebtType(debito.type)}
                          {debito.description ? ` · ${debito.description}` : ""}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {debito.due_date ? formatExternalDate(debito.due_date) : "-"}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(debito.amount)}
                    </TableCell>
                    <TableCell>
                      <ExternalDebtStatusBadge debito={debito} />
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        Aguardando conciliação
                      </span>
                    </TableCell>
                    <TableCell>
                      <DebtOriginBadge origem="api" />
                    </TableCell>
                    <TableCell>
                      <div className="text-right text-xs text-muted-foreground">
                        Consulta
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="flex min-h-[240px] flex-col items-center justify-center rounded-lg border bg-muted/20 p-8 text-center">
            <CircleDollarSign className="size-8 text-muted-foreground" />
            <h3 className="mt-3 text-base font-semibold">
              Nenhum débito encontrado
            </h3>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Cadastre um débito manualmente ou aguarde o retorno da consulta
              automática quando a integração estiver ativa.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function VencimentoActions({
  canManage,
  vencimento,
}: {
  canManage: boolean;
  vencimento: FrotaVencimento;
}) {
  if (!canManage) {
    return (
      <div className="text-right text-xs text-muted-foreground">
        Somente leitura
      </div>
    );
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
                aria-label="Registrar pagamento"
              >
                <CircleDollarSign className="size-4" />
              </DialogTrigger>
            }
          />
          <TooltipContent>Registrar pagamento</TooltipContent>
        </Tooltip>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Registrar pagamento</DialogTitle>
            <DialogDescription>
              Informe valor, forma de pagamento e parcelas de{" "}
              {formatVencimentoTipo(vencimento.tipo)} do veículo{" "}
              {vencimento.placa}.
            </DialogDescription>
          </DialogHeader>
          <VencimentoPagamentoForm vencimento={vencimento} />
        </DialogContent>
      </Dialog>

      <Dialog>
        <Tooltip>
          <TooltipTrigger
            render={
              <DialogTrigger
                className={buttonVariants({
                  variant: "ghost",
                  size: "icon-sm",
                })}
                aria-label="Editar débito"
              >
                <Pencil className="size-4" />
              </DialogTrigger>
            }
          />
          <TooltipContent>Editar débito</TooltipContent>
        </Tooltip>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar débito</DialogTitle>
            <DialogDescription>
              Ajuste a data limite de {formatVencimentoTipo(vencimento.tipo)} do
              veículo {vencimento.placa}.
            </DialogDescription>
          </DialogHeader>
          <VencimentoDataForm vencimento={vencimento} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PaymentSummary({ vencimento }: { vencimento: FrotaVencimento }) {
  if (!vencimento.ultimo_pagamento) {
    return (
      <span className="text-sm text-muted-foreground">Ainda não pago</span>
    );
  }

  return (
    <div>
      <div className="font-medium">
        {formatFrotaDate(vencimento.ultimo_pagamento)}
      </div>
      <div className="mt-1 flex items-center gap-1.5">
        <PaymentStatusBadge status={vencimento.ultimo_pagamento_status} />
        {vencimento.ultimo_pagamento_valor ? (
          <span className="text-xs text-muted-foreground">
            {formatCurrency(vencimento.ultimo_pagamento_valor)}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function VencimentoSituationBadge({ days }: { days: number }) {
  const className =
    days < 0
      ? "border-red-200 bg-red-600 text-white hover:bg-red-600"
      : days <= 7
        ? "border-red-200 bg-red-100 text-red-700 hover:bg-red-100"
        : days <= 15
          ? "border-orange-200 bg-orange-100 text-orange-700 hover:bg-orange-100"
          : days <= 30
            ? "border-yellow-200 bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
            : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50";
  const Icon = days < 0 ? CircleX : days <= 30 ? CircleAlert : CircleCheck;

  return (
    <Badge variant="outline" className={className}>
      <Icon className="size-3.5" />
      {formatFrotaDaysRemaining(days)}
    </Badge>
  );
}

function PaymentStatusBadge({ status }: { status: PagamentoStatus | null }) {
  const label: Record<PagamentoStatus, string> = {
    paid: "Quitado",
    partial: "Parcial",
    pending: "Pendente",
  };
  const className: Record<PagamentoStatus, string> = {
    paid: "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50",
    partial: "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-50",
    pending: "border-zinc-200 bg-zinc-100 text-zinc-700 hover:bg-zinc-100",
  };
  const normalizedStatus = status ?? "paid";

  return (
    <Badge variant="outline" className={className[normalizedStatus]}>
      {normalizedStatus === "paid" ? (
        <CircleCheck className="size-3.5" />
      ) : (
        <CircleAlert className="size-3.5" />
      )}
      {label[normalizedStatus]}
    </Badge>
  );
}

function ExternalDebtStatusBadge({ debito }: { debito: FrotaDebitoVeicular }) {
  if (debito.is_expired) {
    return (
      <Badge
        variant="outline"
        className="border-red-200 bg-red-100 text-red-700 hover:bg-red-100"
      >
        <CircleX className="size-3.5" />
        Vencido
      </Badge>
    );
  }

  if (debito.required) {
    return (
      <Badge
        variant="outline"
        className="border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-50"
      >
        <CircleAlert className="size-3.5" />
        Obrigatório
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50"
    >
      <CircleCheck className="size-3.5" />
      Em aberto
    </Badge>
  );
}

function DebtOriginBadge({ origem }: { origem: string }) {
  const isAutomatic = origem === "api" || origem === "plexi";

  return (
    <Badge
      variant="outline"
      className={
        isAutomatic
          ? "border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-50"
          : "border-zinc-200 bg-zinc-100 text-zinc-700 hover:bg-zinc-100"
      }
    >
      {isAutomatic ? "Automático" : "Manual"}
    </Badge>
  );
}

function formatExternalDebtType(type: string | null) {
  const labels: Record<string, string> = {
    dpvat: "Seguro",
    ipva: "IPVA",
    licensing: "Licenciamento",
    ticket: "Multa",
  };

  if (!type) {
    return "Débito";
  }

  return labels[type.toLowerCase()] ?? type;
}

function formatExternalDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
  }).format(new Date(value));
}

function VehicleSummary({ veiculo }: { veiculo: FrotaVeiculo }) {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Identificação</CardTitle>
          <CardDescription>Dados principais do documento.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2">
          <CompactDetail label="Renavam" value={veiculo.renavam ?? "-"} />
          <CompactDetail label="Placa" value={veiculo.placa} />
          <CompactDetail
            label="Exercício"
            value={veiculo.exercicio ? String(veiculo.exercicio) : "-"}
          />
          <CompactDetail
            label="Ano fabricação"
            value={veiculo.ano_fabricacao ? String(veiculo.ano_fabricacao) : "-"}
          />
          <CompactDetail
            label="Ano modelo"
            value={veiculo.ano_modelo ? String(veiculo.ano_modelo) : "-"}
          />
          <CompactDetail label="Tipo" value={veiculo.tipo} />
          <CompactDetail label="Espécie" value={veiculo.especie ?? "-"} />
          <CompactDetail label="Combustível" value={veiculo.combustivel ?? "-"} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Características</CardTitle>
          <CardDescription>Informações físicas e operacionais.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2">
          <CompactDetail label="Marca" value={veiculo.marca} />
          <CompactDetail label="Modelo" value={veiculo.modelo} />
          <CompactDetail label="Versão" value={veiculo.versao ?? "-"} />
          <CompactDetail label="Cor" value={veiculo.cor ?? "-"} />
          <CompactDetail label="Categoria" value={veiculo.categoria ?? "-"} />
          <CompactDetail label="Capacidade" value={veiculo.capacidade ?? "-"} />
          <CompactDetail label="Potência" value={veiculo.potencia ?? "-"} />
          <CompactDetail label="Cilindrada" value={veiculo.cilindrada ?? "-"} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Registro</CardTitle>
          <CardDescription>Localização e vínculo municipal.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2">
          <CompactDetail label="Prefeitura" value={veiculo.prefeitura_nome} />
          <CompactDetail label="Secretaria" value={veiculo.secretaria || "-"} />
          <CompactDetail label="Local" value={veiculo.local_registro ?? "-"} />
          <CompactDetail
            label="Data"
            value={formatVehicleDate(veiculo.data_documento)}
          />
          <CompactDetail
            label="Município"
            value={veiculo.municipio_emplacamento ?? "-"}
          />
          <CompactDetail
            label="Situação"
            value={veiculo.situacao_veicular ?? "-"}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Proprietário</CardTitle>
          <CardDescription>Dados de titularidade e restrições.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2">
          <CompactDetail
            label="Proprietário"
            value={veiculo.proprietario_atual ?? "-"}
          />
          <CompactDetail
            label="CPF/CNPJ"
            value={veiculo.proprietario_documento ?? "-"}
          />
          <CompactDetail
            label="Restrição de venda"
            value={veiculo.restricao_venda ?? "-"}
          />
          <CompactDetail label="Restrições" value={veiculo.restricoes ?? "-"} />
        </CardContent>
      </Card>
    </div>
  );
}

function VehicleMaintenanceHistory({
  manutencoes,
}: {
  manutencoes: FrotaVeiculoManutencao[];
}) {
  if (!manutencoes.length) {
    return (
      <EmptyTab
        icon={Wrench}
        title="Nenhuma manutenção registrada"
        description="Quando este veículo passar por manutenção, o histórico aparecerá aqui."
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Histórico de manutenção</CardTitle>
        <CardDescription>
          Registros ordenados do mais recente para o mais antigo.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {manutencoes.map((manutencao) => (
          <div key={manutencao.id} className="rounded-lg border p-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{manutencao.tipo}</Badge>
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
              <div className="grid grid-cols-2 gap-2 md:min-w-56">
                <MetricTile
                  label="Valor"
                  value={manutencao.valor ? formatCurrency(manutencao.valor) : "-"}
                />
                <MetricTile
                  label="Km"
                  value={formatMileage(manutencao.quilometragem)}
                />
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function VehicleFuelHistory({
  abastecimentos,
}: {
  abastecimentos: FrotaVeiculoAbastecimento[];
}) {
  if (!abastecimentos.length) {
    return (
      <EmptyTab
        icon={Fuel}
        title="Nenhum abastecimento registrado"
        description="Ordens emitidas e abastecimentos concluídos aparecerão aqui."
      />
    );
  }

  const totalGeral = abastecimentos.reduce(
    (total, abastecimento) => total + getFuelOrderTotal(abastecimento),
    0
  );
  const concluidas = abastecimentos.filter(
    (abastecimento) => abastecimento.status === "completed"
  ).length;
  const consumoMedio = calculateAverageFuelConsumption(abastecimentos);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Histórico de abastecimento</CardTitle>
        <CardDescription>
          Ordens e lançamentos vinculados a este veículo.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="grid gap-3 sm:grid-cols-4">
          <MetricTile label="Ordens" value={String(abastecimentos.length)} />
          <MetricTile label="Concluídas" value={String(concluidas)} />
          <MetricTile label="Média" value={formatFuelAverage(consumoMedio)} />
          <MetricTile label="Total" value={formatCurrency(totalGeral)} />
        </div>
        {abastecimentos.map((abastecimento) => (
          <div key={abastecimento.id} className="rounded-lg border p-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{abastecimento.numero_ordem}</Badge>
                  <FuelStatusBadge status={abastecimento.status} />
                  {abastecimento.arla_incluso ? (
                    <Badge variant="secondary">ARLA</Badge>
                  ) : null}
                </div>
                <div className="mt-2 font-medium">
                  {abastecimento.posto_nome || "Posto não informado"}
                </div>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span>
                    Data: {formatFrotaDate(abastecimento.data_abastecimento)}
                  </span>
                  <span>Motorista: {abastecimento.motorista || "-"}</span>
                  {abastecimento.numero_nota_fiscal ? (
                    <span>NF: {abastecimento.numero_nota_fiscal}</span>
                  ) : null}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 md:min-w-56">
                <MetricTile
                  label="Total"
                  value={formatCurrency(getFuelOrderTotal(abastecimento))}
                />
                <MetricTile
                  label="Km"
                  value={formatMileage(abastecimento.quilometragem)}
                />
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function ReadOnlyAttachments({ veiculo }: { veiculo: FrotaVeiculo }) {
  if (!veiculo.anexos.length) {
    return (
      <EmptyTab
        icon={Paperclip}
        title="Nenhum anexo registrado"
        description="Documentos do veículo aparecerão aqui quando forem cadastrados."
      />
    );
  }

  return (
    <div className="grid gap-2">
      {veiculo.anexos.map((anexo) => (
        <div
          key={anexo.id}
          className="flex items-center justify-between gap-3 rounded-lg border p-3"
        >
          <div className="flex min-w-0 items-center gap-3">
            <FileText className="size-4 text-muted-foreground" />
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">
                {anexo.file_name}
              </div>
              <div className="text-xs text-muted-foreground">
                {anexo.file_type ?? "Documento"}
              </div>
            </div>
          </div>
          <Badge variant="outline">Anexo</Badge>
        </div>
      ))}
    </div>
  );
}

function VehicleFinesTab({
  canManage,
  multas,
  veiculo,
}: {
  canManage: boolean;
  multas: FrotaMultaVeicular[];
  veiculo: FrotaVeiculo;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Multas</CardTitle>
            <CardDescription>
              Cadastro manual e retornos de integração em uma única lista.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{multas.length} multa(s)</Badge>
            {canManage ? (
              <Dialog>
                <DialogTrigger
                  className={buttonVariants({
                    className: "h-9 gap-2",
                  })}
                >
                  <Plus className="size-4" />
                  Nova multa
                </DialogTrigger>
                <DialogContent className="sm:max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Nova multa</DialogTitle>
                    <DialogDescription>
                      Cadastre manualmente uma multa de {veiculo.modelo} ·{" "}
                      {veiculo.placa}.
                    </DialogDescription>
                  </DialogHeader>
                  <MultaManualForm veiculoId={veiculo.id} />
                </DialogContent>
              </Dialog>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {multas.length ? (
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Auto</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {multas.map((multa) => (
                  <TableRow key={multa.id}>
                    <TableCell className="font-medium">
                      {multa.numero_auto}
                    </TableCell>
                    <TableCell>
                      {multa.data_infracao
                        ? formatVehicleDate(multa.data_infracao)
                        : "-"}
                      {multa.hora ? (
                        <div className="text-xs text-muted-foreground">
                          {multa.hora}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[360px]">
                        <div className="truncate font-medium">
                          {multa.descricao ?? "Infração não informada"}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                          {multa.local_complemento ?? "Local não informado"}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {multa.situacao ?? "Não informada"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <FineOriginBadge origem={multa.origem} />
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(multa.valor)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="flex min-h-[240px] flex-col items-center justify-center rounded-lg border bg-muted/20 p-8 text-center">
            <ShieldAlert className="size-8 text-muted-foreground" />
            <h3 className="mt-3 text-base font-semibold">
              Nenhuma multa registrada
            </h3>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Cadastre uma multa manualmente ou aguarde o retorno da consulta
              automática quando a integração estiver ativa.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function FineOriginBadge({
  origem,
}: {
  origem: FrotaMultaVeicular["origem"];
}) {
  const label = {
    historico: "Histórico",
    manual: "Manual",
    pagar: "A pagar",
  }[origem];

  return <Badge variant="outline">{label}</Badge>;
}

function VehicleProcessesTab({
  processos,
  recursos,
}: {
  processos: FrotaProcessoVeicular[];
  recursos: FrotaRecursoInfracao[];
}) {
  if (!processos.length && !recursos.length) {
    return (
      <EmptyTab
        icon={FileText}
        title="Nenhum processo registrado"
        description="Processos, recursos e serviços retornados pela consulta automática aparecerão aqui."
      />
    );
  }

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Processos</CardTitle>
          <CardDescription>Últimos processos vinculados ao veículo.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {processos.length ? (
            processos.map((processo) => (
              <div key={processo.id} className="rounded-lg border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium">
                      {processo.processo ?? "Processo sem número"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {processo.inicio_em ?? "-"} até {processo.final_em ?? "-"}
                    </div>
                  </div>
                  <Badge variant="outline">{processo.situacao ?? "Sem status"}</Badge>
                </div>
                {processo.servicos.length ? (
                  <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                    {processo.servicos.slice(0, 3).map((servico, index) => (
                      <div key={`${processo.id}-${index}`}>
                        {servico.nome ?? "Serviço"} · {servico.data ?? "-"}{" "}
                        {servico.hora ?? ""}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhum processo retornado.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recursos de infração</CardTitle>
          <CardDescription>Indicações e recursos vinculados às multas.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {recursos.length ? (
            recursos.map((recurso) => (
              <div key={recurso.id} className="rounded-lg border p-3">
                <div className="font-medium">
                  {recurso.processo ?? "Recurso sem processo"}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {recurso.detalhamento_infracao ?? "Detalhamento não informado"}
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  Auto: {recurso.numero_auto ?? "-"} · Resultado:{" "}
                  {recurso.resultado_processo || "Não informado"}
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhum recurso retornado.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function EmptyTab({
  description,
  icon: Icon,
  title,
}: {
  description: string;
  icon: typeof Car;
  title: string;
}) {
  return (
    <Card>
      <CardContent className="flex min-h-[260px] flex-col items-center justify-center p-8 text-center">
        <div className="flex size-12 items-center justify-center rounded-lg border bg-muted/30">
          <Icon className="size-6 text-muted-foreground" />
        </div>
        <h3 className="mt-4 text-base font-semibold">{title}</h3>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          {description}
        </p>
      </CardContent>
    </Card>
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
    <div className="rounded-lg border bg-background px-3 py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="truncate text-base font-semibold leading-tight">
        {value}
      </div>
    </div>
  );
}

function VehicleStatusBadge({ status }: { status: VeiculoStatus }) {
  const styles: Record<VeiculoStatus, string> = {
    active:
      "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50",
    inactive: "border-zinc-200 bg-zinc-100 text-zinc-700 hover:bg-zinc-100",
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

function FuelStatusBadge({ status }: { status: AbastecimentoStatus }) {
  const styles: Record<AbastecimentoStatus, string> = {
    cancelled: "border-zinc-200 bg-zinc-100 text-zinc-700 hover:bg-zinc-100",
    completed:
      "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50",
    expired: "border-red-200 bg-red-50 text-red-700 hover:bg-red-50",
    issued: "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-50",
  };

  return (
    <Badge variant="outline" className={styles[status]}>
      {formatAbastecimentoStatus(status)}
    </Badge>
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

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency",
  }).format(value);
}

function formatFuelAverage(value: number | null) {
  if (value === null) {
    return "-";
  }

  return `${new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 2,
  }).format(value)} km/L`;
}

function calculateAverageFuelConsumption(
  abastecimentos: FrotaVeiculoAbastecimento[]
) {
  const completedOrders = abastecimentos
    .filter(
      (abastecimento) =>
        abastecimento.status === "completed" &&
        Boolean(abastecimento.quilometragem) &&
        Boolean(abastecimento.litros)
    )
    .sort((a, b) => {
      const aTime = new Date(a.completed_at ?? a.created_at).getTime();
      const bTime = new Date(b.completed_at ?? b.created_at).getTime();
      return aTime - bTime;
    });

  let totalDistance = 0;
  let totalLiters = 0;

  completedOrders.forEach((order, index) => {
    const previous = completedOrders[index - 1];

    if (!previous?.quilometragem || !order.quilometragem || !order.litros) {
      return;
    }

    const distance = order.quilometragem - previous.quilometragem;

    if (distance <= 0) {
      return;
    }

    totalDistance += distance;
    totalLiters += order.litros;
  });

  if (totalDistance <= 0 || totalLiters <= 0) {
    return null;
  }

  return Math.round((totalDistance / totalLiters) * 100) / 100;
}

function getFuelOrderTotal(abastecimento: FrotaVeiculoAbastecimento) {
  return (abastecimento.valor_total ?? 0) + (abastecimento.arla_valor_total ?? 0);
}
