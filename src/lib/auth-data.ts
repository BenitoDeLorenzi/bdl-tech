import { redirect } from "next/navigation";
import { createSupabaseAuthServerClient } from "@/lib/supabase-auth-server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { UsuarioRole } from "@/lib/usuarios-data";

export type CurrentUserProfile = {
  ativo: boolean;
  cpf: string | null;
  email: string | null;
  id: string;
  nome: string;
  prefeitura_brasao_url: string | null;
  prefeitura_id: string | null;
  prefeitura_nome: string | null;
  role: UsuarioRole;
  username: string | null;
};

type PerfilRow = {
  ativo: boolean | null;
  cpf: string | null;
  email: string | null;
  id: string;
  nome: string;
  prefeitura_id: string | null;
  prefeituras: { brasao_url: string | null; nome: string } | null;
  role: UsuarioRole;
  username: string | null;
};

export async function getCurrentUserProfile() {
  const authClient = await createSupabaseAuthServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return null;
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("perfis")
    .select("id,nome,email,username,cpf,role,prefeitura_id,ativo,prefeituras(nome,brasao_url)")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const perfil = data as unknown as PerfilRow;

  if (perfil.ativo === false) {
    return null;
  }

  return {
    ativo: perfil.ativo ?? true,
    cpf: perfil.cpf,
    email: perfil.email,
    id: perfil.id,
    nome: perfil.nome,
    prefeitura_brasao_url: perfil.prefeituras?.brasao_url ?? null,
    prefeitura_id: perfil.prefeitura_id,
    prefeitura_nome: perfil.prefeituras?.nome ?? null,
    role: perfil.role,
    username: perfil.username,
  } satisfies CurrentUserProfile;
}

export async function requireUserProfile() {
  const profile = await getCurrentUserProfile();

  if (!profile) {
    redirect("/login");
  }

  return profile;
}

export async function requireRole(roles: UsuarioRole[]) {
  const profile = await requireUserProfile();

  if (!roles.includes(profile.role)) {
    redirect("/portal");
  }

  return profile;
}
