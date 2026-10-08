import {
  Percent,
  Banknote,
  QrCode,
  CreditCard,
  CircleCheck,
} from "lucide-react";
import { getGestaoContext, getTaxasRecebimento } from "@/lib/gestao-data";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { GestaoShell } from "../gestao-shell";
import { Panel, MetricBadge, GestaoDialog, Empty } from "../ui";
import { TaxaForm } from "./taxa-form";

const formas = [
  { nome: "Dinheiro", icon: Banknote },
  { nome: "Pix", icon: QrCode },
  { nome: "Débito", icon: CreditCard },
  { nome: "Crédito", icon: CreditCard },
];
export default async function TaxasPage() {
  const [{ unidade, gestor }, taxas] = await Promise.all([
    getGestaoContext(),
    getTaxasRecebimento(),
  ]);
  return (
    <GestaoShell title="Taxas" icon={Percent}>
      <Panel
        title="Taxas por forma de pagamento"
        icon={Percent}
        description={`Taxas padrão para novos fechamentos${unidade ? ` · ${unidade.nome}` : ""}. Os registros já salvos mantêm suas taxas.`}
        metrics={
          <MetricBadge
            label="Formas de pagamento"
            value={4}
            icon={CircleCheck}
            tone="info"
          />
        }
      >
        {!unidade ? (
          <Empty
            title="Selecione um estabelecimento"
            description="Vincule uma empresa com licença vigente para configurar as taxas."
          />
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Forma de pagamento</TableHead>
                  <TableHead className="text-right">Taxa padrão</TableHead>
                  {gestor && (
                    <TableHead className="w-[128px] text-right">
                      Ações
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {formas.map(({ nome, icon: Icon }) => {
                  const taxa = taxas.find((t) => t.forma === nome);
                  const percentual = Number(taxa?.percentual ?? 0);
                  return (
                    <TableRow key={nome}>
                      <TableCell>
                        <div className="flex items-center gap-2 font-medium">
                          <Icon className="size-4 text-muted-foreground" />
                          {nome}
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {percentual.toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                        })}
                        %
                      </TableCell>
                      {gestor && (
                        <TableCell className="text-right">
                          <GestaoDialog
                            editing
                            title={`Taxa de ${nome}`}
                            label={`Editar taxa de ${nome}`}
                            description="Configure o desconto percentual sobre o recebimento bruto."
                          >
                            <TaxaForm
                              key={taxa?.versao ?? 0}
                              unidadeId={unidade.id}
                              forma={nome}
                              percentual={percentual}
                              versao={taxa?.versao ?? 0}
                            />
                          </GestaoDialog>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Panel>
    </GestaoShell>
  );
}
