import "server-only";
import { listarEmpresasLicenciadas } from "./module-licensed-empresas";
import { cache } from "react";
import type { CurrentUserProfile } from "@/lib/auth-data";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export function empresaToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
  }).format(new Date());
}
export const getEmpresaLicensedModules = cache(async (empresaId: string) => {
  const db = createSupabaseServerClient();
  const today = empresaToday();
  const [empresa, licencas] = await Promise.all([
    db.from("empresas").select("status").eq("id", empresaId).maybeSingle(),
    db
      .from("licencas")
      .select("modulo_id,modulos!inner(id,nome,slug,ativo)")
      .eq("prefeitura_id", empresaId)
      .eq("status", "active")
      .lte("inicio", today)
      .gte("fim", today)
      .eq("modulos.ativo", true),
  ]);
  if (empresa.error || licencas.error)
    throw new Error("Não foi possível verificar as licenças da empresa.");
  if (empresa.data?.status !== "active") return [];
  return (licencas.data ?? []).map(
    (row) =>
      row.modulos as unknown as {
        id: string;
        nome: string;
        slug: string;
        ativo: boolean;
      },
  );
});
export const getUserModules = cache(async (profile: CurrentUserProfile) => {
  const db = createSupabaseServerClient();
  if (profile.role === "bdl_admin") {
    const { data, error } = await db
      .from("modulos")
      .select("id,nome,slug,ativo")
      .eq("ativo", true)
      .order("nome");
    if (error) throw new Error("Não foi possível verificar os módulos.");
    return data ?? [];
  }
  if (!profile.prefeitura_id) return [];
  const modules = await getEmpresaLicensedModules(profile.prefeitura_id);
  if (profile.role === "municipal_admin") return modules;
  const { data, error } = await db
    .from("usuario_modulos")
    .select("modulo_id")
    .eq("usuario_id", profile.id)
    .eq("prefeitura_id", profile.prefeitura_id);
  if (error) throw new Error("Não foi possível verificar os acessos.");
  const selected = new Set((data ?? []).map((row) => row.modulo_id));
  return modules.filter((module) => selected.has(module.id));
});
export async function hasModuleAccess(
  profile: CurrentUserProfile,
  slug: string,
) {
  return (await getUserModules(profile)).some((module) => module.slug === slug);
}

export const getModuleLicensedEmpresas = cache(async (slug: string) =>
  listarEmpresasLicenciadas(createSupabaseServerClient(), slug, empresaToday()),
);
