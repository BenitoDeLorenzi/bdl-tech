"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { excluirFechamento } from "../actions";

export function ExcluirFechamentoButton({
  unidadeId,
  id,
  versao,
  identificacao,
  voltarParaLista = false,
}: {
  unidadeId: string;
  id: string;
  versao: number;
  identificacao: string;
  voltarParaLista?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function excluir() {
    setError("");
    startTransition(async () => {
      try {
        const result = await excluirFechamento(unidadeId, id, versao);
        if (result.error) {
          setError(result.error);
          return;
        }
        setOpen(false);
        toast.success("Fechamento excluído.");
        if (voltarParaLista) router.replace("/gestao/fechamentos");
        router.refresh();
      } catch {
        setError(
          "Não foi possível excluir. Atualize a página e tente novamente.",
        );
      }
    });
  }

  return (
    <>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-destructive hover:text-destructive"
              aria-label={`Excluir fechamento: ${identificacao}`}
              onClick={() => {
                setError("");
                setOpen(true);
              }}
            >
              <Trash2 className="size-4" />
            </Button>
          }
        />
        <TooltipContent>Excluir fechamento</TooltipContent>
      </Tooltip>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!pending) setOpen(value);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir fechamento?</DialogTitle>
            <DialogDescription>
              O fechamento de {identificacao} será excluído. Esta ação não pode
              ser desfeita. As vendas e cortesias serão devolvidas ao estoque, e
              os recebimentos, despesas e lançamentos da equipe serão removidos.
              A auditoria será preservada. Se houver lançamentos posteriores
              dependentes da equipe, reabra-os primeiro.
            </DialogDescription>
          </DialogHeader>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button variant="destructive" disabled={pending} onClick={excluir}>
              {pending ? "Excluindo…" : "Excluir fechamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
