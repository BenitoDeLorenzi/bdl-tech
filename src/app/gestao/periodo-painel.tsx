"use client";

import { useRouter } from "next/navigation";
import { FormSelect } from "@/components/form-select";
import { periodosPainel } from "@/lib/gestao-painel";

export function PeriodoPainel({ value }: { value: string }) {
  const router = useRouter();
  return (
    <div className="w-40 sm:w-44">
      <FormSelect
        aria-label="Período do painel"
        value={value}
        options={periodosPainel}
        groupLabel="Período"
        onValueChange={(periodo) =>
          router.replace(`/gestao?periodo=${periodo}`, { scroll: false })
        }
      />
    </div>
  );
}
