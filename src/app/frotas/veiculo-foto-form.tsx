"use client";

import { FormDialogCancel } from "@/components/form-dialog-cancel";

import { startTransition, useActionState, useEffect, useRef } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, ImageOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { type FrotaVeiculo } from "@/lib/frotas-data";
import { removeVeiculoFoto, uploadVeiculoFoto } from "./actions";

type VeiculoFotoFormProps = {
  veiculo: FrotaVeiculo;
};

export function VeiculoFotoForm({ veiculo }: VeiculoFotoFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [state, formAction, actionPending] = useActionState(
    uploadVeiculoFoto,
    {}
  );
  const [removeState, removeAction, removePending] = useActionState(
    removeVeiculoFoto,
    {}
  );

  useEffect(() => {
    if (state.success) {
      toast.success(state.success, {
        id: "veiculo-photo-success",
      });
      router.refresh();
      closeParentDialog(formRef.current);
    }
  }, [router, state.success]);

  useEffect(() => {
    if (removeState.success) {
      toast.success(removeState.success, {
        id: "veiculo-photo-remove-success",
      });
      router.refresh();
      closeParentDialog(formRef.current);
    }
  }, [removeState.success, router]);

  function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const file = fileRef.current?.files?.[0];

    if (!file) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    startTransition(() => {
      formAction(formData);
    });
  }

  return (
    <form
      ref={formRef}
      onSubmit={submitForm}
      className="space-y-4"
      noValidate
    >
      <input type="hidden" name="id" value={veiculo.id} />
      <input type="hidden" name="prefeitura_id" value={veiculo.prefeitura_id} />
      <input type="hidden" name="placa" value={veiculo.placa} />

      {state.error || removeState.error ? (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{state.error ?? removeState.error}</span>
        </div>
      ) : null}

      <fieldset
        disabled={actionPending || removePending}
        className="space-y-4 disabled:opacity-70"
      >
        {veiculo.foto_url ? (
          <div className="overflow-hidden rounded-lg border bg-muted/20">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={veiculo.foto_url}
              alt={`Foto atual do veículo ${veiculo.placa}`}
              className="h-44 w-full object-cover"
            />
          </div>
        ) : null}
        <Field>
          <FieldLabel htmlFor={`foto-${veiculo.id}`}>Foto do veículo</FieldLabel>
          <Input
            ref={fileRef}
            id={`foto-${veiculo.id}`}
            name="foto"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            required
          />
        </Field>
        <p className="text-sm text-muted-foreground">
          Use PNG, JPG ou WebP com até 5 MB.
        </p>
      </fieldset>

      <DialogFooter>
        <FormDialogCancel disabled={actionPending || removePending} />
        {veiculo.foto_url ? (
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            disabled={actionPending || removePending}
            onClick={() => {
              const formData = new FormData();
              formData.set("id", veiculo.id);
              formData.set("foto_path", veiculo.foto_path ?? "");

              startTransition(() => {
                removeAction(formData);
              });
            }}
          >
            {removePending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ImageOff className="size-4" />
            )}
            {removePending ? "Removendo..." : "Remover foto"}
          </Button>
        ) : null}
        <Button
          type="submit"
          className="gap-2"
          disabled={actionPending || removePending}
        >
          {actionPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <CheckCircle2 className="size-4" />
          )}
          {actionPending ? "Enviando..." : "Salvar foto"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function closeParentDialog(formElement: HTMLFormElement | null) {
  const closeButton = formElement
    ?.closest('[data-slot="dialog-content"]')
    ?.querySelector<HTMLElement>('[data-slot="dialog-close"]');

  closeButton?.click();
}
