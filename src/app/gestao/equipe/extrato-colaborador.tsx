import Link from "next/link";
import {
  Eye,
  Wallet,
  Banknote,
  BriefcaseBusiness,
  CircleCheck,
  Undo2,
  ArrowUpRight,
} from "lucide-react";
import type { Colaborador, ExtratoEquipe } from "@/lib/gestao-equipe";
import { dataBR, dinheiro } from "@/lib/gestao-types";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { ListBadge } from "../ui";

export function ExtratoColaborador({
  colaborador,
  historico,
  saldo,
}: {
  colaborador: Colaborador;
  historico: ExtratoEquipe[];
  saldo: number;
}) {
  const validos = historico.filter((i) => !i.estornado);
  const total = (tipo: ExtratoEquipe["tipo"]) =>
    validos
      .filter((i) => i.tipo === tipo)
      .reduce((s, i) => s + Math.round(Number(i.valor) * 100), 0) / 100;
  return (
    <Dialog>
      <Tooltip>
        <TooltipTrigger
          render={
            <DialogTrigger
              aria-label={`Pagamentos e extrato de ${colaborador.nome}`}
              className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
            >
              <Eye className="size-4" />
            </DialogTrigger>
          }
        />
        <TooltipContent>Pagamentos e extrato</TooltipContent>
      </Tooltip>
      <DialogContent className="flex max-h-[90dvh] flex-col sm:max-w-4xl">
        <DialogHeader className="shrink-0 pr-6">
          <DialogTitle>{colaborador.nome}</DialogTitle>
          <DialogDescription>
            {colaborador.funcao} · Pagamentos e saldo do colaborador
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 space-y-4 overflow-y-auto">
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              {
                label: "Saldo a pagar",
                value: saldo,
                icon: Wallet,
                destaque: true,
              },
              {
                label: "Trabalhos registrados",
                value: total("trabalho"),
                icon: BriefcaseBusiness,
                destaque: false,
              },
              {
                label: "Total pago",
                value: total("pagamento"),
                icon: Banknote,
                destaque: false,
              },
            ].map(({ label, value, icon: Icon, destaque }) => (
              <div
                key={label}
                className={`rounded-xl border p-4 ${destaque ? "border-primary/20 bg-primary/5" : "bg-muted/20"}`}
              >
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Icon className="size-4" />
                  {label}
                </p>
                <p className="mt-2 text-xl font-semibold tabular-nums">
                  {dinheiro(value)}
                </p>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">
                Histórico de lançamentos
              </h3>
              <span className="text-xs text-muted-foreground">
                {historico.length} registros · mais recentes primeiro
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Trabalhos aumentam o saldo a pagar; pagamentos reduzem. Estornos
              não entram nos totais.
            </p>
            <div className="max-h-[42dvh] overflow-auto rounded-lg border [&_[data-slot=table-container]]:overflow-visible">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-muted">
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Lançamento</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Situação</TableHead>
                    <TableHead className="text-right">Origem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historico.map((i) => (
                    <TableRow key={i.id}>
                      <TableCell className="tabular-nums">
                        {dataBR(i.data)}
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-2 font-medium">
                          {i.tipo === "trabalho" ? (
                            <BriefcaseBusiness className="size-4 text-muted-foreground" />
                          ) : (
                            <Banknote className="size-4 text-muted-foreground" />
                          )}
                          {i.tipo === "trabalho" ? "Trabalho" : "Pagamento"}
                        </span>
                      </TableCell>
                      <TableCell
                        className={`text-right font-medium tabular-nums ${i.estornado ? "text-muted-foreground line-through" : i.tipo === "pagamento" ? "text-emerald-700 dark:text-emerald-300" : ""}`}
                      >
                        {i.tipo === "trabalho" ? "+" : "−"} {dinheiro(i.valor)}
                      </TableCell>
                      <TableCell>
                        <ListBadge
                          icon={i.estornado ? Undo2 : CircleCheck}
                          tone={i.estornado ? "warning" : "success"}
                        >
                          {i.estornado ? "Estornado" : "Confirmado"}
                        </ListBadge>
                        {i.estornado && i.motivo_estorno && (
                          <p className="mt-1 max-w-48 whitespace-normal text-xs text-muted-foreground">
                            {i.motivo_estorno}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {i.fechamento_id ? (
                          <Link
                            href={`/gestao/fechamentos/${i.fechamento_id}`}
                            className={buttonVariants({
                              variant: "ghost",
                              size: "sm",
                            })}
                          >
                            Fechamento
                            <ArrowUpRight className="size-3.5" />
                          </Link>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Registro anterior
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!historico.length && (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="h-28 text-center text-muted-foreground"
                      >
                        Nenhum trabalho ou pagamento registrado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
