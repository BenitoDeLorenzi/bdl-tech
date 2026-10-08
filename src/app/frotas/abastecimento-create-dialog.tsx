"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { AbastecimentoForm } from "@/app/frotas/abastecimento-form";
import { AbastecimentoPrintOrder } from "@/app/frotas/abastecimento-print-order";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  type FrotaAbastecimento,
  type FrotaPostoCredenciado,
  type FrotaVeiculo,
} from "@/lib/frotas-data";

type AbastecimentoCreateDialogProps = {
  className?: string;
  label?: string;
  motoristas: { id: string; nome: string; cpf: string | null }[];
  postos: FrotaPostoCredenciado[];
  veiculos: FrotaVeiculo[];
};

export function AbastecimentoCreateDialog({
  className,
  label = "Nova ordem",
  motoristas,
  postos,
  veiculos,
}: AbastecimentoCreateDialogProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<FrotaAbastecimento | null>(
    null
  );

  function handleCreated(abastecimento: FrotaAbastecimento) {
    setCreatedOrder(abastecimento);
    setPrintOpen(true);
  }

  return (
    <>
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogTrigger
          render={
            <Button className={className}>
              <Plus className="size-4" />
              {label}
            </Button>
          }
        />
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Nova ordem de abastecimento</DialogTitle>
          </DialogHeader>
          <AbastecimentoForm
            onCreated={handleCreated}
            motoristas={motoristas}
            postos={postos}
            veiculos={veiculos}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={printOpen} onOpenChange={setPrintOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Impressão térmica</DialogTitle>
            <DialogDescription>
              Ordem emitida com sucesso. Imprima e colete a assinatura do
              emissor.
            </DialogDescription>
          </DialogHeader>
          {createdOrder ? (
            <AbastecimentoPrintOrder abastecimento={createdOrder} />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
