"use client";

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@/components/ui/item";

export type EmpresaComboboxOption = {
  cidade?: string | null;
  cnpj?: string | null;
  id: string;
  nome: string;
  uf?: string | null;
};

type EmpresaComboboxProps = {
  disabled?: boolean;
  id: string;
  invalid?: boolean;
  onChange: (value: string | null) => void;
  placeholder?: string;
  empresas: EmpresaComboboxOption[];
  value: string | null;
};

export function EmpresaCombobox({
  disabled,
  id,
  invalid,
  onChange,
  placeholder = "Pesquisar empresa",
  empresas,
  value,
}: EmpresaComboboxProps) {
  const selectedEmpresa =
    empresas.find((empresa) => empresa.id === value) ?? null;

  return (
    <Combobox
      items={empresas}
      value={selectedEmpresa}
      onValueChange={(empresa: EmpresaComboboxOption | null) =>
        onChange(empresa?.id ?? null)
      }
      itemToStringLabel={(empresa: EmpresaComboboxOption) => empresa.nome}
      itemToStringValue={(empresa: EmpresaComboboxOption) =>
        [empresa.nome, empresa.cnpj, empresa.cidade, empresa.uf]
          .filter(Boolean)
          .join(" ")
      }
      isItemEqualToValue={(
        item: EmpresaComboboxOption,
        selected: EmpresaComboboxOption,
      ) => item.id === selected.id}
      disabled={disabled}
    >
      <ComboboxInput id={id} placeholder={placeholder} aria-invalid={invalid} />
      <ComboboxContent>
        <ComboboxEmpty>Nenhuma empresa encontrada.</ComboboxEmpty>
        <ComboboxList>
          {(empresa: EmpresaComboboxOption) => (
            <ComboboxItem key={empresa.id} value={empresa}>
              <Item size="xs" className="p-0 pr-6">
                <ItemContent>
                  <ItemTitle className="whitespace-nowrap">
                    {empresa.nome}
                  </ItemTitle>
                  <ItemDescription>
                    {getEmpresaDescription(empresa)}
                  </ItemDescription>
                </ItemContent>
              </Item>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

function getEmpresaDescription(empresa: EmpresaComboboxOption) {
  const location = [empresa.cidade, empresa.uf].filter(Boolean).join(" · ");

  return (
    [empresa.cnpj, location].filter(Boolean).join(" · ") || "Empresa cadastrada"
  );
}
