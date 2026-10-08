import { CircleX } from "lucide-react";

export function CancellationDetails({ date, reason }: { date: string | null; reason: string | null }) {
  return <div className="w-full rounded-lg border border-destructive/20 bg-destructive/5 p-2.5">
    <div className="flex items-center gap-2 text-xs font-medium text-destructive"><CircleX className="size-3.5" />Cancelamento</div>
    <dl className="mt-2 grid gap-2 text-xs">
      <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Cancelado em</dt><dd>{date ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(date)) : "-"}</dd></div>
      <div className="grid gap-1"><dt className="text-muted-foreground">Motivo</dt><dd className="whitespace-pre-wrap break-words">{reason ?? "-"}</dd></div>
    </dl>
  </div>;
}
