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

export type PrefeituraComboboxOption = {
  nome_fantasia?: string | null;
  cidade?: string | null;
  cnpj?: string | null;
  id: string;
  nome: string;
  uf?: string | null;
};

type PrefeituraComboboxProps = {
  disabled?: boolean;
  id: string;
  invalid?: boolean;
  onChange: (value: string | null) => void;
  placeholder?: string;
  prefeituras: PrefeituraComboboxOption[];
  value: string | null;
};

export function PrefeituraCombobox({
  disabled,
  id,
  invalid,
  onChange,
  placeholder = "Pesquisar empresa",
  prefeituras,
  value,
}: PrefeituraComboboxProps) {
  const selectedPrefeitura =
    prefeituras.find((prefeitura) => prefeitura.id === value) ?? null;

  return (
    <Combobox
      items={prefeituras}
      value={selectedPrefeitura}
      onValueChange={(prefeitura: PrefeituraComboboxOption | null) =>
        onChange(prefeitura?.id ?? null)
      }
      itemToStringLabel={(prefeitura: PrefeituraComboboxOption) =>
        prefeitura.nome
      }
      itemToStringValue={(prefeitura: PrefeituraComboboxOption) =>
        [
          prefeitura.nome,
          prefeitura.nome_fantasia,
          prefeitura.cnpj,
          prefeitura.cidade,
          prefeitura.uf,
        ]
          .filter(Boolean)
          .join(" ")
      }
      isItemEqualToValue={(
        item: PrefeituraComboboxOption,
        selected: PrefeituraComboboxOption
      ) => item.id === selected.id}
      disabled={disabled}
    >
      <ComboboxInput
        id={id}
        placeholder={placeholder}
        aria-invalid={invalid}
      />
      <ComboboxContent>
        <ComboboxEmpty>Nenhuma empresa encontrada.</ComboboxEmpty>
        <ComboboxList>
          {(prefeitura: PrefeituraComboboxOption) => (
            <ComboboxItem key={prefeitura.id} value={prefeitura}>
              <Item size="xs" className="p-0 pr-6">
                <ItemContent>
                  <ItemTitle className="whitespace-nowrap">
                    {prefeitura.nome}
                  </ItemTitle>
                  <ItemDescription>
                    {getPrefeituraDescription(prefeitura)}
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

function getPrefeituraDescription(prefeitura: PrefeituraComboboxOption) {
  const location = [prefeitura.cidade, prefeitura.uf].filter(Boolean).join(" · ");

  return [prefeitura.cnpj, location].filter(Boolean).join(" · ") || "Empresa";
}
