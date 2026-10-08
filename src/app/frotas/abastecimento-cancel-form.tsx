"use client";
import { CancelFrotaForm } from "@/components/cancel-frota-form";
import type { FrotaAbastecimento } from "@/lib/frotas-data";
import { cancelAbastecimento } from "./actions";
export function AbastecimentoCancelForm({ abastecimento }: { abastecimento: FrotaAbastecimento }) {
  return <CancelFrotaForm id={abastecimento.id} action={cancelAbastecimento} />;
}
