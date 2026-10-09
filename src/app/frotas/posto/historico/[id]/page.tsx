import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText, Fuel } from "lucide-react";
import { requirePostoSession } from "@/lib/posto-auth";
import { getAbastecimentosData } from "@/lib/frotas-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { PrintReceiptButton } from "../../print-receipt-button";
import { money, number, completedDate } from "../../posto-history";
export const dynamic = "force-dynamic";
export default async function Receipt({ params }: { params: Promise<{id:string}> }) {
  const session = await requirePostoSession();
  const {id} = await params;
  const data = await getAbastecimentosData({ postoId:session.id, prefeituraId:session.prefeitura_id, status:"completed", orderId:id });
  const order = data.abastecimentos.find(row => row.id === id && row.posto_id === session.id && row.prefeitura_id === session.prefeitura_id && row.status === "completed");
  if (!order) notFound();
  const fields = [
    ["Veículo",`${order.modelo} · ${order.marca} · ${order.placa}`], ["Motorista",order.motorista],
    ["Conclusão",completedDate(order)],["Confirmado por",order.concluido_por??"-"],
    ["Combustível",order.combustivel],["Quilometragem",`${number(order.quilometragem??0)} km`],
    ["Litros de combustível",`${number(order.litros??0)} L`],["Preço por litro",money(order.valor_litro??0)],
    ["ARLA",order.arla_incluso ? `${number(order.arla_litros??0)} L · ${money(order.arla_valor_total??0)}` : "Não incluído"],
    ["Nota fiscal",order.numero_nota_fiscal??"-"],["Total abastecido",money(order.valor_total??0)],
  ];
  return <main className="mx-auto max-w-3xl space-y-4 p-4 sm:p-6 print:p-0">
    <div className="flex flex-wrap justify-between gap-2 print:hidden"><Link href="/frotas/posto?tab=history" className={buttonVariants({variant:"outline"})}><ArrowLeft className="size-4" />Voltar ao histórico</Link><PrintReceiptButton /></div>
    <Card><CardHeader><div className="flex items-center gap-2 text-sm text-muted-foreground"><Fuel className="size-4" />Vibe Frotas · {session.nome}</div><CardTitle>Comprovante de abastecimento</CardTitle><div className="font-medium">{order.numero_ordem}</div><div className="text-sm text-muted-foreground">{order.prefeitura_nome}</div></CardHeader><CardContent className="space-y-4">
      <dl className="grid gap-3 sm:grid-cols-2 print:grid-cols-2">{fields.map(([label,value])=><div key={label} className="rounded-lg bg-muted/30 p-3 print:break-inside-avoid"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 break-words text-sm font-medium">{value}</dd></div>)}</dl>
      {order.observacoes ? <div className="text-sm"><div className="font-medium">Observações</div><p className="whitespace-pre-wrap break-words">{order.observacoes}</p></div> : null}
      {order.anexos.length ? <div className="space-y-2 print:hidden"><h2 className="text-sm font-medium">Comprovantes anexados</h2>{order.anexos.map(file=>file.signed_url ? <a key={file.id} href={file.signed_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-lg border p-3 text-sm hover:bg-muted"><FileText className="size-4 shrink-0" />{file.file_name}</a> : null)}</div> : null}
      <p className="text-xs text-muted-foreground">Registro de abastecimento concluído. Este documento não comprova pagamento e não substitui a nota fiscal.</p>
    </CardContent></Card>
  </main>;
}
