"use server";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { requireUserProfile } from "@/lib/auth-data";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAuthServerClient } from "@/lib/supabase-auth-server";

export async function salvarDadosPerfil(values: {
  nome: string;
  telefone: string;
  email_contato: string;
}) {
  const profile = await requireUserProfile();
  const nome = String(values.nome ?? "").trim();
  const telefone = String(values.telefone ?? "").trim();
  const email_contato = String(values.email_contato ?? "")
    .trim()
    .toLowerCase();
  if (
    email_contato &&
    (email_contato.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email_contato))
  )
    return { error: "Informe um e-mail de contato válido." };
  if (nome.length < 2 || nome.length > 120 || telefone.length > 30)
    return {
      error:
        "Confira o nome (2 a 120 caracteres) e o telefone (até 30 caracteres).",
    };
  const { error } = await createSupabaseServerClient()
    .from("perfis")
    .update({
      nome,
      telefone: telefone || null,
      email_contato: email_contato || null,
    })
    .eq("id", profile.id);
  if (error) return { error: "Não foi possível salvar seus dados." };
  revalidatePath("/", "layout");
  return { success: "Dados atualizados." };
}

export async function salvarFotoPerfil(form: FormData) {
  const profile = await requireUserProfile();
  const db = createSupabaseServerClient();
  const { data: current, error: readError } = await db
    .from("perfis")
    .select("avatar_path")
    .eq("id", profile.id)
    .single();
  if (readError) return { error: "Não foi possível carregar a foto atual." };
  const remover = form.get("remover") === "true";
  let path: string | null = null;
  if (!remover) {
    const file = form.get("foto");
    if (
      !(file instanceof File) ||
      !file.size ||
      file.size > 3 * 1024 * 1024 ||
      !["image/jpeg", "image/png", "image/webp"].includes(file.type)
    )
      return { error: "Escolha uma foto JPG, PNG ou WebP de até 3 MB." };
    let buffer: Buffer;
    try {
      const source = sharp(Buffer.from(await file.arrayBuffer()), {
        limitInputPixels: 25000000,
      });
      const metadata = await source.metadata();
      if (!["jpeg", "png", "webp"].includes(metadata.format ?? ""))
        return { error: "Formato de imagem inválido." };
      buffer = await source
        .rotate()
        .resize(512, 512, { fit: "cover", withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer();
    } catch {
      return { error: "Não foi possível ler a imagem. Escolha outra foto." };
    }
    path = `${profile.id}/${randomUUID()}.webp`;
    const { error } = await db.storage
      .from("profile-photos")
      .upload(path, buffer, { contentType: "image/webp", upsert: false });
    if (error) return { error: "Não foi possível enviar a foto." };
  }
  let query = db
    .from("perfis")
    .update({ avatar_path: path })
    .eq("id", profile.id);
  query = current.avatar_path
    ? query.eq("avatar_path", current.avatar_path)
    : query.is("avatar_path", null);
  const { data, error } = await query.select("id");
  if (error || !data?.length) {
    if (path) await db.storage.from("profile-photos").remove([path]);
    return {
      error: "A foto não foi atualizada. Atualize a página e tente novamente.",
    };
  }
  if (current.avatar_path?.startsWith(`${profile.id}/`))
    await db.storage.from("profile-photos").remove([current.avatar_path]);
  revalidatePath("/", "layout");
  return { success: remover ? "Foto removida." : "Foto atualizada." };
}

export async function alterarSenhaPerfil(values: {
  atual: string;
  nova: string;
  confirmacao: string;
  encerrar: boolean;
}) {
  await requireUserProfile();
  if (
    !values.atual ||
    values.atual.length > 128 ||
    values.nova.length < 8 ||
    values.nova.length > 128 ||
    values.nova !== values.confirmacao ||
    values.nova === values.atual
  )
    return {
      error:
        "Confira a senha atual e informe uma nova senha diferente, de 8 a 128 caracteres, com a confirmação igual.",
    };
  const db = await createSupabaseAuthServerClient();
  const { data: identity } = await db.auth.getUser();
  if (!identity.user?.email)
    return { error: "Entre novamente para alterar sua senha." };
  const verifier = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );
  const verification = await verifier.auth.signInWithPassword({
    email: identity.user.email,
    password: values.atual,
  });
  if (verification.error || verification.data.user?.id !== identity.user.id)
    return {
      error: "A senha atual está incorreta. Confira e tente novamente.",
    };
  await verifier.auth.signOut({ scope: "local" });
  const { error } = await db.auth.updateUser({
    password: values.nova,
    current_password: values.atual,
  });
  if (error)
    return {
      error:
        "Não foi possível alterar a senha. Confira a senha atual e use uma nova senha forte. Se sua sessão expirou, entre novamente.",
    };
  if (values.encerrar) {
    const { error: signOutError } = await db.auth.signOut({ scope: "others" });
    if (signOutError)
      return {
        success:
          "Senha alterada. Não foi possível encerrar as outras sessões; tente novamente mais tarde.",
      };
  }
  return {
    success: values.encerrar
      ? "Senha alterada e renovação das outras sessões revogada."
      : "Senha alterada.",
  };
}

export async function getPerfilAcessos() {
  const profile = await requireUserProfile();
  const { getPortalModules } = await import("@/lib/portal-data");
  return getPortalModules(profile);
}
