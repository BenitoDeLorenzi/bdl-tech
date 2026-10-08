"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ListDeleteButton } from "@/components/list-delete-button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { deleteAbastecimento } from "./actions";

export function DeleteAbastecimentoButton({ id, nome }: { id: string; nome: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Tooltip><TooltipTrigger render={<DialogTrigger render={<ListDeleteButton aria-label="Excluir abastecimento" />}>
        <Trash2 className="size-4" />
      </DialogTrigger>} /><TooltipContent>Excluir abastecimento</TooltipContent></Tooltip>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir abastecimento?</DialogTitle>
          <DialogDescription>
            A ordem cancelada {nome} será excluída permanentemente. A quilometragem atual do veículo será mantida.
          </DialogDescription>
        </DialogHeader>
        {open ? <DeleteAbastecimentoForm id={id} onClose={() => setOpen(false)} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function DeleteAbastecimentoForm({ id, onClose }: { id: string; onClose: () => void }) {
  const [state, action, pending] = useActionState(deleteAbastecimento, {});
  const router = useRouter();
  useEffect(() => {
    if (state.success) {
      toast.success(state.success);
      onClose();
      router.refresh();
    }
  }, [state.success, onClose, router]);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="id" value={id} />
      {state.error ? <p role="alert" className="text-sm text-destructive">{state.error}</p> : null}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose} disabled={pending}>Cancelar</Button>
        <Button type="submit" variant="destructive" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
          {pending ? "Excluindo..." : "Excluir abastecimento"}
        </Button>
      </DialogFooter>
    </form>
  );
}
