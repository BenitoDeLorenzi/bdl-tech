"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

type ModulosToastsProps = {
  deleted?: string;
  error?: string;
};

export function ModulosToasts({ deleted, error }: ModulosToastsProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!deleted && !error) {
      return;
    }

    if (deleted) {
      toast.success("Módulo excluído com sucesso.", {
        id: "modulos-deleted",
      });
    }

    if (error) {
      toast.error(decodeURIComponent(error), {
        id: "modulos-error",
      });
    }

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("deleted");
    nextParams.delete("error");

    const queryString = nextParams.toString();
    router.replace(`${pathname}${queryString ? `?${queryString}` : ""}`, {
      scroll: false,
    });
  }, [deleted, error, pathname, router, searchParams]);

  return null;
}
