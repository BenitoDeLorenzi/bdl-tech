"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ListDeleteButton } from "@/components/list-delete-button";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
type Action = (state: { error?: string; success?: string }, data: FormData) => Promise<{ error?: string; success?: string }>;

export function DeleteCadastroButton({ id, nome, entity, action }: { id: string; nome: string; entity: string; action: Action }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Tooltip><TooltipTrigger render={<DialogTrigger render={<ListDeleteButton aria-label={`Excluir ${entity}`} />}>
        <Trash2 className="size-4" />
      </DialogTrigger>} /><TooltipContent>Excluir {entity}</TooltipContent></Tooltip>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir {entity}?</DialogTitle>
          <DialogDescription>
            {nome} será excluído permanentemente. Cadastros com operações vinculadas devem ser inativados para preservar o histórico.
          </DialogDescription>
        </DialogHeader>
        {open ? <DeleteCadastroForm id={id} action={action} entity={entity} onClose={() => setOpen(false)} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function DeleteCadastroForm({ id, onClose, action: deleteAction, entity }: { id: string; onClose: () => void; action: Action; entity: string }) {
  const [state, action, pending] = useActionState(deleteAction, {});
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
          {pending ? "Excluindo..." : `Excluir ${entity}`}
        </Button>
      </DialogFooter>
    </form>
  );
}
