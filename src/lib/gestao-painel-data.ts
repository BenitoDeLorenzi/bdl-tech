import "server-only";
import { getGestaoContext } from "./gestao-data";
import type { Fechamento, Produto } from "./gestao-types";

export async function getPainelData(fim: string) {
  const { db, unidade } = await getGestaoContext();
  if (!unidade)
    return { fechamentos: [] as Fechamento[], produtos: [] as Produto[] };
  const unidadeId = unidade.id;
  async function fechamentosDoPeriodo() {
    const rows: Fechamento[] = [];
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await db
        .from("gestao_fechamentos")
        .select("*")
        .eq("unidade_id", unidadeId)
        .lte("data", fim)
        .order("data", { ascending: false })
        .order("id")
        .range(offset, offset + 499);
      if (error)
        throw new Error("Não foi possível carregar os fechamentos do painel.");
      rows.push(...(data as Fechamento[]));
      if (data.length < 500) return rows;
    }
  }
  async function estoqueAtual() {
    const rows: Produto[] = [];
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await db
        .from("gestao_produtos")
        .select("*")
        .eq("unidade_id", unidadeId)
        .eq("ativo", true)
        .eq("controlar_estoque", true)
        .order("id")
        .range(offset, offset + 499);
      if (error)
        throw new Error("Não foi possível carregar o estoque do painel.");
      rows.push(...(data as Produto[]));
      if (data.length < 500) return rows;
    }
  }
  const [fechamentos, produtos] = await Promise.all([
    fechamentosDoPeriodo(),
    estoqueAtual(),
  ]);
  return { fechamentos, produtos };
}
