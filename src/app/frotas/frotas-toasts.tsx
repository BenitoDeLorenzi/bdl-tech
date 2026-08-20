"use client";

import { useEffect } from "react";
import { toast } from "sonner";

type FrotasToastsProps = {
  deleted?: string;
  error?: string;
};

export function FrotasToasts({ deleted, error }: FrotasToastsProps) {
  useEffect(() => {
    if (deleted) {
      toast.success("Veículo excluído com sucesso.", {
        id: "veiculo-delete-success",
      });
    }
  }, [deleted]);

  useEffect(() => {
    if (error) {
      toast.error(error, {
        id: "frotas-error",
      });
    }
  }, [error]);

  return null;
}
