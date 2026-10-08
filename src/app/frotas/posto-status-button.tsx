"use client";
import { CadastroStatusButton } from "@/components/cadastro-status-button";
import { updatePostoCredenciadoStatus } from "./actions";
export function PostoStatusButton({ postoId, status }: { postoId: string; status: "active" | "inactive" }) {
  return <CadastroStatusButton id={postoId} status={status} entity="posto" action={updatePostoCredenciadoStatus} />;
}
