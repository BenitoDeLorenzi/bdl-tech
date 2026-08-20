"use client";

import { startTransition, useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import {
  AlertCircle,
  ExternalLink,
  FileText,
  Loader2,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { type FrotaAnexo } from "@/lib/frotas-data";
import {
  addManutencaoAnexos,
  addVeiculoAnexos,
  deleteManutencaoAnexo,
  deleteVeiculoAnexo,
  type FrotaActionState,
} from "./actions";

type AnexosManagerFormProps = {
  anexos: FrotaAnexo[];
  ownerId: string;
  ownerLabel: string;
  type: "manutencao" | "veiculo";
};

type AnexosFormValues = {
  anexos: FileList | null;
};

const uploadActions = {
  manutencao: addManutencaoAnexos,
  veiculo: addVeiculoAnexos,
};

const deleteActions = {
  manutencao: deleteManutencaoAnexo,
  veiculo: deleteVeiculoAnexo,
};

export function AnexosManagerForm({
  anexos,
  ownerId,
  ownerLabel,
  type,
}: AnexosManagerFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, actionPending] = useActionState(
    uploadActions[type],
    {}
  );
  const form = useForm<AnexosFormValues>({
    defaultValues: {
      anexos: null,
    },
  });

  useEffect(() => {
    if (state.success) {
      toast.success(state.success, {
        id: `anexos-upload-${type}-${ownerId}`,
      });
      router.refresh();
      form.reset({ anexos: null });
      formRef.current?.reset();
    }
  }, [form, ownerId, router, state.success, type]);

  function submitForm(values: AnexosFormValues) {
    const formData = new FormData();
    formData.set("id", ownerId);

    Array.from(values.anexos ?? []).forEach((file) => {
      formData.append("anexos", file);
    });

    startTransition(() => {
      formAction(formData);
    });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border">
        {anexos.length ? (
          <div className="divide-y">
            {anexos.map((anexo) => (
              <div
                key={anexo.id}
                className="flex items-center gap-3 px-3 py-2.5"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-muted/40">
                  <FileText className="size-4 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">
                    {anexo.file_name}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatFileSize(anexo.file_size)}</span>
                    {anexo.created_at ? (
                      <>
                        <span>·</span>
                        <span>{formatDate(anexo.created_at)}</span>
                      </>
                    ) : null}
                  </div>
                </div>
                {anexo.signed_url ? (
                  <a
                    href={anexo.signed_url}
                    target="_blank"
                    rel="noreferrer"
                    className={buttonVariants({
                      variant: "ghost",
                      size: "icon-sm",
                    })}
                    aria-label={`Abrir ${anexo.file_name}`}
                  >
                    <ExternalLink className="size-4" />
                  </a>
                ) : null}
                <DeleteAnexoButton anexoId={anexo.id} type={type} />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex min-h-28 flex-col items-center justify-center p-6 text-center">
            <div className="flex size-10 items-center justify-center rounded-lg border bg-muted/40">
              <FileText className="size-5 text-muted-foreground" />
            </div>
            <div className="mt-3 text-sm font-medium">
              Nenhum documento anexado
            </div>
            <p className="mt-1 max-w-sm text-xs text-muted-foreground">
              Envie notas fiscais, comprovantes, laudos ou outros documentos de
              {ownerLabel}.
            </p>
          </div>
        )}
      </div>

      <form
        ref={formRef}
        onSubmit={form.handleSubmit(submitForm)}
        className="space-y-3 rounded-lg border bg-muted/20 p-3"
        noValidate
      >
        {state.error ? (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{state.error}</span>
          </div>
        ) : null}

        <fieldset
          disabled={actionPending}
          className="grid gap-3 disabled:opacity-70 sm:grid-cols-[1fr_auto]"
        >
          <Controller
            control={form.control}
            name="anexos"
            rules={{
              validate: (files) =>
                files?.length ? true : "Selecione ao menos um documento.",
            }}
            render={({ field: { onChange, ref }, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={`anexos-${type}-${ownerId}`}>
                  Novo documento
                </FieldLabel>
                <Input
                  id={`anexos-${type}-${ownerId}`}
                  ref={ref}
                  type="file"
                  multiple
                  accept="application/pdf,image/png,image/jpeg,image/webp"
                  aria-invalid={fieldState.invalid}
                  onChange={(event) => onChange(event.target.files)}
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />

          <div className="flex items-end">
            <Button type="submit" className="w-full gap-2" disabled={actionPending}>
              {actionPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Upload className="size-4" />
              )}
              {actionPending ? "Enviando..." : "Enviar"}
            </Button>
          </div>
        </fieldset>
      </form>
    </div>
  );
}

function DeleteAnexoButton({
  anexoId,
  type,
}: {
  anexoId: string;
  type: "manutencao" | "veiculo";
}) {
  const router = useRouter();
  const [state, formAction, actionPending] = useActionState<
    FrotaActionState,
    FormData
  >(deleteActions[type], {});

  useEffect(() => {
    if (state.success) {
      toast.success(state.success, {
        id: `anexos-delete-${type}-${anexoId}`,
      });
      router.refresh();
    }
  }, [anexoId, router, state.success, type]);

  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={anexoId} />
      <Button
        type="submit"
        variant="ghost"
        size="icon-sm"
        disabled={actionPending}
        aria-label="Remover documento"
      >
        {actionPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Trash2 className="size-4" />
        )}
      </Button>
      {state.error ? (
        <Badge variant="destructive" className="mt-2">
          {state.error}
        </Badge>
      ) : null}
    </form>
  );
}

function formatFileSize(value: number | null) {
  if (!value) {
    return "-";
  }

  if (value < 1024 * 1024) {
    return `${Math.ceil(value / 1024)} KB`;
  }

  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR").format(new Date(value));
}
