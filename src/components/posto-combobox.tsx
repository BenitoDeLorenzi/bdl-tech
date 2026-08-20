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

export type PostoComboboxOption = {
  cnpj?: string | null;
  endereco?: string | null;
  id: string;
  nome: string;
};

type PostoComboboxProps = {
  disabled?: boolean;
  id: string;
  invalid?: boolean;
  onChange: (value: string | null) => void;
  placeholder?: string;
  postos: PostoComboboxOption[];
  value: string | null;
};

export function PostoCombobox({
  disabled,
  id,
  invalid,
  onChange,
  placeholder = "Pesquisar posto",
  postos,
  value,
}: PostoComboboxProps) {
  const selectedPosto = postos.find((posto) => posto.id === value) ?? null;

  return (
    <Combobox
      items={postos}
      value={selectedPosto}
      onValueChange={(posto: PostoComboboxOption | null) =>
        onChange(posto?.id ?? null)
      }
      itemToStringLabel={(posto: PostoComboboxOption) => posto.nome}
      itemToStringValue={(posto: PostoComboboxOption) =>
        [posto.nome, posto.cnpj, posto.endereco].filter(Boolean).join(" ")
      }
      isItemEqualToValue={(
        item: PostoComboboxOption,
        selected: PostoComboboxOption
      ) => item.id === selected.id}
      disabled={disabled}
    >
      <ComboboxInput id={id} placeholder={placeholder} aria-invalid={invalid} />
      <ComboboxContent>
        <ComboboxEmpty>Nenhum posto encontrado.</ComboboxEmpty>
        <ComboboxList>
          {(posto: PostoComboboxOption) => (
            <ComboboxItem key={posto.id} value={posto}>
              <Item size="xs" className="p-0 pr-6">
                <ItemContent>
                  <ItemTitle className="whitespace-nowrap">
                    {posto.nome}
                  </ItemTitle>
                  <ItemDescription>
                    {[posto.cnpj, posto.endereco].filter(Boolean).join(" · ") ||
                      "Posto credenciado"}
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
