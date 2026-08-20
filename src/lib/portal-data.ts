import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { CurrentUserProfile } from "@/lib/auth-data";

export type PortalModulo = {
  description: string;
  href: string;
  id: string;
  label: string;
  slug: string;
  tag: string;
};

type ModuloRow = {
  id: string;
  nome: string;
  slug: string;
};

type UsuarioModuloRow = {
  modulos: ModuloRow | null;
};

export async function getPortalModules(profile: CurrentUserProfile) {
  if (profile.role === "bdl_admin") {
    return getAdminPortalModules();
  }

  return getMunicipalPortalModules(profile);
}

async function getAdminPortalModules() {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("modulos")
    .select("id,nome,slug")
    .eq("ativo", true)
    .order("nome");

  if (error) {
    throw new Error(error.message);
  }

  return [
    {
      description: "Gestão da BDL Tech, prefeituras, licenças e usuários.",
      href: "/",
      id: "bdl-admin",
      label: "Painel BDL Tech",
      slug: "bdl-admin",
      tag: "Administração",
    },
    ...((data ?? []) as ModuloRow[]).map(mapModuloToPortalItem),
  ];
}

async function getMunicipalPortalModules(profile: CurrentUserProfile) {
  if (!profile.prefeitura_id) {
    return [];
  }

  const supabase = createSupabaseServerClient();

  if (profile.role === "municipal_admin") {
    const { data, error } = await supabase
      .from("licencas")
      .select("modulos(id,nome,slug)")
      .eq("prefeitura_id", profile.prefeitura_id)
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return ((data ?? []) as unknown as UsuarioModuloRow[])
      .map((item) => item.modulos)
      .filter((modulo): modulo is ModuloRow => Boolean(modulo))
      .map(mapModuloToPortalItem);
  }

  const { data, error } = await supabase
    .from("usuario_modulos")
    .select("modulos(id,nome,slug)")
    .eq("usuario_id", profile.id)
    .eq("prefeitura_id", profile.prefeitura_id)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as unknown as UsuarioModuloRow[])
    .map((item) => item.modulos)
    .filter((modulo): modulo is ModuloRow => Boolean(modulo))
    .map(mapModuloToPortalItem);
}

function mapModuloToPortalItem(modulo: ModuloRow): PortalModulo {
  if (modulo.slug === "frotas-publicas") {
    return {
      description: "Operação da frota, veículos, manutenção e abastecimento.",
      href: "/frotas",
      id: modulo.id,
      label: modulo.nome,
      slug: modulo.slug,
      tag: "Módulo municipal",
    };
  }

  return {
    description: "Módulo habilitado para acesso.",
    href: "#",
    id: modulo.id,
    label: modulo.nome,
    slug: modulo.slug,
    tag: "Em breve",
  };
}
