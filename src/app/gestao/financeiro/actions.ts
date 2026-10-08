"use server";
import { getGestaoContext } from "@/lib/gestao-data";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
const allowed = new Set([
  "ativar",
  "conta",
  "pagar_cadastrar",
  "pagar",
  "solicitar_repasse",
  "solicitar_pagamento",
  "concluir_solicitacao",
  "cancelar_solicitacao",
  "transferir",
  "aporte",
  "retirada",
  "ajuste_entrada",
  "ajuste_saida",
  "cancelar",
  "estornar",
]);
export async function operarFinanceiro(
  acao: string,
  dados: Record<string, unknown>,
) {
  const { profile, unidade } = await getGestaoContext();
  if (profile.role !== "bdl_admin" || !unidade)
    return { error: "O financeiro é exclusivo do usuário Master." };
  if (!allowed.has(acao) || JSON.stringify(dados).length > 10000)
    return { error: "Operação inválida." };
  const { error } = await createSupabaseServerClient().rpc(
    "gestao_fin_operar",
    { p_ator: profile.id, p_unidade: unidade.id, p_acao: acao, p_dados: dados },
  );
  if (error)
    return {
      error:
        error.code === "P0001"
          ? error.message
          : error.code === "23505"
            ? "Já existe uma conta com este nome."
            : "Não foi possível registrar. Confira os dados e tente novamente.",
    };
  revalidatePath("/gestao", "layout");
  return { success: "Lançamento registrado." };
}
