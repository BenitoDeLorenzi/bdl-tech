"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  PrefeituraCombobox,
  type PrefeituraComboboxOption,
} from "@/components/prefeitura-combobox";

type PrefeituraFilterComboboxProps = {
  className?: string;
  disabled?: boolean;
  prefeituras: PrefeituraComboboxOption[];
  selectedPrefeituraId?: string | null;
};

export function PrefeituraFilterCombobox({
  className,
  disabled,
  prefeituras,
  selectedPrefeituraId,
}: PrefeituraFilterComboboxProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

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
    <div className={className}>
      <PrefeituraCombobox
        id="prefeitura_filter"
        value={selectedPrefeituraId ?? null}
        onChange={updatePrefeitura}
        prefeituras={prefeituras}
        disabled={disabled}
        placeholder="Pesquisar empresa"
      />
    </div>
  );
}
