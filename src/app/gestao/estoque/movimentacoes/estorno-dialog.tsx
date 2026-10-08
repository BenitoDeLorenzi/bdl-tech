"use client";
import { useId, useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { Undo2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { quantidade, dinheiro, type Movimento } from "@/lib/gestao-types";
import { estornarMovimento } from "../../actions";

export function EstornoDialog({
  movimento,
  unidadeId,
  nome,
  unidade,
}: {
  movimento: Movimento;
  unidadeId: string;
  nome: string;
  unidade: string;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const id = useId();
  const form = useForm<{ motivo: string }>({ defaultValues: { motivo: "" } });
  const { errors, isSubmitting } = form.formState;
  async function salvar({ motivo }: { motivo: string }) {
    form.clearErrors("root");
    try {
      const result = await estornarMovimento(unidadeId, movimento.id, motivo);
      if (result.error) {
        form.setError("root", { message: result.error });
        return;
      }
      toast.success(result.success);
      setOpen(false);
      router.refresh();
    } catch {
      form.setError("root", {
        message: "Não foi possível estornar. Tente novamente.",
      });
    }
  }
  return (
    <>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={"Estornar " + nome + " " + movimento.id.slice(0, 8)}
              onClick={() => {
                form.reset();
                setOpen(true);
              }}
            >
              <Undo2 className="size-4" />
            </Button>
          }
        />
        <TooltipContent>Estornar movimentação</TooltipContent>
      </Tooltip>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!isSubmitting) setOpen(value);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Estornar movimentação</DialogTitle>
            <DialogDescription>
              {nome} · {movimento.tipo} · Registro {movimento.id.slice(0, 8)}
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm">
            Será registrada uma movimentação inversa de{" "}
            <strong>
              {quantidade(-movimento.quantidade)} {unidade}
            </strong>
            . O lançamento original permanecerá no histórico.
          </p>
          {movimento.custo_total !== null && (
            <p className="text-sm">
              Reversão do custo da entrada:{" "}
              <strong>{dinheiro(-movimento.custo_total)}</strong>.
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Após estornar, registre uma nova movimentação com os dados corretos,
            se necessário. Não é possível estornar um estorno.
          </p>
          <form
            noValidate
            onSubmit={form.handleSubmit(salvar)}
            className="space-y-4"
          >
            <Field data-invalid={Boolean(errors.motivo)}>
              <FieldLabel htmlFor={id}>Justificativa</FieldLabel>
              <Input
                id={id}
                disabled={isSubmitting}
                aria-invalid={Boolean(errors.motivo)}
                aria-describedby={errors.motivo ? id + "-erro" : undefined}
                placeholder="Ex.: Quantidade lançada incorretamente"
                {...form.register("motivo", {
                  validate: (value) =>
                    (value.trim().length >= 3 && value.trim().length <= 500) ||
                    "Informe uma justificativa entre 3 e 500 caracteres.",
                })}
              />
              <FieldError id={id + "-erro"} errors={[errors.motivo]} />
            </Field>
            <FieldError errors={[errors.root]} />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={() => setOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Undo2 className="size-4" />
                )}
                {isSubmitting ? "Estornando…" : "Confirmar estorno"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
