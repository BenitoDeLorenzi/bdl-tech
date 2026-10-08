import "server-only";
import { getGestaoContext } from "./gestao-data";
import type { Colaborador, ExtratoEquipe } from "./gestao-equipe";

export async function getEquipeData() {
  const { db, unidade, gestor } = await getGestaoContext();
  if (!unidade || !gestor)
    return {
      extrato: [] as ExtratoEquipe[],
      colaboradores: [] as Colaborador[],
    };
  const unidadeId = unidade.id;
  async function listar<T>(table: string, order: string) {
    const rows: T[] = [];
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await db
        .from(table)
        .select("*")
        .eq("unidade_id", unidadeId)
        .order(order, { ascending: order === "nome" })
        .order("id")
        .range(offset, offset + 499);
      if (error)
        throw new Error("Não foi possível carregar a equipe. Tente novamente.");
      rows.push(...(data as T[]));
      if (data.length < 500) return rows;
    }
  }
  const [colaboradores, extrato] = await Promise.all([
    listar<Colaborador>("gestao_colaboradores", "nome"),
    listar<ExtratoEquipe>("gestao_equipe_extrato", "data"),
  ]);
  return { colaboradores, extrato };
}
