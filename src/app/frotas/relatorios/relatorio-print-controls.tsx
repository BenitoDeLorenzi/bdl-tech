"use client";

import { useEffect } from "react";
import { Printer } from "lucide-react";

import { Button } from "@/components/ui/button";

export function RelatorioPrintButton() {
  return (
    <Button
      className="h-9 gap-2"
      type="button"
      onClick={() => window.print()}
    >
      <Printer className="size-4" />
      Imprimir / PDF
    </Button>
  );
}

export function RelatorioAutoPrint({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const timeout = window.setTimeout(() => window.print(), 250);

    return () => window.clearTimeout(timeout);
  }, [enabled]);

  return null;
}
