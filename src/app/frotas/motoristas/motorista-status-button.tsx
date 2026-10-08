"use client";
import { CadastroStatusButton } from "@/components/cadastro-status-button";
import { updateMotoristaStatus } from "./actions";
export function MotoristaStatusButton({ motoristaId, status }: { motoristaId: string; status: "active" | "inactive" }) {
  return <CadastroStatusButton id={motoristaId} status={status} entity="motorista" action={updateMotoristaStatus} />;
}
