"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth-data";

import { createSupabaseServerClient } from "@/lib/supabase-server";

export type ModuloActionState = {
  error?: string;
  success?: string;
};

export async function createModulo(
  _previousState: ModuloActionState,
  formData: FormData
): Promise<ModuloActionState> {
  await requireRole(["bdl_admin"]);
  const payload = getModuloPayload(formData);

  if ("error" in payload) {
    return payload;
  }

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("modulos").insert(payload);

  if (error) {
    return { error: formatSupabaseError(error.message) };
  }

  revalidatePath("/");
  revalidatePath("/licencas");
  revalidatePath("/modulos");
  return { success: "Módulo cadastrado com sucesso." };
}

export async function updateModulo(
  _previousState: ModuloActionState,
  formData: FormData
): Promise<ModuloActionState> {
  await requireRole(["bdl_admin"]);
  const id = getRequiredValue(formData, "id");

  if (!id) {
    return { error: "Módulo não encontrado." };
  }

  const payload = getModuloPayload(formData);

  if ("error" in payload) {
    return payload;
  }

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("modulos").update(payload).eq("id", id);

  if (error) {
    return { error: formatSupabaseError(error.message) };
  }

  revalidatePath("/");
  revalidatePath("/licencas");
  revalidatePath("/modulos");
  return { success: "Módulo atualizado com sucesso." };
}

export async function deleteModulo(formData: FormData) {
  await requireRole(["bdl_admin"]);
  const id = getRequiredValue(formData, "id");

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("modulos").delete().eq("id", id);

  if (error) {
    redirect(`/modulos?error=${encodeURIComponent(formatSupabaseError(error.message))}`);
  }

  revalidatePath("/");
  revalidatePath("/licencas");
  revalidatePath("/modulos");
  redirect("/modulos?deleted=1");
}

function getModuloPayload(formData: FormData) {
  const nome = getRequiredValue(formData, "nome");
  const slug = normalizeSlug(getRequiredValue(formData, "slug"));
  const subdominio = normalizeSubdominio(getRequiredValue(formData, "subdominio"));
  const ativo = getRequiredValue(formData, "ativo");

  if (!nome || !slug || !subdominio || !ativo) {
    return { error: "Preencha todos os campos obrigatórios." };
  }

  if (!["true", "false"].includes(ativo)) {
    return { error: "Status inválido." };
  }

  return {
    ativo: ativo === "true",
    nome,
    slug,
    subdominio,
  };
}

function getRequiredValue(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string" || !value.trim()) {
    return "";
  }

  return value.trim();
}

function normalizeSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeSubdominio(value: string) {
  return value.trim().toLowerCase();
}

function formatSupabaseError(message: string) {
  if (
    message.includes("duplicate key") ||
    message.includes("modulos_slug_key") ||
    message.includes("modulos_subdominio_key") ||
    message.includes("unique")
  ) {
    return "Já existe um módulo cadastrado com este slug ou subdomínio.";
  }

  if (
    message.includes("foreign key") ||
    message.includes("licencas_modulo_id_fkey")
  ) {
    return "Não é possível excluir este módulo porque existem licenças vinculadas a ele.";
  }

  return message;
}
