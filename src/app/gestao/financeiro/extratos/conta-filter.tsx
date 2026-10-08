"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { FormSelect } from "@/components/form-select";
export function ContaFilter({
  contas,
  value,
}: {
  contas: { id: string; nome: string }[];
  value?: string;
}) {
  const router = useRouter();
  const search = useSearchParams();
  return (
    <div className="w-48 sm:w-56">
      <FormSelect
        aria-label="Filtrar extrato por conta"
        value={value || "todas"}
        options={[
          { value: "todas", label: "Todas as contas" },
          ...contas.map((c) => ({ value: c.id, label: c.nome })),
        ]}
        onValueChange={(v) => {
          const params = new URLSearchParams(search);
          params.delete("pagina");
          if (v === "todas") params.delete("conta");
          else params.set("conta", v);
          router.push("/gestao/financeiro/extratos?" + params.toString());
        }}
      />
    </div>
  );
}
