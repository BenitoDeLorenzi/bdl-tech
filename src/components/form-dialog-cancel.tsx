"use client";

import { Button } from "@/components/ui/button";
import { DialogClose } from "@/components/ui/dialog";

export function FormDialogCancel({ disabled = false }: { disabled?: boolean }) {
  return (
    <DialogClose render={<Button type="button" variant="outline" disabled={disabled} />}>
      Cancelar
    </DialogClose>
  );
}
