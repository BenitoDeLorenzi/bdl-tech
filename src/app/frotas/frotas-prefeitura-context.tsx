"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Car } from "lucide-react";

import { SidebarIdentity } from "@/components/sidebar-identity";

import type { CurrentUserProfile } from "@/lib/auth-data";
import type { FrotaPrefeituraOption } from "@/lib/frotas-data";

type FrotasPrefeituraContextProps = {
  prefeituras: FrotaPrefeituraOption[];
  profile: CurrentUserProfile;
  selectedPrefeituraId?: string;
};

export function FrotasPrefeituraContext({
  prefeituras,
  profile,
  selectedPrefeituraId,
}: FrotasPrefeituraContextProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAdmin = profile.role === "bdl_admin";
  const prefeitura = prefeituras.find(
    (item) => item.id === (selectedPrefeituraId ?? profile.prefeitura_id),
  );
  const prefeituraNome =
    prefeitura?.nome ?? profile.prefeitura_nome ?? "Empresa";

  function updatePrefeitura(prefeituraId: string | null) {
    const query = new URLSearchParams(searchParams.toString());

    if (prefeituraId) {
      query.set("prefeitura", prefeituraId);
    } else {
      query.delete("prefeitura");
    }

    const queryString = query.toString();
    router.push(`${pathname}${queryString ? `?${queryString}` : ""}`);
  }

  return (
    <SidebarIdentity
      moduleName="Vibe Frotas"
      icon={<Car className="size-4 text-muted-foreground" />}
      name={
        prefeitura?.nome_fantasia ||
        prefeitura?.nome ||
        (isAdmin
          ? "Selecione uma empresa"
          : profile.prefeitura_nome_fantasia || prefeituraNome)
      }
      logoUrl={
        prefeitura?.brasao_url ??
        (!isAdmin ? profile.prefeitura_brasao_url : null)
      }
      options={
        isAdmin
          ? prefeituras.map((p) => ({
              id: p.id,
              name: p.nome_fantasia || p.nome,
              logoUrl: p.brasao_url,
            }))
          : undefined
      }
      selectedId={prefeitura?.id}
      onSelect={isAdmin ? updatePrefeitura : undefined}
    />
  );
}
