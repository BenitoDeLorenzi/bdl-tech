"use client";

import { Copy } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type CopyValueButtonProps = {
  label: string;
  value?: string | null;
};

export function CopyValueButton({ label, value }: CopyValueButtonProps) {
  const disabled = !value;

  async function copyValue() {
    if (!value) {
      return;
    }

    await navigator.clipboard.writeText(value);
    toast.success(`${label} copiado.`, {
      id: `copy-${label}-${value}`,
    });
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={disabled}
            aria-label={`Copiar ${label}`}
            onClick={copyValue}
          >
            <Copy className="size-3.5" />
          </Button>
        }
      />
      <TooltipContent>Copiar {label}</TooltipContent>
    </Tooltip>
  );
}
