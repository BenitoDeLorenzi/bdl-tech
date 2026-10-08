"use client";
import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import type { Produto } from "@/lib/gestao-types";
import { codigoProduto } from "@/lib/gestao-types";
import { excluirProduto, operarGestao } from "../actions";

export function ExcluirProdutoDialog({ produto }: { produto: Produto }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  function executar(inativar: boolean) {
    setError("");
    startTransition(async () => {
      try {
        const result = inativar
          ? await operarGestao("produto", {
              ...produto,
              ativo: false,
              preco: produto.preco ?? "",
            })
          : await excluirProduto(
              produto.unidade_id,
              produto.id,
              produto.versao,
            );
        if (result.error) {
          setError(result.error);
          return;
        }
        toast.success(
          inativar
            ? "Produto inativado. Histórico e saldo preservados."
            : "Produto excluído.",
        );
        setOpen(false);
        router.refresh();
      } catch {
        setError("Não foi possível concluir. Tente novamente.");
      }
    });
  }
  return (
    <>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-destructive hover:text-destructive"
              aria-label={"Excluir " + produto.nome}
              onClick={() => {
                setError("");
                setOpen(true);
              }}
            >
              <Trash2 className="size-4" />
            </Button>
          }
        />
        <TooltipContent>Excluir produto</TooltipContent>
      </Tooltip>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!pending) setOpen(value);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir produto</DialogTitle>
            <DialogDescription>
              {produto.nome} · {codigoProduto(produto.codigo)}
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm">
            A exclusão é definitiva e só será permitida com saldo zerado e sem
            histórico de movimentações ou fechamentos, inclusive rascunhos.
          </p>
          <p className="text-sm text-muted-foreground">
            Para deixar de utilizar o produto, você pode inativá-lo e preservar
            o saldo e todo o histórico.
          </p>
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
            {produto.ativo && (
              <Button
                variant="secondary"
                disabled={pending}
                onClick={() => executar(true)}
              >
                Inativar produto
              </Button>
            )}
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() => executar(false)}
            >
              {pending ? "Processando…" : "Excluir produto"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
