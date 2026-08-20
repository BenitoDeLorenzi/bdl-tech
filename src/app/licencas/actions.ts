"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { type LicencaStatus } from "@/lib/licencas-data";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export type LicencaActionState = {
  error?: string;
  success?: string;
};

const allowedStatuses = new Set<LicencaStatus>([
  "active",
  "suspended",
  "expired",
  "cancelled",
]);

export async function createLicenca(
  _previousState: LicencaActionState,
  formData: FormData
): Promise<LicencaActionState> {
  const payload = getLicencaPayload(formData);

  if ("error" in payload) {
    return payload;
  }

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("licencas").insert(payload);

  if (error) {
    return { error: formatSupabaseError(error.message) };
  }

  revalidatePath("/");
  revalidatePath("/licencas");
  return { success: "Licença cadastrada com sucesso." };
}

export async function updateLicenca(
  _previousState: LicencaActionState,
  formData: FormData
): Promise<LicencaActionState> {
  const id = getRequiredValue(formData, "id");

  if (!id) {
    return { error: "Licença não encontrada." };
  }

  const payload = getLicencaPayload(formData);

  if ("error" in payload) {
    return payload;
  }

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("licencas").update(payload).eq("id", id);

  if (error) {
    return { error: formatSupabaseError(error.message) };
  }

  revalidatePath("/");
  revalidatePath("/licencas");
  return { success: "Licença atualizada com sucesso." };
}

export async function deleteLicenca(formData: FormData) {
  const id = getRequiredValue(formData, "id");

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("licencas").delete().eq("id", id);

  if (error) {
    redirect(`/licencas?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/");
  revalidatePath("/licencas");
  redirect("/licencas?deleted=1");
}

function getLicencaPayload(formData: FormData) {
  const prefeitura_id = getRequiredValue(formData, "prefeitura_id");
  const modulo_id = getRequiredValue(formData, "modulo_id");
  const inicio = getRequiredValue(formData, "inicio");
  const fim = getRequiredValue(formData, "fim");
  const status = getRequiredValue(formData, "status") as LicencaStatus;
  const valor_anual = getOptionalNumber(formData, "valor_anual");

  if (!prefeitura_id || !modulo_id || !inicio || !fim || !status) {
    return { error: "Preencha todos os campos obrigatórios." };
  }

  if (!allowedStatuses.has(status)) {
    return { error: "Status inválido." };
  }

  if (fim < inicio) {
    return { error: "A data final não pode ser menor que a data inicial." };
  }

  return {
    prefeitura_id,
    modulo_id,
    inicio,
    fim,
    status,
    valor_anual,
  };
}

function getRequiredValue(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string" || !value.trim()) {
    return "";
  }

  return value.trim();
}

function getOptionalNumber(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  return Number(value);
}

function formatSupabaseError(message: string) {
  if (
    message.includes("duplicate key") ||
    message.includes("licencas_prefeitura_id_modulo_id_key") ||
    message.includes("unique")
  ) {
    return "Esta prefeitura já possui uma licença para este módulo.";
  }

  return message;
}
