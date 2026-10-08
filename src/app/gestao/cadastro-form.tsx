"use client";
import { useActionState, useEffect, useRef, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { formularioGestao } from "./actions";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function CadastroForm({
  acao,
  unidadeId,
  children,
  label = "Salvar",
}: {
  acao: string;
  unidadeId?: string;
  children: ReactNode;
  label?: string;
}) {
  const [state, action] = useActionState(formularioGestao.bind(null, acao), {});
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.success) {
      toast.success(state.success);
      formRef.current
        ?.closest('[data-slot="dialog-content"]')
        ?.querySelector<HTMLElement>('[data-slot="dialog-close"]')
        ?.click();
    }
  }, [state]);
  return (
    <form ref={formRef} action={action} className="space-y-4">
      {unidadeId && <input type="hidden" name="unidade_id" value={unidadeId} />}
      {children}
      {state.error && (
        <p
          role="alert"
          className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
        >
          {state.error}
        </p>
      )}
      {state.success && (
        <p
          role="status"
          className="text-sm text-emerald-700 dark:text-emerald-400"
        >
          {state.success}
        </p>
      )}
      <DialogFooter>
        <Submit label={label} />
      </DialogFooter>
    </form>
  );
}
function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="gap-2" disabled={pending}>
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <CheckCircle2 className="size-4" />
      )}
      {pending ? "Salvando…" : label}
    </Button>
  );
}
