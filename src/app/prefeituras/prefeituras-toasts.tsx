"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

type PrefeiturasToastsProps = {
  created?: string;
  deleted?: string;
  error?: string;
  updated?: string;
};

export function PrefeiturasToasts({
  created,
  deleted,
  error,
  updated,
}: PrefeiturasToastsProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!created && !deleted && !error && !updated) {
      return;
    }

    if (created) {
      toast.success("Prefeitura cadastrada com sucesso.", {
        id: "prefeituras-created",
      });
    }

    if (updated) {
      toast.success("Prefeitura atualizada com sucesso.", {
        id: "prefeituras-updated",
      });
    }

    if (deleted) {
      toast.success("Prefeitura excluída com sucesso.", {
        id: "prefeituras-deleted",
      });
    }

    if (error) {
      toast.error(decodeURIComponent(error), {
        id: "prefeituras-error",
      });
    }

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("created");
    nextParams.delete("deleted");
    nextParams.delete("updated");
    nextParams.delete("error");

    const queryString = nextParams.toString();
    router.replace(`${pathname}${queryString ? `?${queryString}` : ""}`, {
      scroll: false,
    });
  }, [created, deleted, error, pathname, router, searchParams, updated]);

  return null;
}
