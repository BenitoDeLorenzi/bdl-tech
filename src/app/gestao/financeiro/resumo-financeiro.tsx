import Link from "next/link";
import { Wallet, CreditCard, CalendarClock, Users } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { dinheiro } from "@/lib/gestao-types";
import { resumoContas, type FinanceiroData } from "@/lib/gestao-contas";
export function ResumoFinanceiro({
  data,
  equipe,
}: {
  data: FinanceiroData;
  equipe: number;
}) {
  if (!data.inicio)
    return (
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-4">
          <p className="text-sm">
            Configure os saldos iniciais para acompanhar o dinheiro disponível e
            os compromissos.
          </p>
          <Link
            className="text-sm font-medium text-primary hover:underline"
            href="/gestao/financeiro/contas"
          >
            Ativar financeiro
          </Link>
        </CardContent>
      </Card>
    );
  const r = resumoContas(data);
  return (
    <section aria-label="Posição financeira atual" className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            title: "Disponível agora",
            value: r.disponivel,
            icon: Wallet,
            note: "Caixa e bancos",
            href: "/gestao/financeiro/contas",
          },
          {
            title: "No sistema de cobrança",
            value: r.retido,
            icon: CreditCard,
            note: `${dinheiro(r.reservado)} reservados em solicitações`,
            href: "/gestao/financeiro/contas",
          },
          {
            title: "A pagar em 7 dias",
            value: r.pagar7,
            icon: CalendarClock,
            note: "Inclui contas vencidas; equipe separada",
            href: "/gestao/financeiro/pagar?status=pendentes",
          },
          {
            title: "Pendente da equipe",
            value: equipe,
            icon: Users,
            note: "Saldo dos colaboradores",
            href: "/gestao/equipe",
          },
        ].map(({ title, value, icon: Icon, note, href }) => (
          <Card key={title} className="gap-3">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Icon className="size-4 text-muted-foreground" />
                {title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Link
                className={`text-2xl font-semibold tabular-nums hover:underline ${value < 0 ? "text-destructive" : ""}`}
                href={href}
              >
                {dinheiro(value)}
              </Link>
              <p className="mt-2 text-xs text-muted-foreground">{note}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/30 p-3 text-sm">
        <div>
          <span className="font-medium">Saldo após compromissos próximos</span>
          <p className="text-xs text-muted-foreground">
            Caixa + bancos + sistema − contas vencidas e a vencer em 7 dias −
            saldo da equipe. Inclui valores retidos, sem previsão de depósito.
          </p>
        </div>
        <strong className="tabular-nums">
          {dinheiro(r.disponivel + r.retido - r.pagar7 - equipe)}
        </strong>
      </div>
    </section>
  );
}
