import type { Fechamento } from "./gestao-types";
import type { ExtratoEquipe } from "./gestao-equipe";
import { recebimentoLiquido } from "./gestao-fechamento";

const cents = (value: number) => Math.round(Number(value) * 100);

/** Monetary results in cents. Payments come only from the ledger, including legacy entries. */
export function resumirFinanceiro(
  fechamentos: Fechamento[],
  extrato: ExtratoEquipe[],
  inicio: string,
  fim: string,
) {
  function intervalo(desde: string) {
    const registros = fechamentos.filter(
      (f) => f.status === "conferido" && f.data >= desde && f.data <= fim,
    );
    let bruto = 0,
      taxas = 0,
      despesas = 0;
    for (const f of registros) {
      for (const p of f.pagamentos) {
        const valor = recebimentoLiquido(
          Number(p.valor),
          Number(p.taxa_percentual ?? 0),
        );
        bruto += valor.bruto;
        taxas += valor.taxa;
      }
      despesas += (f.despesas ?? []).reduce((s, d) => s + cents(d.valor), 0);
    }
    const equipePaga = extrato
      .filter(
        (e) =>
          !e.estornado &&
          e.tipo === "pagamento" &&
          e.data >= desde &&
          e.data <= fim,
      )
      .reduce((s, e) => s + cents(e.valor), 0);
    return {
      bruto,
      taxas,
      despesas,
      equipePaga,
      liquido: bruto - taxas,
      saidas: taxas + despesas + equipePaga,
      saldo: bruto - taxas - despesas - equipePaga,
    };
  }
  const saldos = new Map<string, number>();
  for (const e of extrato) {
    if (e.estornado || e.data > fim) continue;
    saldos.set(
      e.colaborador_id,
      (saldos.get(e.colaborador_id) ?? 0) +
        cents(e.valor) * (e.tipo === "trabalho" ? 1 : -1),
    );
  }
  const pendentes = [...saldos.values()].filter((s) => s > 0);
  const acumulado = intervalo("");
  const equipePendente = pendentes.reduce((s, v) => s + v, 0);
  return {
    periodo: intervalo(inicio),
    acumulado,
    equipePendente,
    colaboradoresPendentes: pendentes.length,
    aposQuitarEquipe: acumulado.saldo - equipePendente,
  };
}
