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

export type VeiculoComboboxOption = {
  ano?: number | null;
  combustivel?: string | null;
  id: string;
  marca: string;
  modelo: string;
  placa: string;
  quilometragem?: number | null;
  secretaria?: string | null;
  status?: string | null;
};

type VeiculoComboboxProps = {
  disabled?: boolean;
  id: string;
  invalid?: boolean;
  onChange: (value: string | null) => void;
  placeholder?: string;
  value: string | null;
  veiculos: VeiculoComboboxOption[];
};

export function VeiculoCombobox({
  disabled,
  id,
  invalid,
  onChange,
  placeholder = "Pesquisar por placa, modelo ou marca",
  value,
  veiculos,
}: VeiculoComboboxProps) {
  const selectedVehicle = veiculos.find((veiculo) => veiculo.id === value) ?? null;

  return (
    <Combobox
      items={veiculos}
      value={selectedVehicle}
      onValueChange={(veiculo: VeiculoComboboxOption | null) =>
        onChange(veiculo?.id ?? null)
      }
      itemToStringLabel={(veiculo: VeiculoComboboxOption) =>
        `${veiculo.modelo} · ${veiculo.placa}`
      }
      itemToStringValue={(veiculo: VeiculoComboboxOption) =>
        [
          veiculo.placa,
          veiculo.modelo,
          veiculo.marca,
          veiculo.secretaria,
          veiculo.combustivel,
        ]
          .filter(Boolean)
          .join(" ")
      }
      isItemEqualToValue={(
        item: VeiculoComboboxOption,
        selected: VeiculoComboboxOption
      ) => item.id === selected.id}
      disabled={disabled}
    >
      <ComboboxInput id={id} placeholder={placeholder} aria-invalid={invalid} />
      <ComboboxContent>
        <ComboboxEmpty>Nenhum veículo encontrado.</ComboboxEmpty>
        <ComboboxList>
          {(veiculo: VeiculoComboboxOption) => (
            <ComboboxItem key={veiculo.id} value={veiculo}>
              <Item size="xs" className="p-0 pr-6">
                <ItemContent>
                  <ItemTitle className="whitespace-nowrap">
                    {veiculo.modelo} · {veiculo.placa}
                  </ItemTitle>
                  <ItemDescription>
                    {[veiculo.marca, veiculo.secretaria || "Sem secretaria"]
                      .filter(Boolean)
                      .join(" · ")}
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
