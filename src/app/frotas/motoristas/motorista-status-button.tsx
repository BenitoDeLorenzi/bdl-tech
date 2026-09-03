"use client";

import { startTransition, useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CircleCheck, Loader2, Power } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { MotoristaStatus } from "@/lib/motoristas-data";
import { updateMotoristaStatus } from "./actions";

type MotoristaStatusButtonProps = {
  motoristaId: string;
  status: MotoristaStatus;
};

export function MotoristaStatusButton({
  motoristaId,
  status,
}: MotoristaStatusButtonProps) {
  const router = useRouter();
  const [state, formAction, actionPending] = useActionState(
    updateMotoristaStatus,
    {}
  );
  const nextStatus = status === "active" ? "inactive" : "active";
  const label =
    status === "active" ? "Inativar motorista" : "Ativar motorista";

  useEffect(() => {
    if (state.success) {
      toast.success(state.success, {
        id: `motorista-status-${motoristaId}`,
      });
      router.refresh();
    }

    if (state.error) {
      toast.error(state.error, {
        id: `motorista-status-error-${motoristaId}`,
      });
    }
  }, [motoristaId, router, state.error, state.success]);

  function submitForm(formData: FormData) {
    formData.set("id", motoristaId);
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
                status === "active" ? "text-amber-700" : "text-emerald-700"
              }
            >
              {actionPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : status === "active" ? (
                <Power className="size-4" />
              ) : (
                <CircleCheck className="size-4" />
              )}
            </Button>
          }
        />
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    </form>
  );
}
