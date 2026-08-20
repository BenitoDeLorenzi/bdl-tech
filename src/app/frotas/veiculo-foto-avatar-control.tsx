"use client";

import { startTransition, useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Camera, Car, ImageOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { type FrotaVeiculo } from "@/lib/frotas-data";
import { removeVeiculoFoto, uploadVeiculoFoto } from "./actions";

type VeiculoFotoAvatarControlProps = {
  veiculo: FrotaVeiculo;
};

export function VeiculoFotoAvatarControl({
  veiculo,
}: VeiculoFotoAvatarControlProps) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [state, formAction, actionPending] = useActionState(
    uploadVeiculoFoto,
    {}
  );
  const [removeState, removeAction, removePending] = useActionState(
    removeVeiculoFoto,
    {}
  );
  const isPending = actionPending || removePending;

  useEffect(() => {
    if (state.success) {
      toast.success(state.success, {
        id: `veiculo-photo-success-${veiculo.id}`,
      });
      router.refresh();
    }
  }, [router, state.success, veiculo.id]);

  useEffect(() => {
    if (removeState.success) {
      toast.success(removeState.success, {
        id: `veiculo-photo-remove-success-${veiculo.id}`,
      });
      router.refresh();
    }
  }, [removeState.success, router, veiculo.id]);

  function uploadSelectedFile(file: File | undefined) {
    if (!file) {
      return;
    }

    const formData = new FormData();
    formData.set("id", veiculo.id);
    formData.set("prefeitura_id", veiculo.prefeitura_id);
    formData.set("placa", veiculo.placa);
    formData.set("foto", file);

    startTransition(() => {
      formAction(formData);
    });
  }

  function removeCurrentPhoto() {
    const formData = new FormData();
    formData.set("id", veiculo.id);
    formData.set("foto_path", veiculo.foto_path ?? "");

    startTransition(() => {
      removeAction(formData);
    });
  }

  return (
    <div className="space-y-2">
      <div className="relative size-24">
        <Avatar className="size-24 rounded-xl border">
          {veiculo.foto_url ? (
            <AvatarImage
              src={veiculo.foto_url}
              alt={`Foto do veículo ${veiculo.placa}`}
              className="rounded-xl object-cover"
            />
          ) : null}
          <AvatarFallback className="rounded-xl bg-background">
            <Car className="size-9 text-muted-foreground" />
          </AvatarFallback>
        </Avatar>

        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          onChange={(event) => uploadSelectedFile(event.target.files?.[0])}
        />

        <Button
          type="button"
          size="icon-sm"
          variant={veiculo.foto_url ? "destructive" : "default"}
          className="absolute -bottom-2 -right-2 shadow-sm"
          disabled={isPending}
          aria-label={veiculo.foto_url ? "Remover foto" : "Adicionar foto"}
          onClick={() => {
            if (veiculo.foto_url) {
              removeCurrentPhoto();
              return;
            }

            fileRef.current?.click();
          }}
        >
          {isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : veiculo.foto_url ? (
            <ImageOff className="size-4" />
          ) : (
            <Camera className="size-4" />
          )}
        </Button>
      </div>

      {state.error || removeState.error ? (
        <p className="max-w-28 text-xs text-destructive">
          {state.error ?? removeState.error}
        </p>
      ) : null}
    </div>
  );
}
