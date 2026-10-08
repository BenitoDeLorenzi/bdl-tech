import {
  CircleAlert,
  TriangleAlert,
  CircleCheck,
  CircleMinus,
} from "lucide-react";
import { ListBadge } from "../ui";
import { alertaEstoque } from "@/lib/gestao-estoque-alertas";

export function EstoqueStatus({
  produto,
}: {
  produto: Parameters<typeof alertaEstoque>[0];
}) {
  const alerta = alertaEstoque(produto);
  const Icon =
    alerta.nivel === "critico"
      ? CircleAlert
      : alerta.nivel === "atencao"
        ? TriangleAlert
        : alerta.nivel === "regular"
          ? CircleCheck
          : CircleMinus;
  return (
    <ListBadge
      icon={Icon}
      tone={
        alerta.nivel === "critico"
          ? "danger"
          : alerta.nivel === "atencao"
            ? "warning"
            : alerta.nivel === "regular"
              ? "success"
              : "neutral"
      }
    >
      {alerta.label}
    </ListBadge>
  );
}
