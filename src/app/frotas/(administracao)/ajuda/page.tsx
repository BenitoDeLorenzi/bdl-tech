import { Headset } from "lucide-react";
import { notFound } from "next/navigation";
import { FrotasShell } from "@/app/frotas/frotas-shell";
import { SupportCenter, SupportToolbar, SupportWorkspace } from "@/components/support/support-center";
import { SupportLiveProvider } from "@/components/support/support-live";
import { requireUserProfile } from "@/lib/auth-data";
import { getModuleLicensedEmpresas } from "@/lib/empresa-access";

export default async function AjudaPage({ searchParams }: { searchParams: Promise<{ prefeitura?: string; conversa?: string }> }) {
  const profile = await requireUserProfile();
  const params = await searchParams;
  const licensed = await getModuleLicensedEmpresas("frotas-publicas");
  const empresas = profile.role === "bdl_admin" ? licensed : licensed.filter(item => item.id === profile.prefeitura_id);
  const empresa = profile.role === "bdl_admin" ? params.prefeitura ?? empresas[0]?.id : profile.prefeitura_id ?? undefined;
  if (!empresa || !empresas.some(item => item.id === empresa)) notFound();
  return <SupportWorkspace key={`${profile.id}-${empresa}`}><SupportLiveProvider empresa={empresa}>
    <FrotasShell active="ajuda" title="Central de Ajuda" icon={Headset} profile={profile} prefeituras={empresas} selectedPrefeituraId={empresa} actions={<SupportToolbar />}>
      <SupportCenter userId={profile.id} />
    </FrotasShell>
  </SupportLiveProvider></SupportWorkspace>;
}
