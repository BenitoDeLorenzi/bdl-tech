"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, History, Wallet, Send, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import type { ContaFinanceira, ContaPagar } from "@/lib/gestao-contas";
import { FinanceiroForm } from "../financeiro-form";

export function ContaActions({
  conta,
  contas,
  livre,
  solicitado,
}: {
  conta: ContaPagar;
  contas: ContaFinanceira[];
  livre: number;
  solicitado: number;
}) {
  const [acao, setAcao] = useState<
    "pagar" | "solicitar_pagamento" | "cancelar" | null
  >(null);
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const sistema = contas.find((c) => c.ativo && c.tipo === "cobranca");
  const podeCancelar =
    !conta.cancelada &&
    !conta.fechamento_id &&
    solicitado === 0 &&
    Number(conta.pago) === 0;
  function abrir(value: NonNullable<typeof acao>) {
    setAcao(value);
    setOpen(true);
  }
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              ref={trigger}
              variant="outline"
              size="sm"
              aria-label={`Ações de ${conta.descricao}`}
            />
          }
        >
          Ações <ChevronDown className="size-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem
            render={
              <Link href={`/gestao/financeiro/extratos?pagar=${conta.id}`} />
            }
          >
            <History />
            Histórico
          </DropdownMenuItem>
          {livre > 0 && (
            <DropdownMenuItem onClick={() => abrir("pagar")}>
              <Wallet />
              Registrar pagamento
            </DropdownMenuItem>
          )}
          {livre > 0 && sistema && (
            <DropdownMenuItem onClick={() => abrir("solicitar_pagamento")}>
              <Send />
              Solicitar ao sistema
            </DropdownMenuItem>
          )}
          {podeCancelar && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => abrir("cancelar")}
              >
                <Ban />
                Cancelar conta
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {acao && (
        <FinanceiroForm
          acao={acao}
          label={
            acao === "pagar"
              ? "Registrar pagamento"
              : acao === "solicitar_pagamento"
                ? "Solicitar ao sistema"
                : "Cancelar conta"
          }
          contas={contas}
          defaults={{
            id: conta.id,
            valor: String(livre),
            ...(acao === "solicitar_pagamento"
              ? { conta_id: sistema?.id ?? "" }
              : {}),
          }}
          description={
            acao === "cancelar"
              ? "A conta será cancelada e permanecerá no histórico."
              : acao === "pagar"
                ? `${conta.descricao}. Registre apenas pagamentos já executados. Selecione o sistema de cobrança quando ele pagou diretamente.`
                : conta.descricao
          }
          open={open}
          onOpenChange={setOpen}
          returnFocus={trigger}
        />
      )}
    </>
  );
}
