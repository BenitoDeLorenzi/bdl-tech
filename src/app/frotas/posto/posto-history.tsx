import { DatePickerInput } from "@/app/licencas/date-picker-input";
import Link from "next/link";
import { Eye, Fuel, ReceiptText, Search, CircleDollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button, buttonVariants } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Table, TableHeader, TableHead, TableRow, TableBody, TableCell } from "@/components/ui/table";
import type { FrotaAbastecimento } from "@/lib/frotas-data";
import { historyTotals } from "@/lib/posto-history";
import { OrdensRealtime } from "./ordens-realtime";
export const money = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
export const number = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
export const completedDate = (row: FrotaAbastecimento) => row.completed_at ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(row.completed_at)) : "Não informada";
export function PostoHistory({ orders, q, from, to }: { orders: FrotaAbastecimento[]; q?: string; from: string; to: string }) {
  const totals = historyTotals(orders);
  return <>
    <section aria-label="Totais dos resultados" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {[{ label:"Abastecimentos", value:String(totals.count), icon:ReceiptText },{ label:"Combustível", value:`${number(totals.liters)} L`, icon:Fuel },{ label:"ARLA", value:`${number(totals.arla)} L`, icon:Fuel },{ label:"Total abastecido", value:money(totals.value), icon:CircleDollarSign }].map(({label,value,icon:Icon})=><Card key={label}><CardContent className="flex items-center gap-3"><span className="rounded-lg bg-sky-500/10 p-2 text-sky-700 dark:text-sky-400"><Icon className="size-5" /></span><div><div className="text-xs text-muted-foreground">{label}</div><div className="text-xl font-semibold tabular-nums">{value}</div></div></CardContent></Card>)}
    </section>
    <Card><CardHeader><CardTitle>Histórico de abastecimentos</CardTitle><OrdensRealtime nextExpiry={null} /></CardHeader><CardContent className="space-y-4">
      <form className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_160px_160px_auto_auto]">
        <input type="hidden" name="tab" value="history" />
        <label className="space-y-1 text-sm"><span>Buscar</span><Input name="q" defaultValue={q} placeholder="Ordem, placa, veículo ou motorista" /></label>
        <DatePickerInput key={`from-${from}`} id="history-from" name="from" label="Conclusão de" defaultValue={from} />
        <DatePickerInput key={`to-${to}`} id="history-to" name="to" label="Até" defaultValue={to} />
        <Button type="submit" variant="outline"><Search className="size-4" />Filtrar</Button>
        <Link href="/frotas/posto?tab=history" className={buttonVariants({variant:"outline"})}>Limpar</Link>
      </form>
      {from && to && from > to ? <p role="alert" className="text-sm text-destructive">A data inicial deve ser anterior ou igual à data final.</p> : null}
      <p className="text-xs text-muted-foreground">Totais dos resultados exibidos{!from && !to ? " · Todo o período" : ""}. Valores abastecidos, sem indicação de pagamento.</p>
      {orders.length ? <div className="overflow-hidden rounded-lg border"><Table><TableHeader><TableRow><TableHead>Ordem</TableHead><TableHead>Veículo</TableHead><TableHead>Motorista</TableHead><TableHead>Conclusão</TableHead><TableHead>Litros</TableHead><TableHead className="text-right">Valor</TableHead><TableHead>Nota fiscal</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader><TableBody>
        {orders.map(row=><TableRow key={row.id}><TableCell className="font-medium">{row.numero_ordem}</TableCell><TableCell><div className="font-medium">{row.modelo}</div><div className="text-xs text-muted-foreground">{row.marca} · {row.placa}</div></TableCell><TableCell>{row.motorista}</TableCell><TableCell>{completedDate(row)}</TableCell><TableCell>{number(row.litros??0)} L{row.arla_litros ? <div className="text-xs text-muted-foreground">ARLA: {number(row.arla_litros)} L</div> : null}</TableCell><TableCell className="text-right tabular-nums">{money(row.valor_total??0)}</TableCell><TableCell>{row.numero_nota_fiscal??"-"}</TableCell><TableCell className="text-right"><Tooltip><TooltipTrigger render={<Link href={`/frotas/posto/historico/${row.id}`} aria-label={`Ver abastecimento ${row.numero_ordem}`} className={buttonVariants({variant:"ghost",size:"icon-sm"})}><Eye className="size-4" /></Link>} /><TooltipContent>Ver abastecimento</TooltipContent></Tooltip></TableCell></TableRow>)}
      </TableBody></Table></div> : <div className="rounded-lg bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">Nenhum abastecimento concluído encontrado para os filtros selecionados.</div>}
    </CardContent></Card>
  </>;
}
