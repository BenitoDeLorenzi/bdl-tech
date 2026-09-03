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
      toast.success("Débito renovado por mais 1 ano.", {
        id: "debito-renewed",
      });
    }
  }, [renewed]);

  useEffect(() => {
    if (error) {
      toast.error(error, {
        id: "debitos-error",
      });
    }
  }, [error]);

  return null;
}
