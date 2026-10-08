"use server";

import { revalidatePath } from "next/cache";
import { requireUserProfile } from "@/lib/auth-data";
import { hasFrotasPermission } from "@/lib/frotas-permissions";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type State = { error?: string; success?: string };

export async function deleteManutencao(_previous: State, form: FormData): Promise<State> {
  const profile = await requireUserProfile();
  if (profile.role !== "bdl_admin" || !(await hasFrotasPermission(profile, "maintenance.cancel"))) {
    return { error: "Somente o Master pode excluir manutenções." };
  }
  const id = typeof form.get("id") === "string" ? String(form.get("id")).trim() : "";
  if (!id) return { error: "Informe a manutenção que deseja excluir." };

  // Keep the status guard in the DELETE itself, including concurrent changes.
  const { data, error } = await createSupabaseServerClient()
    .from("frota_manutencoes")
    .delete()
    .eq("id", id)
    .eq("status", "cancelled")
    .select("id,veiculo_id")
    .maybeSingle();
  if (error) return { error: "Não foi possível excluir a manutenção. Tente novamente." };
  if (!data) return { error: "A manutenção não foi encontrada ou não está cancelada. Somente manutenções canceladas podem ser excluídas." };

  revalidatePath("/frotas");
  revalidatePath("/frotas/manutencao");
  revalidatePath(`/frotas/veiculos/${data.veiculo_id}`);
  return { success: "Manutenção excluída com sucesso." };
}
