"use client";

import { startTransition, useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Power, PowerOff } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";


type Props = {
  id: string;
  entity: string;
  action: (state: { error?: string; success?: string }, data: FormData) => Promise<{ error?: string; success?: string }>;
  status: "active" | "inactive";
};

export function CadastroStatusButton({ id, entity, status, action }: Props) {
  const router = useRouter();
  const [state, formAction, actionPending] = useActionState(
    action,
    {}
  );
  const nextStatus = status === "active" ? "inactive" : "active";
  const label = `${status === "active" ? "Inativar" : "Ativar"} ${entity}`;

  useEffect(() => {
    if (state.success) {
      toast.success(state.success, {
        id: `posto-status-${id}`,
      });
      router.refresh();
    }

    if (state.error) {
      toast.error(state.error, {
        id: `posto-status-error-${id}`,
      });
    }
  }, [id, router, state.error, state.success]);

  function submitForm(formData: FormData) {
    formData.set("id", id);
    formData.set("status", nextStatus);

    startTransition(() => {
      formAction(formData);
    });
  }

  return (
    <form action={submitForm}>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              type="submit"
              variant="ghost"
              size="icon-sm"
              aria-label={label}
              disabled={actionPending}
              className={
                status === "active"
                  ? "bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 dark:text-amber-400"
                  : "bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-400"
              }
            >
              {actionPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : status === "active" ? (
                <PowerOff className="size-4" />
              ) : (
                <Power className="size-4" />
              )}
            </Button>
          }
        />
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    </form>
  );
}
