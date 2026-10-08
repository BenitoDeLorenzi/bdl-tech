"use server";
import { requireUserProfile } from "@/lib/auth-data";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export async function salvarTaxa(
  unidadeId: string,
  forma: string,
  percentual: string,
  versao: number,
) {
  const profile = await requireUserProfile();
  const value = percentual.trim().replace(",", ".");
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(value) || Number(value) > 100)
    return {
      error: "Informe uma taxa entre 0 e 100, com até duas casas decimais.",
    };
  const { error } = await createSupabaseServerClient().rpc(
    "gestao_salvar_taxa",
    {
      p_ator: profile.id,
      p_unidade: unidadeId,
      p_forma: forma,
      p_percentual: Number(value),
      p_versao: versao,
    },
  );
  if (error)
    return {
      error:
        error.code === "P0001"
          ? error.message
          : "Não foi possível salvar a taxa. Tente novamente.",
    };
  revalidatePath("/gestao", "layout");
  return { success: true };
}
