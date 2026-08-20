"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { type PrefeituraStatus } from "@/lib/prefeituras-data";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export type PrefeituraActionState = {
  error?: string;
  success?: string;
};
type PrefeituraBrasaoUploadResult =
  | {
      brasao_path: string;
      brasao_url: string;
    }
  | {
      error: string;
    };

const allowedStatuses = new Set<PrefeituraStatus>([
  "active",
  "suspended",
  "expired",
  "cancelled",
]);
const prefeituraBrasaoBucket = "prefeituras-brasoes";
const maxPrefeituraBrasaoSize = 3 * 1024 * 1024;

export async function createPrefeitura(
  _previousState: PrefeituraActionState,
  formData: FormData
): Promise<PrefeituraActionState> {
  const nome = getRequiredValue(formData, "nome");
  const cnpj = getRequiredValue(formData, "cnpj");
  const cidade = getOptionalValue(formData, "cidade");
  const uf = getOptionalValue(formData, "uf")?.toUpperCase();
  const cep = getOptionalValue(formData, "cep");
  const endereco = getOptionalValue(formData, "endereco");
  const brasao = formData.get("brasao");

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("prefeituras")
    .insert({
      nome,
      cnpj,
      cidade,
      uf,
      cep,
      endereco,
      status: "active",
    })
    .select("id")
    .single();

  if (error || !data) {
    return {
      error: formatSupabaseError(error?.message ?? "Prefeitura não cadastrada."),
    };
  }

  if (brasao instanceof File && brasao.size > 0) {
    const uploadResult = await uploadPrefeituraBrasao(
      supabase,
      data.id,
      brasao
    );

    if ("error" in uploadResult) {
      return uploadResult;
    }

    const { error: updateError } = await supabase
      .from("prefeituras")
      .update(uploadResult)
      .eq("id", data.id);

    if (updateError) {
      return { error: formatSupabaseError(updateError.message) };
    }
  }

  revalidatePath("/");
  revalidatePath("/prefeituras");
  return { success: "Prefeitura cadastrada com sucesso." };
}

export async function updatePrefeitura(
  _previousState: PrefeituraActionState,
  formData: FormData
): Promise<PrefeituraActionState> {
  const id = getRequiredValue(formData, "id");
  const nome = getRequiredValue(formData, "nome");
  const cnpj = getRequiredValue(formData, "cnpj");
  const cidade = getOptionalValue(formData, "cidade");
  const uf = getOptionalValue(formData, "uf")?.toUpperCase();
  const cep = getOptionalValue(formData, "cep");
  const endereco = getOptionalValue(formData, "endereco");
  const currentBrasaoPath = getOptionalValue(formData, "current_brasao_path");
  const brasao = formData.get("brasao");

  const supabase = createSupabaseServerClient();
  let brasaoPayload: Partial<{
    brasao_path: string;
    brasao_url: string;
  }> = {};

  if (brasao instanceof File && brasao.size > 0) {
    const uploadResult = await uploadPrefeituraBrasao(
      supabase,
      id,
      brasao,
      currentBrasaoPath
    );

    if ("error" in uploadResult) {
      return { error: uploadResult.error };
    }

    brasaoPayload = uploadResult;
  }

  const { error } = await supabase
    .from("prefeituras")
    .update({
      nome,
      cnpj,
      cidade,
      uf,
      cep,
      endereco,
      ...brasaoPayload,
    })
    .eq("id", id);

  if (error) {
    return { error: formatSupabaseError(error.message) };
  }

  revalidatePath("/");
  revalidatePath("/prefeituras");
  return { success: "Prefeitura atualizada com sucesso." };
}

export async function updatePrefeituraStatus(formData: FormData) {
  const id = getRequiredValue(formData, "id");
  const status = getRequiredValue(formData, "status") as PrefeituraStatus;

  if (!allowedStatuses.has(status)) {
    redirect("/prefeituras?error=Status%20inv%C3%A1lido");
  }

  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("prefeituras")
    .update({ status })
    .eq("id", id);

  if (error) {
    redirect(`/prefeituras?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/");
  revalidatePath("/prefeituras");
  redirect("/prefeituras?updated=1");
}

export async function deletePrefeitura(formData: FormData) {
  const id = getRequiredValue(formData, "id");

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("prefeituras").delete().eq("id", id);

  if (error) {
    redirect(`/prefeituras?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/");
  revalidatePath("/prefeituras");
  redirect("/prefeituras?deleted=1");
}

function getRequiredValue(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Campo obrigatorio: ${key}`);
  }

  return value.trim();
}

function getOptionalValue(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  return value.trim();
}

async function uploadPrefeituraBrasao(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  prefeituraId: string,
  file: File,
  previousPath?: string | null
): Promise<PrefeituraBrasaoUploadResult> {
  if (!file.type.startsWith("image/")) {
    return { error: "Envie uma imagem válida para o brasão." };
  }

  if (file.size > maxPrefeituraBrasaoSize) {
    return { error: "O brasão deve ter no máximo 3 MB." };
  }

  const bucketError = await ensurePrefeituraBrasaoBucket(supabase);

  if (bucketError) {
    return { error: bucketError };
  }

  if (previousPath) {
    await supabase.storage.from(prefeituraBrasaoBucket).remove([previousPath]);
  }

  const extension = getImageExtension(file);
  const path = `${prefeituraId}/brasao-${Date.now()}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from(prefeituraBrasaoBucket)
    .upload(path, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    return { error: formatSupabaseError(uploadError.message) };
  }

  const { data: publicUrlData } = supabase.storage
    .from(prefeituraBrasaoBucket)
    .getPublicUrl(path);

  return {
    brasao_path: path,
    brasao_url: publicUrlData.publicUrl,
  };
}

async function ensurePrefeituraBrasaoBucket(
  supabase: ReturnType<typeof createSupabaseServerClient>
) {
  const { error } = await supabase.storage.createBucket(prefeituraBrasaoBucket, {
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    fileSizeLimit: maxPrefeituraBrasaoSize,
    public: true,
  });

  if (!error || error.message.toLowerCase().includes("already exists")) {
    return null;
  }

  return formatSupabaseError(error.message);
}

function getImageExtension(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (extension && ["jpg", "jpeg", "png", "webp"].includes(extension)) {
    return extension;
  }

  if (file.type === "image/png") {
    return "png";
  }

  if (file.type === "image/webp") {
    return "webp";
  }

  return "jpg";
}

function formatSupabaseError(message: string) {
  if (
    message.includes("duplicate key") ||
    message.includes("prefeituras_cnpj_key") ||
    message.includes("unique")
  ) {
    return "Já existe uma prefeitura cadastrada com este CNPJ.";
  }

  return message;
}
