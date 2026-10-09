import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { requireUserProfile } from "@/lib/auth-data";
import { getModuleLicensedEmpresas, hasModuleAccess } from "@/lib/empresa-access";
import { getFrotasPermissionAccess } from "@/lib/frotas-permissions";
import { FrotasPersistentFrame } from "../frotas-persistent-frame";

export default async function FrotasLayout({ children }: { children: ReactNode }) {
  const profile = await requireUserProfile();
  if (!(await hasModuleAccess(profile, "frotas-publicas"))) redirect("/portal");
  const [empresas, access] = await Promise.all([
    getModuleLicensedEmpresas("frotas-publicas"), getFrotasPermissionAccess(profile),
  ]);
  const prefeituras = profile.role === "bdl_admin" ? empresas : empresas.filter(item => item.id === profile.prefeitura_id);
  return <FrotasPersistentFrame key={profile.id} profile={profile} prefeituras={prefeituras} access={access}>{children}</FrotasPersistentFrame>;
}
