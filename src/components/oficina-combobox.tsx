"use client";
import type { FrotaOficina } from "@/lib/oficinas-data";
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxList,
  ComboboxItem,
} from "@/components/ui/combobox";

export function OficinaCombobox({
  id,
  oficinas,
  value,
  onChange,
  disabled,
  invalid,
}: {
  id: string;
  oficinas: FrotaOficina[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
  invalid?: boolean;
}) {
  return (
    <Combobox
      items={oficinas}
      value={oficinas.find((item) => item.id === value) ?? null}
      onValueChange={(item) => onChange(item?.id ?? "")}
      itemToStringLabel={(item) => item.nome}
      itemToStringValue={(item) =>
        `${item.nome} ${item.documento ?? ""} ${item.especialidades ?? ""}`
      }
      isItemEqualToValue={(a, b) => a.id === b.id}
      disabled={disabled}
    >
      <ComboboxInput
        id={id}
        aria-invalid={invalid}
        placeholder="Pesquisar oficina"
      />
      <ComboboxContent>
        <ComboboxEmpty>Nenhuma oficina encontrada.</ComboboxEmpty>
        <ComboboxList>
          {(item) => (
            <ComboboxItem key={item.id} value={item}>
              <div className="flex flex-col gap-0.5">
                <span>
                  {item.nome}
                  {item.status === "inactive" ? " (inativa)" : ""}
                </span>
                <span className="text-xs text-muted-foreground">
                  {[item.documento, item.especialidades]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </div>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
