"use client";

import { FormDialogCancel } from "@/components/form-dialog-cancel";

import { startTransition, useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { Loader2, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { mask } from "remask";
import type { FrotaOficina } from "@/lib/oficinas-data";
import { FormSelect } from "@/components/form-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { saveOficina } from "./actions";

type Values = {
  nome: string;
  documento: string;
  telefone: string;
  responsavel: string;
  endereco: string;
  especialidades: string;
  observacoes: string;
  status: string;
};
const fieldRows = [
  [{ name: "nome", label: "Nome da oficina" }],
  [{ name: "documento", label: "CPF/CNPJ" }, { name: "telefone", label: "Telefone" }],
  [{ name: "responsavel", label: "Responsável" }, { name: "especialidades", label: "Especialidades" }],
  [{ name: "endereco", label: "Endereço" }],
  [{ name: "observacoes", label: "Observações" }],
] as const;

export function OficinaDialog({
  empresaId,
  oficina,
}: {
  empresaId: string;
  oficina?: FrotaOficina;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant={oficina ? "ghost" : "default"}
            size={oficina ? "icon-sm" : "default"}
            aria-label={
              oficina ? `Editar oficina ${oficina.nome}` : "Nova oficina"
            }
          />
        }
      >
        {oficina ? (
          <Pencil className="size-4" />
        ) : (
          <>
            <Plus className="size-4" />
            Nova oficina
          </>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {oficina ? "Editar oficina" : "Nova oficina"}
          </DialogTitle>
        </DialogHeader>
        {open ? (
          <OficinaForm
            empresaId={empresaId}
            oficina={oficina}
            close={() => setOpen(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function OficinaForm({
  empresaId,
  oficina,
  close,
}: {
  empresaId: string;
  oficina?: FrotaOficina;
  close: () => void;
}) {
  const [state, action, pending] = useActionState(saveOficina, {});
  const router = useRouter();
  const form = useForm<Values>({
    defaultValues: {
      nome: oficina?.nome ?? "",
      documento: formatDocumento(oficina?.documento ?? ""),
      telefone: formatTelefone(oficina?.telefone ?? ""),
      responsavel: oficina?.responsavel ?? "",
      endereco: oficina?.endereco ?? "",
      especialidades: oficina?.especialidades ?? "",
      observacoes: oficina?.observacoes ?? "",
      status: oficina?.status ?? "active",
    },
  });
  useEffect(() => {
    if (state.success) {
      toast.success(state.success);
      close();
      router.refresh();
    }
  }, [state.success, close, router]);
  function submit(values: Values) {
    const data = new FormData();
    Object.entries(values).forEach(([key, value]) => data.set(key, value));
    data.set("prefeitura_id", empresaId);
    if (oficina) data.set("id", oficina.id);
    startTransition(() => action(data));
  }
  return (
    <form onSubmit={form.handleSubmit(submit)} noValidate className="space-y-4">
      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      <fieldset
        disabled={pending}
        className="space-y-4 disabled:opacity-70"
      >
        {fieldRows.map((row) => (
          <div key={row[0].name} className={row[0].name === "nome" ? "grid gap-4 sm:grid-cols-[minmax(0,1fr)_10rem]" : row.length === 2 ? "grid gap-4 sm:grid-cols-2" : "grid gap-4"}>
          {row.map(({ name, label }) => (
          <Controller
            key={name}
            control={form.control}
            name={name}
            rules={
              name === "nome"
                ? { required: "Informe o nome da oficina." }
                : name === "documento"
                  ? {
                      validate: (value) =>
                        !value ||
                        [11, 14].includes(value.replace(/\D/g, "").length) ||
                        "Informe um CPF ou CNPJ completo.",
                    }
                  : {}
            }
            render={({ field, fieldState }) => (
              <Field
                data-invalid={fieldState.invalid}
                className="min-w-0 w-full"
              >
                <FieldLabel htmlFor={`oficina-${name}`}>{label}</FieldLabel>
                <Input
                  {...field}
                  onChange={(event) => field.onChange(
                    name === "documento" ? formatDocumento(event.target.value)
                      : name === "telefone" ? formatTelefone(event.target.value)
                        : event.target.value
                  )}
                  id={`oficina-${name}`}
                  aria-invalid={fieldState.invalid}
                  inputMode={name === "documento" ? "numeric" : name === "telefone" ? "tel" : undefined}
                  placeholder={name === "documento" ? "CPF ou CNPJ" : name === "telefone" ? "(00) 00000-0000" : undefined}
                  maxLength={name === "documento" ? 18 : name === "telefone" ? 15 : 500}
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
          ))}
          {row[0].name === "nome" ? (
        <Controller
          control={form.control}
          name="status"
          render={({ field }) => (
            <Field className="w-full">
              <FieldLabel htmlFor="oficina-status">Status</FieldLabel>
              <FormSelect
                id="oficina-status"
                value={field.value}
                onValueChange={field.onChange}
                options={[
                  { value: "active", label: "Ativa" },
                  { value: "inactive", label: "Inativa" },
                ]}
              />
            </Field>
          )}
        />
          ) : null}
          </div>
        ))}

      </fieldset>
      <DialogFooter>
        <FormDialogCancel disabled={pending} />
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}Salvar
          oficina
        </Button>
      </DialogFooter>
    </form>
  );
}

function formatDocumento(value: string) {
  return mask(value.replace(/\D/g, "").slice(0, 14), ["999.999.999-99", "99.999.999/9999-99"]);
}

function formatTelefone(value: string) {
  return mask(value.replace(/\D/g, "").slice(0, 11), ["(99) 9999-9999", "(99) 99999-9999"]);
}
