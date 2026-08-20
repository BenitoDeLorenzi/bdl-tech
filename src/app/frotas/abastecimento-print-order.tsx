"use client";

import { useState } from "react";
import { AlertCircle, Loader2, Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { type FrotaAbastecimento } from "@/lib/frotas-data";
import {
  type FrotaActionState,
  registerAbastecimentoPrint,
} from "./actions";

type AbastecimentoPrintOrderProps = {
  abastecimento: FrotaAbastecimento;
};

export function AbastecimentoPrintOrder({
  abastecimento,
}: AbastecimentoPrintOrderProps) {
  const [state, setState] = useState<FrotaActionState>({});
  const [actionPending, setActionPending] = useState(false);

  async function printOrder() {
    const formData = new FormData();
    formData.set("id", abastecimento.id);
    setActionPending(true);

    const result = await registerAbastecimentoPrint({}, formData);
    setState(result);
    setActionPending(false);

    if (result.success) {
      requestAnimationFrame(() => window.print());
    }
  }

  return (
    <div className="space-y-4">
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }

          #fuel-order-${abastecimento.id},
          #fuel-order-${abastecimento.id} * {
            visibility: visible;
          }

          #fuel-order-${abastecimento.id} {
            position: absolute;
            inset: 0 auto auto 0;
            width: 80mm;
            padding: 4mm;
            color: #000;
            background: #fff;
            font-family: Arial, sans-serif;
          }

          @page {
            size: 80mm auto;
            margin: 0;
          }
        }
      `}</style>

      <div
        id={`fuel-order-${abastecimento.id}`}
        className="mx-auto w-[302px] rounded-lg border bg-white p-4 font-mono text-[12px] leading-tight text-black"
      >
        <div className="text-center">
          {abastecimento.prefeitura_brasao_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={abastecimento.prefeitura_brasao_url}
              alt={`Brasão de ${abastecimento.prefeitura_nome}`}
              className="mx-auto mb-2 h-12 w-12 object-contain"
            />
          ) : null}
          <div className="text-[15px] font-bold">FROTAS PÚBLICAS</div>
          <div className="mt-1 text-[11px]">{abastecimento.prefeitura_nome}</div>
          <div className="mt-2 border-y border-dashed border-black py-2 text-[13px] font-bold">
            ORDEM DE ABASTECIMENTO
          </div>
        </div>

        <div className="mt-3 space-y-1">
          <ReceiptLine label="Ordem" value={abastecimento.numero_ordem} />
          <ReceiptLine
            label="Data"
            value={formatDate(abastecimento.data_abastecimento)}
          />
          <ReceiptLine
            label="Validade"
            value={
              abastecimento.expires_at
                ? formatDateTime(abastecimento.expires_at)
              : "-"
            }
          />
        </div>

        <div className="mt-3 border-y border-dashed border-black py-3 text-center">
          <div className="text-[10px] font-bold uppercase tracking-normal">
            Placa
          </div>
          <div className="mt-1 text-[26px] font-black leading-none">
            {abastecimento.placa}
          </div>
          <div className="mt-2 text-[13px] font-bold">
            {abastecimento.modelo}
          </div>
        </div>

        <div className="mt-3 space-y-1">
          <ReceiptLine label="Secretaria" value={abastecimento.secretaria} />
          <ReceiptLine label="Motorista" value={abastecimento.motorista} />
          <ReceiptLine label="Posto" value={abastecimento.posto_nome ?? "-"} />
          <ReceiptLine label="Combustível" value={abastecimento.combustivel} />
          {abastecimento.arla_incluso ? (
            <ReceiptLine label="ARLA" value="Autorizado" />
          ) : null}
          <ReceiptLine label="Emitido por" value={abastecimento.emitido_por ?? "-"} />
        </div>

        {abastecimento.observacoes ? (
          <div className="mt-3 border-t border-dashed border-black pt-2">
            <div className="font-bold">Observações</div>
            <div>{abastecimento.observacoes}</div>
          </div>
        ) : null}

        <div className="mt-8 border-t border-black pt-1 text-center">
          Assinatura do emissor
        </div>
      </div>

      {state.error ? (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{state.error}</span>
        </div>
      ) : null}

      <Button
        className="w-full gap-2"
        onClick={printOrder}
        disabled={actionPending}
      >
        {actionPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Printer className="size-4" />
        )}
        {actionPending ? "Registrando..." : "Imprimir ordem"}
      </Button>
    </div>
  );
}

function ReceiptLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[92px_1fr] gap-2">
      <span className="font-bold">{label}:</span>
      <span className="break-words">{value}</span>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00.000Z`));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}
