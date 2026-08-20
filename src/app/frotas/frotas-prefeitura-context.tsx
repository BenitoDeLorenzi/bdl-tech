"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Building2, Car } from "lucide-react";

import { PrefeituraCombobox } from "@/components/prefeitura-combobox";
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
    (item) => item.id === (selectedPrefeituraId ?? profile.prefeitura_id)
  );
  const prefeituraNome =
    prefeitura?.nome ?? profile.prefeitura_nome ?? "Prefeitura";
  const displayPrefeituraName = formatMunicipalityName(prefeituraNome);

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

  if (isAdmin) {
    return (
      <div className="grid gap-2 px-2 py-2 group-data-[collapsible=icon]:hidden">
        <div className="flex items-center gap-2 px-1 text-sm font-semibold">
          <Car className="size-4 text-muted-foreground" />
          Frotas Públicas
        </div>
        <PrefeituraCombobox
          id="frotas_prefeitura_context"
          value={selectedPrefeituraId ?? null}
          onChange={updatePrefeitura}
          prefeituras={prefeituras}
          placeholder="Pesquisar prefeitura"
        />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 px-2 py-3">
      <div className="flex aspect-square size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-background shadow-sm">
        {prefeitura?.brasao_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={prefeitura.brasao_url}
            alt={`Brasão de ${prefeituraNome}`}
            className="size-full object-contain p-1"
          />
        ) : (
          <Building2 className="size-5 text-muted-foreground" />
        )}
      </div>
      <div className="grid min-w-0 flex-1 gap-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
        <span className="line-clamp-2 text-[15px] font-semibold" title={prefeituraNome}>
          {displayPrefeituraName}
        </span>
        <span className="truncate text-[13px] font-medium text-muted-foreground">
          Frotas Públicas
        </span>
      </div>
    </div>
  );
}

function formatMunicipalityName(name: string) {
  const cleanName = name.replace(/\s+/g, " ").trim();
  const normalizedName = cleanName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const prefixes = [
    "prefeitura municipal de ",
    "prefeitura municipal da ",
    "prefeitura municipal do ",
    "prefeitura municipal das ",
    "prefeitura municipal dos ",
    "municipio de ",
    "municipio da ",
    "municipio do ",
    "municipio das ",
    "municipio dos ",
    "prefeitura de ",
    "prefeitura da ",
    "prefeitura do ",
    "prefeitura das ",
    "prefeitura dos ",
  ];
  const prefix = prefixes.find((item) => normalizedName.startsWith(item));

  if (!prefix) {
    return cleanName;
  }

  const city = cleanName.slice(prefix.length).trim();

  return city ? `Município de ${city}` : cleanName;
}
