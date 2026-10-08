"use client";

import { CancelFrotaForm } from "@/components/cancel-frota-form";
import { ListStatusActionButton } from "@/components/list-status-action-button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type Props = {
  id: string;
  label: string;
  action: (state: { error?: string; success?: string }, data: FormData) => Promise<{ error?: string; success?: string }>;
};

export function CancelFrotaDialog({ id, label, action }: Props) {
  return (
    <Dialog>
      <Tooltip>
        <TooltipTrigger render={<DialogTrigger render={<ListStatusActionButton action="cancel" aria-label={label} />} />} />
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
          <DialogDescription>Informe o motivo do cancelamento. Para corrigir informações, cancele este registro e cadastre um novo.</DialogDescription>
        </DialogHeader>
        <CancelFrotaForm id={id} action={action} />
      </DialogContent>
    </Dialog>
  );
}
