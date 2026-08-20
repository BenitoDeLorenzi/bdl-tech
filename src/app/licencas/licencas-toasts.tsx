"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

type LicencasToastsProps = {
  deleted?: string;
  error?: string;
};

export function LicencasToasts({ deleted, error }: LicencasToastsProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!deleted && !error) {
      return;
    }

    if (deleted) {
      toast.success("Licença excluída com sucesso.", {
        id: "licencas-deleted",
      });
    }

    if (error) {
      toast.error(decodeURIComponent(error), {
        id: "licencas-error",
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
