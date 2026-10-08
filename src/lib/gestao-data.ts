import "server-only";
import { getModuleLicensedEmpresas } from "@/lib/empresa-access";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { cookies } from "next/headers";
import { cache } from "react";
import { requireUserProfile } from "@/lib/auth-data";
import { createSupabaseAuthServerClient } from "@/lib/supabase-auth-server";
import type {
  Empresa,
  Unidade,
  Produto,
  Fechamento,
  Movimento,
  Categoria,
} from "./gestao-types";

export const getGestaoContext = cache(async () => {
  const profile = await requireUserProfile();
  const db = await createSupabaseAuthServerClient();
  const [
    empresasResult,
    unidadesResult,
    permissoesResult,
    logosResult,
    licenciadas,
  ] = await Promise.all([
    db.from("gestao_empresas").select("*").order("nome"),
    db.from("gestao_unidades").select("*").order("nome"),
    createSupabaseServerClient()
      .from("usuario_permissoes")
      .select("permissoes(chave)")
      .eq("usuario_id", profile.id),
    db.from("empresas").select("id,brasao_url,nome_fantasia"),
    getModuleLicensedEmpresas("gestao-estabelecimentos"),
  ]);
  for (const result of [empresasResult, unidadesResult, permissoesResult]) {
    if (result.error)
      throw new Error(
        "Não foi possível carregar o Vibe Gestão. Tente novamente.",
      );
  }
  const permitidas = new Set(licenciadas.map((e) => e.id));
  const empresas = (empresasResult.data as Empresa[])
    .filter((e) => permitidas.has(e.id))
    .map((e) => ({
      ...e,
      nome_fantasia: logosResult.data?.find((logo) => logo.id === e.id)?.nome_fantasia ?? null,
      logo_url:
        logosResult.data?.find((logo) => logo.id === e.id)?.brasao_url ?? null,
    }));
  const unidades = (unidadesResult.data as Unidade[]).filter((u) =>
    permitidas.has(u.empresa_id),
  );
  const selected = (await cookies()).get("gestao_unidade")?.value;
  const unidade =
    unidades.find((u) => u.id === selected) ?? unidades[0] ?? null;
  const empresa = empresas.find((e) => e.id === unidade?.empresa_id) ?? null;
  const gestor =
    profile.role === "bdl_admin" ||
    profile.role === "municipal_admin" ||
    (permissoesResult.data ?? []).some(
      (row) =>
        (row.permissoes as unknown as { chave: string } | null)?.chave ===
        "gestao.manage",
    );
  return { profile, db, empresas, unidades, unidade, empresa, gestor };
});

export async function getProdutos() {
  const { db, unidade } = await getGestaoContext();
  if (!unidade) return [];
  const { data, error } = await db
    .from("gestao_produtos")
    .select("*,gestao_categorias(nome)")
    .eq("unidade_id", unidade.id)
    .order("nome");
  if (error) throw new Error("Não foi possível carregar os produtos.");
  return (data ?? []).map((row) => ({
    ...row,
    categoria: row.gestao_categorias?.nome ?? row.categoria,
  })) as Produto[];
}
export async function getCategorias() {
  const { db, empresa } = await getGestaoContext();
  if (!empresa) return [];
  const { data, error } = await db
    .from("gestao_categorias")
    .select("*")
    .eq("empresa_id", empresa.id)
    .order("nome");
  if (error) throw new Error("Não foi possível carregar as categorias.");
  return data as Categoria[];
}
export async function getFechamentos() {
  const { db, unidade } = await getGestaoContext();
  if (!unidade) return [];
  const { data, error } = await db
    .from("gestao_fechamentos")
    .select("*")
    .eq("unidade_id", unidade.id)
    .order("data", { ascending: false })
    .limit(100);
  if (error) throw new Error("Não foi possível carregar os fechamentos.");
  return data as Fechamento[];
}
export async function getFechamento(id: string) {
  const { db, unidade } = await getGestaoContext();
  if (!unidade || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data, error } = await db
    .from("gestao_fechamentos")
    .select("*")
    .eq("id", id)
    .eq("unidade_id", unidade.id)
    .maybeSingle();
  if (error) throw new Error("Não foi possível carregar o fechamento.");
  if (!data) return null;
  const { data: equipe, error: equipeError } = await db
    .from("gestao_fechamento_equipe")
    .select("*")
    .eq("fechamento_id", id)
    .eq("unidade_id", unidade.id)
    .order("nome");
  if (equipeError)
    throw new Error("Não foi possível carregar a equipe do fechamento.");
  return { ...data, equipe } as Fechamento;
}
export async function getMovimentos() {
  const { db, unidade } = await getGestaoContext();
  if (!unidade) return [];
  const { data, error } = await db
    .from("gestao_movimentos")
    .select("*")
    .eq("unidade_id", unidade.id)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error("Não foi possível carregar as movimentações.");
  return data as Movimento[];
}

export async function getTaxasRecebimento() {
  const { db, unidade } = await getGestaoContext();
  if (!unidade) return [];
  const { data, error } = await db
    .from("gestao_taxas_recebimento")
    .select("forma,percentual,versao")
    .eq("unidade_id", unidade.id);
  if (error)
    throw new Error("Não foi possível carregar as taxas de recebimento.");
  return data as { forma: string; percentual: number; versao: number }[];
}
