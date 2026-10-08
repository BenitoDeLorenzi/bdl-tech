"use client";
import { useState, useTransition } from "react";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { Categoria } from "@/lib/gestao-types";
import { reservarCodigoProduto } from "../actions";
import { ProdutoForm } from "./produto-form";
export function NovoProdutoDialog({
  unidadeId,
  categorias,
}: {
  unidadeId: string;
  categorias: Categoria[];
}) {
  const [reserva, setReserva] = useState<{
    reserva_id: string;
    codigo: number;
  } | null>(null);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  function abrir() {
    startTransition(async () => {
      try {
        const result = await reservarCodigoProduto(unidadeId);
        if (!result.reserva) {
          toast.error(result.error ?? "Não foi possível gerar o código.");
          return;
        }
        setReserva(result.reserva);
        setOpen(true);
      } catch {
        toast.error("Não foi possível abrir o cadastro. Tente novamente.");
      }
    });
  }
  return (
    <>
      <Button
        className="h-9 shrink-0 gap-2"
        disabled={pending}
        onClick={abrir}
        aria-label="Novo produto"
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Plus className="size-4" />
        )}
        <span className="hidden sm:inline">Novo produto</span>
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Novo produto</DialogTitle>
            <DialogDescription>
              Cadastre o produto com o mesmo nome utilizado no sistema de
              vendas.
            </DialogDescription>
          </DialogHeader>
          {reserva && (
            <ProdutoForm
              key={reserva.reserva_id}
              unidadeId={unidadeId}
              categorias={categorias}
              reserva={reserva}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
