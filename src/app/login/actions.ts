"use server";

import { redirect } from "next/navigation";
import { createSupabaseAuthServerClient } from "@/lib/supabase-auth-server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { UsuarioRole } from "@/lib/usuarios-data";

export type LoginState = {
  error?: string;
};

type PerfilLoginRow = {
  ativo: boolean | null;
  role: UsuarioRole;
};

const AUTH_DOMAIN = "usuarios.bdltech.com.br";

export async function loginAction(
  _previousState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const identifier = String(formData.get("identifier") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const cpf = identifier.replace(/\D/g, "");

  if (!cpf || !password) {
    return { error: "Informe o CPF e a senha para entrar." };
  }

  if (cpf.length !== 11) {
    return { error: "Informe um CPF com 11 dígitos." };
  }

  const email = `${cpf}@${AUTH_DOMAIN}`;

  const authClient = await createSupabaseAuthServerClient();
  const { data, error } = await authClient.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    return { error: "Usuário ou senha inválidos." };
  }

  const supabase = createSupabaseServerClient();
  const { data: perfil, error: perfilError } = await supabase
    .from("perfis")
    .select("role,ativo")
    .eq("id", data.user.id)
    .maybeSingle();

  if (perfilError || !perfil) {
    await authClient.auth.signOut();
    return { error: "Usuário sem perfil de acesso configurado." };
  }

  const perfilLogin = perfil as PerfilLoginRow;

  if (perfilLogin.ativo === false) {
    await authClient.auth.signOut();
    return { error: "Este usuário está inativo. Fale com a BDL Tech." };
  }

  redirect("/portal");
}

export async function logoutAction() {
  const authClient = await createSupabaseAuthServerClient();
  await authClient.auth.signOut();
  redirect("/login");
}
