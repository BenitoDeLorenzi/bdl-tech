"use client";
import type { Ref } from "react";
import type { Colaborador } from "@/lib/gestao-equipe";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";

const normalizar = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
export function ColaboradorCombobox({
  id,
  colaboradores,
  value,
  onValueChange,
  onBlur,
  inputRef,
  disabled,
  invalid,
}: {
  id: string;
  colaboradores: Colaborador[];
  value: string;
  onValueChange: (value: string) => void;
  onBlur?: () => void;
  inputRef?: Ref<HTMLInputElement>;
  disabled?: boolean;
  invalid?: boolean;
}) {
  return (
    <Combobox
      items={colaboradores}
      value={colaboradores.find((c) => c.id === value) ?? null}
      disabled={disabled}
      onValueChange={(c: Colaborador | null) => onValueChange(c?.id ?? "")}
      itemToStringLabel={(c: Colaborador) => c.nome}
      itemToStringValue={(c: Colaborador) => c.id}
      isItemEqualToValue={(a: Colaborador, b: Colaborador) => a.id === b.id}
      filter={(c: Colaborador, query: string) =>
        normalizar(c.nome + " " + c.funcao).includes(normalizar(query.trim()))
      }
    >
      <ComboboxInput
        id={id}
        ref={inputRef}
        onBlur={onBlur}
        aria-invalid={invalid}
        placeholder="Pesquisar colaborador pelo nome"
      />
      <ComboboxContent>
        <ComboboxEmpty>Nenhum colaborador encontrado.</ComboboxEmpty>
        <ComboboxList>
          {(c: Colaborador) => (
            <ComboboxItem key={c.id} value={c}>
              <div className="min-w-0 pr-6">
                <div className="font-medium">
                  {c.nome}
                  {!c.ativo ? " (inativo)" : ""}
                </div>
                <div className="text-xs text-muted-foreground">{c.funcao}</div>
              </div>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
