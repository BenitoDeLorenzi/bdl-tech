"use server";
import { revalidatePath } from "next/cache";
import { requireUserProfile } from "@/lib/auth-data";
import { hasFrotasPermission } from "@/lib/frotas-permissions";
import { createSupabaseServerClient } from "@/lib/supabase-server";
type State = { error?: string; success?: string };

async function changeStatus(form: FormData, table: string, permission: string): Promise<State> {
  const profile = await requireUserProfile();
  if (!(await hasFrotasPermission(profile, permission))) return { error: "Você não tem permissão para alterar este cadastro." };
  const id = String(form.get("id") ?? "").trim();
  const status = String(form.get("status") ?? "");
  if (!id || !["active", "inactive"].includes(status)) return { error: "Cadastro ou status inválido." };
  const db = createSupabaseServerClient();
  let query = db.from(table).update({ status, updated_at: new Date().toISOString() }).eq("id", id);
  if (profile.role !== "bdl_admin") {
    if (!profile.prefeitura_id) return { error: "Empresa não encontrada." };
    query = query.eq("prefeitura_id", profile.prefeitura_id);
  }
  const { data, error } = await query.select("id").maybeSingle();
  if (error || !data) return { error: "Não foi possível alterar este cadastro." };
  refresh();
  return { success: status === "active" ? "Cadastro ativado com sucesso." : "Cadastro inativado com sucesso." };
}
export async function updateOficinaStatus(_state: State, form: FormData) {
  return changeStatus(form, "frota_oficinas", "workshops.manage");
}
export async function updatePostoStatus(_state: State, form: FormData) {
  return changeStatus(form, "frota_postos_credenciados", "fuel_stations.manage");
}
async function remove(form: FormData, table: string, permission: string, relation: string, column: string): Promise<State> {
  const profile = await requireUserProfile();
  if (profile.role !== "bdl_admin" || !(await hasFrotasPermission(profile, permission)))
    return { error: "Somente o Master pode excluir este cadastro." };
  const id = String(form.get("id") ?? "").trim();
  if (!id) return { error: "Informe o cadastro que deseja excluir." };
  const db = createSupabaseServerClient();
  const { data: linked, error: linkedError } = await db.from(relation).select("id").eq(column, id).limit(1);
  if (linkedError) return { error: "Não foi possível verificar os vínculos deste cadastro." };
  if (linked?.length) return { error: "Este cadastro possui operações vinculadas. Inative-o para preservar o histórico." };
  const { data, error } = await db.from(table).delete().eq("id", id).select("id").maybeSingle();
  if (error) return { error: error.code === "23503" ? "Este cadastro possui vínculos. Inative-o para preservar o histórico." : "Não foi possível excluir este cadastro." };
  if (!data) return { error: "Cadastro não encontrado ou já excluído." };
  refresh();
  return { success: "Cadastro excluído com sucesso." };
}
export async function deletePosto(_state: State, form: FormData) {
  return remove(form, "frota_postos_credenciados", "fuel_stations.manage", "frota_abastecimentos", "posto_id");
}
export async function deleteMotorista(_state: State, form: FormData) {
  return remove(form, "frota_motoristas", "drivers.manage", "frota_uso_veiculos", "motorista_id");
}
function refresh() {
  for (const path of ["/frotas/oficinas", "/frotas/postos", "/frotas/motoristas", "/frotas/uso-veiculo", "/frotas/abastecimento", "/frotas/manutencao", "/frotas/posto"]) revalidatePath(path);
}
