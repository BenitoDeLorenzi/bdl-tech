"use server";

import { revalidatePath } from "next/cache";
import { requireUserProfile } from "@/lib/auth-data";
import { hasFrotasPermission } from "@/lib/frotas-permissions";
import { getFrotasData } from "@/lib/frotas-data";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type State = { error?: string; success?: string };

export async function deleteOficina(_previous: State, form: FormData): Promise<State> {
  const profile = await requireUserProfile();
  if (profile.role !== "bdl_admin" || !(await hasFrotasPermission(profile, "workshops.manage"))) {
    return { error: "Somente o Master pode excluir oficinas." };
  }
  const id = typeof form.get("id") === "string" ? String(form.get("id")).trim() : "";
  if (!id) return { error: "Informe a oficina que deseja excluir." };
  const { data, error } = await createSupabaseServerClient()
    .from("frota_oficinas").delete().eq("id", id).select("id").maybeSingle();
  if (error) return { error: error.code === "23503"
    ? "Esta oficina possui manutenções vinculadas e não pode ser excluída. Você pode inativá-la no cadastro."
    : "Não foi possível excluir a oficina. Tente novamente." };
  if (!data) return { error: "Oficina não encontrada ou já excluída." };
  revalidatePath("/frotas/oficinas");
  revalidatePath("/frotas/manutencao");
  return { success: "Oficina excluída com sucesso." };
}
export async function saveOficina(
  _previous: State,
  form: FormData,
): Promise<State> {
  const profile = await requireUserProfile();
  if (!(await hasFrotasPermission(profile, "workshops.manage")))
    return { error: "Você não tem permissão para gerenciar oficinas." };
  const value = (key: string) =>
    typeof form.get(key) === "string" ? String(form.get(key)).trim() : "";
  const empresaId =
    profile.role === "bdl_admin"
      ? value("prefeitura_id")
      : profile.prefeitura_id;
  if (!empresaId) return { error: "Selecione uma empresa." };
  const scope = await getFrotasData({ prefeituraId: empresaId });
  if (scope.selectedPrefeituraId !== empresaId)
    return { error: "Empresa indisponível para este cadastro." };
  const nome = value("nome");
  const documento = value("documento").replace(/\D/g, "");
  const status = value("status");
  if (!nome) return { error: "Informe o nome da oficina." };
  if (documento && ![11, 14].includes(documento.length))
    return { error: "Informe um CPF com 11 dígitos ou CNPJ com 14 dígitos." };
  if (status !== "active" && status !== "inactive")
    return { error: "Selecione um status válido." };
  const payload = {
    prefeitura_id: empresaId,
    nome,
    documento: documento || null,
    status,
    telefone: value("telefone") || null,
    responsavel: value("responsavel") || null,
    endereco: value("endereco") || null,
    especialidades: value("especialidades") || null,
    observacoes: value("observacoes") || null,
    updated_at: new Date().toISOString(),
  };
  const db = createSupabaseServerClient();
  const id = value("id");
  const query = id
    ? db
        .from("frota_oficinas")
        .update(payload)
        .eq("id", id)
        .eq("prefeitura_id", empresaId)
    : db.from("frota_oficinas").insert(payload);
  const { data, error } = await query.select("id").maybeSingle();
  if (error)
    return {
      error:
        error.code === "23505"
          ? "Já existe uma oficina com este CPF/CNPJ nesta empresa."
          : "Não foi possível salvar a oficina.",
    };
  if (!data) return { error: "Oficina não encontrada nesta empresa." };
  revalidatePath("/frotas/oficinas");
  revalidatePath("/frotas/manutencao");
  return { success: "Oficina salva com sucesso." };
}
