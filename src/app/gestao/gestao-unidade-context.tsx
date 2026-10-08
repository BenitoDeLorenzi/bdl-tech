"use client";
import { useTransition } from "react";
import { SidebarIdentity } from "@/components/sidebar-identity";
import type { Empresa, Unidade } from "@/lib/gestao-types";
import { selecionarUnidade } from "./actions";
export function GestaoUnidadeContext({
  empresas,
  unidades,
  selectedId,
  master = false,
}: {
  empresas: Empresa[];
  unidades: Unidade[];
  selectedId?: string;
  master?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const unidade = unidades.find((u) => u.id === selectedId);
  const empresa = empresas.find((e) => e.id === unidade?.empresa_id);
  return (
    <SidebarIdentity
      moduleName="Vibe Gestão"
      name={empresa?.nome_fantasia || empresa?.nome || "Selecione uma empresa"}
      description={unidade?.nome ?? "Estabelecimento"}
      logoUrl={empresa?.logo_url}
      selectedId={selectedId}
      pending={pending}
      options={
        master
          ? unidades.map((u) => {
              const e = empresas.find((e) => e.id === u.empresa_id);
              return {
                id: u.id,
                name: e?.nome_fantasia || e?.nome || "Empresa",
                description: u.nome,
                logoUrl: e?.logo_url,
              };
            })
          : undefined
      }
      onSelect={
        master
          ? (id) => {
              const data = new FormData();
              data.set("unidade_id", id);
              startTransition(() => selecionarUnidade(data));
            }
          : undefined
      }
    />
  );
}
