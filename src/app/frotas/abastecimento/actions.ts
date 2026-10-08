"use server";

import { revalidatePath } from "next/cache";
import { requireUserProfile } from "@/lib/auth-data";
import { hasFrotasPermission } from "@/lib/frotas-permissions";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type State = { error?: string; success?: string };

export async function deleteAbastecimento(_previous: State, form: FormData): Promise<State> {
  const profile = await requireUserProfile();
  if (profile.role !== "bdl_admin" || !(await hasFrotasPermission(profile, "fuel.manage"))) {
    return { error: "Somente o Master pode excluir abastecimentos." };
  }
  const id = typeof form.get("id") === "string" ? String(form.get("id")).trim() : "";
  if (!id) return { error: "Informe o abastecimento que deseja excluir." };

  // Keep the status guard in the DELETE itself, including concurrent changes.
  const { data, error } = await createSupabaseServerClient()
    .from("frota_abastecimentos")
    .delete()
    .eq("id", id)
    .eq("status", "cancelled")
    .select("id,veiculo_id")
    .maybeSingle();
  if (error) return { error: "Não foi possível excluir o abastecimento. Tente novamente." };
  if (!data) return { error: "O abastecimento não foi encontrado ou não está cancelado. Somente abastecimentos cancelados podem ser excluídos." };

  revalidatePath("/frotas");
  revalidatePath("/frotas/abastecimento");
  revalidatePath("/frotas/posto");
  revalidatePath(`/frotas/veiculos/${data.veiculo_id}`);
  return { success: "Abastecimento excluído com sucesso." };
}
