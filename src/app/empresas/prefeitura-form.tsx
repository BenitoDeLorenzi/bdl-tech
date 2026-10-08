"use client";

import { startTransition, useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { mask } from "remask";
import { AlertCircle, ImageUp, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createPrefeitura, updatePrefeitura } from "./actions";

const estados = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
];

const ufItems = [
  { label: "Selecione a UF", value: null },
  ...estados.map((estado) => ({
    label: estado,
    value: estado,
  })),
];

type PrefeituraFormValues = {
  nome_fantasia: string;
  cep: string;
  cidade: string;
  cnpj: string;
  endereco: string;
  nome: string;
  uf: string | null;
};

type PrefeituraFormProps = {
  prefeitura?: {
    nome_fantasia?: string | null;
    id: string;
    nome: string;
    cnpj: string;
    cidade: string | null;
    uf: string | null;
    cep: string | null;
    brasao_path: string | null;
    brasao_url: string | null;
    endereco: string | null;
  };
};

export function PrefeituraForm({ prefeitura }: PrefeituraFormProps) {
  const isEditing = Boolean(prefeitura);
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, actionPending] = useActionState(
    isEditing ? updatePrefeitura : createPrefeitura,
    {},
  );
  const form = useForm<PrefeituraFormValues>({
    defaultValues: {
      nome_fantasia: prefeitura?.nome_fantasia ?? "",
      cep: prefeitura?.cep ?? "",
      cidade: prefeitura?.cidade ?? "",
      cnpj: prefeitura?.cnpj ?? "",
      endereco: prefeitura?.endereco ?? "",
      nome: prefeitura?.nome ?? "",
      uf: prefeitura?.uf ?? null,
    },
  });

  useEffect(() => {
    if (state.success) {
      toast.success(state.success, {
        id: isEditing ? "prefeitura-edit-success" : "prefeitura-create-success",
      });
      router.refresh();

      if (!isEditing) {
        form.reset({
          nome_fantasia: "",
          cep: "",
          cidade: "",
          cnpj: "",
          endereco: "",
          nome: "",
          uf: null,
        });
        formRef.current?.reset();
      }

      closeParentDialog(formRef.current);
    }
  }, [form, isEditing, router, state.success]);

  function submitForm(values: PrefeituraFormValues, formData: FormData) {
    if (prefeitura) {
      formData.set("id", prefeitura.id);
    }

    formData.set("nome", values.nome);
    formData.set("nome_fantasia", values.nome_fantasia);
    formData.set("cnpj", values.cnpj);
    formData.set("cidade", values.cidade);
    formData.set("uf", values.uf ?? "");
    formData.set("cep", values.cep);
    formData.set("endereco", values.endereco);
    formData.set("current_brasao_path", prefeitura?.brasao_path ?? "");

    startTransition(() => {
      formAction(formData);
    });
  }

  return (
    <form
      ref={formRef}
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        void form.handleSubmit((values) => submitForm(values, formData))(event);
      }}
      className="space-y-4"
      noValidate
    >
      {prefeitura ? (
        <input type="hidden" name="id" value={prefeitura.id} />
      ) : null}
      {state.error ? (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{state.error}</span>
        </div>
      ) : null}

      <fieldset disabled={actionPending} className="disabled:opacity-70">
        <FieldGroup className="gap-4">
          <Field data-invalid={Boolean(form.formState.errors.nome)}>
            <FieldLabel htmlFor="nome">Razão social / nome oficial</FieldLabel>
            <Input
              id="nome"
              placeholder="Empresa de Santa Helena"
              aria-invalid={Boolean(form.formState.errors.nome)}
              {...form.register("nome", {
                required: "Informe o nome da empresa.",
              })}
            />
            <FieldError errors={[form.formState.errors.nome]} />
          </Field>

          <Field data-invalid={Boolean(form.formState.errors.nome_fantasia)}>
            <FieldLabel htmlFor="nome_fantasia">
              Nome fantasia (opcional)
            </FieldLabel>
            <Input
              id="nome_fantasia"
              placeholder="Nome curto exibido no sidebar"
              aria-invalid={Boolean(form.formState.errors.nome_fantasia)}
              {...form.register("nome_fantasia", {
                validate: (value) =>
                  !value.trim() ||
                  (value.trim().length >= 2 && value.trim().length <= 80) ||
                  "Use de 2 a 80 caracteres.",
              })}
            />
            <FieldError errors={[form.formState.errors.nome_fantasia]} />
          </Field>
          <Field>
            <FieldLabel htmlFor="brasao">Logotipo da empresa</FieldLabel>
            <div className="flex items-center gap-3 rounded-lg border bg-muted/20 p-3">
              <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-background">
                {prefeitura?.brasao_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={prefeitura.brasao_url}
                    alt={`Logotipo de ${prefeitura.nome}`}
                    className="size-full object-contain p-1"
                  />
                ) : (
                  <ImageUp className="size-5 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <input
                  type="hidden"
                  name="current_brasao_path"
                  value={prefeitura?.brasao_path ?? ""}
                />
                <Input
                  id="brasao"
                  name="brasao"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  disabled={actionPending}
                />
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {prefeitura?.brasao_url
                    ? "Logotipo cadastrado. Envie uma nova imagem para substituir."
                    : "PNG, JPG ou WebP até 3 MB."}
                </p>
              </div>
            </div>
          </Field>

          <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
            <Field data-invalid={Boolean(form.formState.errors.cnpj)}>
              <FieldLabel htmlFor="cnpj">CNPJ</FieldLabel>
              <Input
                id="cnpj"
                inputMode="numeric"
                maxLength={18}
                placeholder="00.000.000/0001-00"
                aria-invalid={Boolean(form.formState.errors.cnpj)}
                {...form.register("cnpj", {
                  required: "Informe o CNPJ.",
                  onChange: (event) => {
                    event.currentTarget.value = mask(
                      event.currentTarget.value,
                      "99.999.999/9999-99",
                    );
                  },
                  validate: (value) =>
                    value.replace(/\D/g, "").length === 14 ||
                    "Informe um CNPJ válido.",
                })}
              />
              <FieldError errors={[form.formState.errors.cnpj]} />
            </Field>

            <Controller
              control={form.control}
              name="uf"
              rules={{ required: "Selecione a UF." }}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="uf">UF</FieldLabel>
                  <Select
                    items={ufItems}
                    name={field.name}
                    value={field.value}
                    onValueChange={field.onChange}
                    required
                    disabled={actionPending}
                  >
                    <SelectTrigger
                      id="uf"
                      className="w-full"
                      aria-invalid={fieldState.invalid}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Estados</SelectLabel>
                        {ufItems.map((item) => (
                          <SelectItem
                            key={item.value ?? "empty"}
                            value={item.value}
                          >
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
          </div>

          <Field data-invalid={Boolean(form.formState.errors.cidade)}>
            <FieldLabel htmlFor="cidade">Cidade</FieldLabel>
            <Input
              id="cidade"
              placeholder="Cidade"
              aria-invalid={Boolean(form.formState.errors.cidade)}
              {...form.register("cidade", {
                required: "Informe a cidade.",
              })}
            />
            <FieldError errors={[form.formState.errors.cidade]} />
          </Field>

          <div className="grid gap-3 sm:grid-cols-[150px_1fr]">
            <Field data-invalid={Boolean(form.formState.errors.cep)}>
              <FieldLabel htmlFor="cep">CEP</FieldLabel>
              <Input
                id="cep"
                inputMode="numeric"
                maxLength={9}
                placeholder="00000-000"
                aria-invalid={Boolean(form.formState.errors.cep)}
                {...form.register("cep", {
                  required: "Informe o CEP.",
                  onChange: (event) => {
                    event.currentTarget.value = mask(
                      event.currentTarget.value,
                      "99999-999",
                    );
                  },
                  validate: (value) =>
                    value.replace(/\D/g, "").length === 8 ||
                    "Informe um CEP válido.",
                })}
              />
              <FieldError errors={[form.formState.errors.cep]} />
            </Field>

            <Field data-invalid={Boolean(form.formState.errors.endereco)}>
              <FieldLabel htmlFor="endereco">Endereço</FieldLabel>
              <Input
                id="endereco"
                placeholder="Rua, número, bairro"
                aria-invalid={Boolean(form.formState.errors.endereco)}
                {...form.register("endereco", {
                  required: "Informe o endereço.",
                })}
              />
              <FieldError errors={[form.formState.errors.endereco]} />
            </Field>
          </div>
        </FieldGroup>
      </fieldset>

      <DialogFooter>
        <Button type="submit" className="gap-2" disabled={actionPending}>
          {actionPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Plus className="size-4" />
          )}
          {actionPending
            ? "Salvando..."
            : isEditing
              ? "Salvar alterações"
              : "Cadastrar empresa"}
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
