import { NotificationList } from "./notification-center";
import { Bell } from "lucide-react";
import { notFound, redirect } from "next/navigation";

import { FrotasShell } from "@/app/frotas/frotas-shell";
import { requireUserProfile } from "@/lib/auth-data";
import { getModuleLicensedEmpresas, hasModuleAccess } from "@/lib/empresa-access";

export default async function NotificacoesPage({
  searchParams,
}: {
  searchParams: Promise<{ prefeitura?: string }>;
}) {
  const profile = await requireUserProfile();
  if (!(await hasModuleAccess(profile, "frotas-publicas"))) redirect("/portal");

  const params = await searchParams;
  const empresas = await getModuleLicensedEmpresas("frotas-publicas");
  const prefeituras = profile.role === "bdl_admin"
    ? empresas
    : empresas.filter((empresa) => empresa.id === profile.prefeitura_id);
  const selectedPrefeituraId = profile.role === "bdl_admin"
    ? params.prefeitura ?? prefeituras[0]?.id
    : profile.prefeitura_id ?? undefined;

  if (selectedPrefeituraId && !prefeituras.some((empresa) => empresa.id === selectedPrefeituraId)) {
    notFound();
  }

  return (
    <FrotasShell
      active="notificacoes"
      icon={Bell}
      title="Notificações"
      profile={profile}
      prefeituras={prefeituras}
      selectedPrefeituraId={selectedPrefeituraId}
    >
      <NotificationList />
    </FrotasShell>
  );
}
