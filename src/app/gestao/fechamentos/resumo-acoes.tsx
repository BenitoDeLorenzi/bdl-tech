"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { CheckCheck, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { operarGestao } from "../actions";

export function ResumoAcoes({
  id,
  unidadeId,
  versao,
  conferido,
  conciliado,
}: {
  id: string;
  unidadeId: string;
  versao: number;
  conferido: boolean;
  conciliado: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const form = useForm({ defaultValues: { motivo: "" } });
  function executar(motivo = "") {
    form.clearErrors("root");
    startTransition(async () => {
      try {
        const result = await operarGestao(conferido ? "reabrir" : "confirmar", {
          id,
          unidade_id: unidadeId,
          versao,
          motivo,
        });
        if (result.error) {
          form.setError("root", { message: result.error });
          return;
        }
        setOpen(false);
        toast.success(
          conferido
            ? "Fechamento reaberto para correção."
            : "Fechamento confirmado.",
        );
        router.refresh();
      } catch {
        form.setError("root", {
          message:
            "Não foi possível concluir. Atualize a página e tente novamente.",
        });
      }
    });
  }
  return (
    <>
      <Button
        variant={conferido ? "outline" : "default"}
        disabled={pending || (!conferido && !conciliado)}
        onClick={() => {
          form.reset();
          setOpen(true);
        }}
      >
        {conferido ? (
          <RotateCcw className="size-4" />
        ) : (
          <CheckCheck className="size-4" />
        )}
        {conferido ? "Reabrir para corrigir" : "Confirmar fechamento"}
      </Button>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!pending) setOpen(value);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {conferido ? "Reabrir fechamento" : "Confirmar fechamento?"}
            </DialogTitle>
            <DialogDescription>
              {conferido
                ? "As baixas de estoque e os lançamentos da equipe serão estornados. Se houver lançamentos posteriores da equipe, reabra-os primeiro. Informe o motivo da correção."
                : "As vendas serão baixadas do estoque, os preços serão atualizados e os trabalhos e pagamentos da equipe serão registrados."}
            </DialogDescription>
          </DialogHeader>
          <form
            noValidate
            onSubmit={form.handleSubmit(({ motivo }) => executar(motivo))}
            className="space-y-4"
          >
            {conferido && (
              <Field data-invalid={Boolean(form.formState.errors.motivo)}>
                <FieldLabel htmlFor="motivo-reabertura">
                  Justificativa
                </FieldLabel>
                <Input
                  id="motivo-reabertura"
                  disabled={pending}
                  aria-invalid={Boolean(form.formState.errors.motivo)}
                  {...form.register("motivo", {
                    validate: (value) =>
                      (value.trim().length >= 5 &&
                        value.trim().length <= 500) ||
                      "Informe entre 5 e 500 caracteres.",
                  })}
                />
                <FieldError errors={[form.formState.errors.motivo]} />
              </Field>
            )}
            <FieldError errors={[form.formState.errors.root]} />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => setOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={pending}>
                {pending
                  ? "Processando…"
                  : conferido
                    ? "Reabrir fechamento"
                    : "Confirmar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
