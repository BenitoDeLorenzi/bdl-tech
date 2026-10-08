"use client";
import { DeleteCadastroButton } from "@/components/delete-cadastro-button";
import { deleteOficina } from "./actions";
export function DeleteOficinaButton({ id, nome }: { id: string; nome: string }) {
  return <DeleteCadastroButton id={id} nome={nome} entity="oficina" action={deleteOficina} />;
}
