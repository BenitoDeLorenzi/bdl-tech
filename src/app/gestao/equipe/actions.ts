"use server";
import { revalidatePath } from "next/cache";
import { requireUserProfile } from "@/lib/auth-data";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function operarEquipe(
  acao: string,
  dados: Record<string, unknown>,
): Promise<{ error?: string }> {
  const profile = await requireUserProfile();
  if (
    ![
      "colaborador",
      "trabalho",
      "cancelar_trabalho",
      "pagar",
      "estornar_pagamento",
    ].includes(acao) ||
    JSON.stringify(dados).length > 100_000
  )
    return { error: "Operação inválida." };
  const { error } = await createSupabaseServerClient().rpc(
    "gestao_equipe_operar",
    { p_ator: profile.id, p_acao: acao, p_dados: dados },
  );
  if (error)
    return {
      error:
        error.code === "P0001"
          ? error.message
          : error.code === "23505"
            ? "Já existe um lançamento para este colaborador, data e horário. Confira os registros."
            : "Não foi possível salvar. Confira os dados e tente novamente.",
    };
  revalidatePath("/gestao/equipe", "layout");
  return {};
}
