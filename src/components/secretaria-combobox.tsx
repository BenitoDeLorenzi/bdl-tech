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

export type SecretariaComboboxOption = {
  id: string;
  label?: string;
  nome: string;
  prefeitura_id?: string;
  prefeitura_nome?: string | null;
  status?: "active" | "inactive";
};

type SecretariaComboboxProps = {
  disabled?: boolean;
  id: string;
  invalid?: boolean;
  onChange: (value: string | null) => void;
  placeholder?: string;
  secretarias: SecretariaComboboxOption[];
  value: string | null;
};

export function SecretariaCombobox({
  disabled,
  id,
  invalid,
  onChange,
  placeholder = "Pesquisar secretaria",
  secretarias,
  value,
}: SecretariaComboboxProps) {
  const selectedSecretaria =
    secretarias.find(
      (secretaria) => secretaria.nome === value || secretaria.id === value
    ) ?? null;

  return (
    <Combobox
      items={secretarias}
      value={selectedSecretaria}
      onValueChange={(secretaria: SecretariaComboboxOption | null) =>
        onChange(secretaria?.id === "all" ? "all" : secretaria?.nome ?? null)
      }
      itemToStringLabel={(secretaria: SecretariaComboboxOption) =>
        secretaria.label ?? secretaria.nome
      }
      itemToStringValue={(secretaria: SecretariaComboboxOption) =>
        [secretaria.nome, secretaria.prefeitura_nome].filter(Boolean).join(" ")
      }
      isItemEqualToValue={(
        item: SecretariaComboboxOption,
        selected: SecretariaComboboxOption
      ) => item.id === selected.id}
      disabled={disabled}
    >
      <ComboboxInput id={id} placeholder={placeholder} aria-invalid={invalid} />
      <ComboboxContent>
        <ComboboxEmpty>Nenhuma secretaria encontrada.</ComboboxEmpty>
        <ComboboxList>
          {(secretaria: SecretariaComboboxOption) => (
            <ComboboxItem key={secretaria.id} value={secretaria}>
              <Item size="xs" className="p-0 pr-6">
                <ItemContent>
                  <ItemTitle className="whitespace-nowrap">
                    {secretaria.label ?? secretaria.nome}
                  </ItemTitle>
                  <ItemDescription>
                    {secretaria.prefeitura_nome ?? "Secretaria municipal"}
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
