"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  EmpresaCombobox,
  type EmpresaComboboxOption,
} from "@/components/empresa-combobox";

type EmpresaFilterComboboxProps = {
  className?: string;
  disabled?: boolean;
  empresas: EmpresaComboboxOption[];
  selectedEmpresaId?: string | null;
};

export function EmpresaFilterCombobox({
  className,
  disabled,
  empresas,
  selectedEmpresaId,
}: EmpresaFilterComboboxProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateEmpresa(empresaId: string | null) {
    const query = new URLSearchParams(searchParams.toString());
    query.delete("prefeitura");

    if (empresaId) {
      query.set("empresa", empresaId);
    } else {
      query.delete("empresa");
    }

    const queryString = query.toString();
    router.push(`${pathname}${queryString ? `?${queryString}` : ""}`);
  }

  return (
    <div className={className}>
      <EmpresaCombobox
        id="empresa_filter"
        value={selectedEmpresaId ?? null}
        onChange={updateEmpresa}
        empresas={empresas}
        disabled={disabled}
        placeholder="Pesquisar empresa"
      />
    </div>
  );
}
