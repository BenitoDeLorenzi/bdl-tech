"use client";

import { useEffect } from "react";
import { toast } from "sonner";

type VencimentosToastsProps = {
  error?: string;
  renewed?: string;
};

export function VencimentosToasts({ error, renewed }: VencimentosToastsProps) {
  useEffect(() => {
    if (renewed) {
      toast.success("Vencimento renovado por mais 1 ano.", {
        id: "vencimento-renewed",
      });
    }
  }, [renewed]);

  useEffect(() => {
    if (error) {
      toast.error(error, {
        id: "vencimentos-error",
      });
    }
  }, [error]);

  return null;
}
