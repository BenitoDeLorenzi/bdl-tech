import type { FrotaAbastecimento } from "@/lib/frotas-data";
export function filterPostoHistory(rows: FrotaAbastecimento[], postoId: string, empresaId: string, from: string, to: string) {
  return rows.filter(row => {
    if (row.posto_id !== postoId || row.prefeitura_id !== empresaId || row.status !== "completed") return false;
    const day = row.completed_at ? new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(row.completed_at)) : row.data_abastecimento;
    return (!from || day >= from) && (!to || day <= to);
  }).sort((a,b) => (b.completed_at ?? b.data_abastecimento).localeCompare(a.completed_at ?? a.data_abastecimento));
}
export function validHistoryDate(value?: string) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value ? value : "";
}
export function historyTotals(rows: FrotaAbastecimento[]) {
  return rows.reduce((sum,row) => ({ count: sum.count+1, liters: sum.liters+(row.litros??0), arla: sum.arla+(row.arla_litros??0), value: sum.value+(row.valor_total??0) }), { count:0, liters:0, arla:0, value:0 });
}
