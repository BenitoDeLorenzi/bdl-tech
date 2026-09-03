"use server";

import { revalidatePath } from "next/cache";

import { requireUserProfile } from "@/lib/auth-data";
import { hasFrotasPermission } from "@/lib/frotas-permissions";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export type SecretariaActionState = {
  error?: string;
  success?: string;
};

export async function createSecretaria(
  _previousState: SecretariaActionState,
  formData: FormData
): Promise<SecretariaActionState> {
  const profile = await requireUserProfile();
  const allowed = await hasFrotasPermission(profile, "departments.manage");

  if (!allowed) {
    return { error: "Você não tem permissão para cadastrar secretarias." };
  }

  const prefeituraId = getRequiredValue(formData, "prefeitura_id");
  const nome = normalizeName(getRequiredValue(formData, "nome"));

  if (!prefeituraId || !nome) {
    return { error: "Informe prefeitura e nome da secretaria." };
  }

  if (profile.role !== "bdl_admin" && prefeituraId !== profile.prefeitura_id) {
    return { error: "Você só pode cadastrar secretarias da sua prefeitura." };
  }

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("frota_secretarias").insert({
    nome,
    prefeitura_id: prefeituraId,
    status: "active",
  });

  if (error) {
    return { error: formatSecretariaError(error.message) };
  }

  revalidateSecretariasPaths();
  return { success: "Secretaria cadastrada com sucesso." };
}

export async function updateSecretaria(
  _previousState: SecretariaActionState,
  formData: FormData
): Promise<SecretariaActionState> {
  const profile = await requireUserProfile();
  const allowed = await hasFrotasPermission(profile, "departments.manage");

  if (!allowed) {
    return { error: "Você não tem permissão para editar secretarias." };
  }

  const id = getRequiredValue(formData, "id");
  const prefeituraId = getRequiredValue(formData, "prefeitura_id");
  const nome = normalizeName(getRequiredValue(formData, "nome"));
  const oldName = getRequiredValue(formData, "old_nome");

  if (!id || !prefeituraId || !nome) {
    return { error: "Informe prefeitura e nome da secretaria." };
  }

  if (profile.role !== "bdl_admin" && prefeituraId !== profile.prefeitura_id) {
    return { error: "Você só pode editar secretarias da sua prefeitura." };
  }

  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("frota_secretarias")
    .update({
      nome,
      prefeitura_id: prefeituraId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return { error: formatSecretariaError(error.message) };
  }

  if (oldName && oldName !== nome) {
    await supabase
      .from("frota_veiculos")
      .update({ secretaria: nome })
      .eq("prefeitura_id", prefeituraId)
      .eq("secretaria", oldName);
  }

  revalidateSecretariasPaths();
  return { success: "Secretaria atualizada com sucesso." };
}

export async function updateSecretariaStatus(
  _previousState: SecretariaActionState,
  formData: FormData
): Promise<SecretariaActionState> {
  const profile = await requireUserProfile();
  const allowed = await hasFrotasPermission(profile, "departments.manage");

  if (!allowed) {
    return { error: "Você não tem permissão para alterar secretarias." };
  }

  const id = getRequiredValue(formData, "id");
  const status = getRequiredValue(formData, "status");

  if (!id || !["active", "inactive"].includes(status)) {
    return { error: "Status da secretaria inválido." };
  }

  const supabase = createSupabaseServerClient();
  const { data: secretaria, error: secretariaError } = await supabase
    .from("frota_secretarias")
    .select("id,prefeitura_id")
    .eq("id", id)
    .single();

  if (secretariaError || !secretaria) {
    return {
      error: formatSecretariaError(
        secretariaError?.message ?? "Secretaria não encontrada."
      ),
    };
  }

  if (
    profile.role !== "bdl_admin" &&
    secretaria.prefeitura_id !== profile.prefeitura_id
  ) {
    return { error: "Você só pode alterar secretarias da sua prefeitura." };
  }

  const { error } = await supabase
    .from("frota_secretarias")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return { error: formatSecretariaError(error.message) };
  }

  revalidateSecretariasPaths();
  return {
    success:
      status === "active"
        ? "Secretaria ativada com sucesso."
        : "Secretaria inativada com sucesso.",
  };
}

function getRequiredValue(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function normalizeName(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function formatSecretariaError(message: string) {
  if (message.includes("frota_secretarias_prefeitura_nome_idx")) {
    return "Já existe uma secretaria com este nome nesta prefeitura.";
  }

  if (message.includes("duplicate") || message.includes("unique")) {
    return "Já existe uma secretaria cadastrada com estes dados.";
  }

  if (message.includes("frota_secretarias")) {
    return "Rode a migration de Secretarias no Supabase antes de gerenciar secretarias.";
  }

  return message;
}

function revalidateSecretariasPaths() {
  revalidatePath("/frotas");
  revalidatePath("/frotas/secretarias");
  revalidatePath("/frotas/veiculos");
  revalidatePath("/frotas/relatorios");
}
