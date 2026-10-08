"use client";
import { useEffect, useId, useRef, useState } from "react";
import { Camera, ImagePlus, Loader2, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Controller, useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import {
  salvarDadosPerfil,
  salvarFotoPerfil,
  alterarSenhaPerfil,
} from "./actions";

export function DadosPerfilForm({
  nome,
  telefone,
  email_contato,
}: {
  nome: string;
  telefone: string;
  email_contato: string;
}) {
  const id = useId();
  const router = useRouter();
  const form = useForm({ defaultValues: { nome, telefone, email_contato } });
  const { errors, isSubmitting } = form.formState;
  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={form.handleSubmit(async (values) => {
        form.clearErrors("root");
        try {
          const r = await salvarDadosPerfil(values);
          if (r.error) {
            form.setError("root", { message: r.error });
            return;
          }
          toast.success(r.success);
          router.refresh();
        } catch {
          form.setError("root", {
            message: "Não foi possível salvar. Tente novamente.",
          });
        }
      })}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field className="sm:col-span-2" data-invalid={Boolean(errors.nome)}>
          <FieldLabel htmlFor={id + "nome"}>Nome completo</FieldLabel>
          <Input
            id={id + "nome"}
            disabled={isSubmitting}
            aria-invalid={Boolean(errors.nome)}
            autoComplete="name"
            {...form.register("nome", {
              validate: (v) =>
                (v.trim().length >= 2 && v.trim().length <= 120) ||
                "Informe de 2 a 120 caracteres.",
            })}
          />
          <FieldError errors={[errors.nome]} />
        </Field>
        <Field data-invalid={Boolean(errors.email_contato)}>
          <FieldLabel htmlFor={id + "email"}>
            E-mail de contato (opcional)
          </FieldLabel>
          <Input
            id={id + "email"}
            type="email"
            autoComplete="email"
            placeholder="voce@exemplo.com"
            disabled={isSubmitting}
            aria-invalid={Boolean(errors.email_contato)}
            {...form.register("email_contato", {
              validate: (value) =>
                !value.trim() ||
                (value.trim().length <= 254 &&
                  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) ||
                "Informe um e-mail válido.",
            })}
          />
          <FieldError errors={[errors.email_contato]} />
        </Field>
        <Field data-invalid={Boolean(errors.telefone)}>
          <FieldLabel htmlFor={id + "telefone"}>Telefone (opcional)</FieldLabel>
          <Input
            id={id + "telefone"}
            type="tel"
            autoComplete="tel"
            disabled={isSubmitting}
            aria-invalid={Boolean(errors.telefone)}
            {...form.register("telefone", {
              maxLength: { value: 30, message: "Use até 30 caracteres." },
            })}
          />
          <FieldError errors={[errors.telefone]} />
        </Field>
      </div>
      <FieldError errors={[errors.root]} />
      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Salvando…" : "Salvar dados"}
        </Button>
      </div>
    </form>
  );
}

export function FotoPerfilForm({
  nome,
  avatarUrl,
}: {
  nome: string;
  avatarUrl: string | null;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<string | null | undefined>(undefined);
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  const source = preview === undefined ? avatarUrl : preview;
  async function save(file: File | null) {
    if (pending) return;
    setError("");
    if (
      file &&
      (!file.size ||
        file.size > 3 * 1024 * 1024 ||
        !["image/jpeg", "image/png", "image/webp"].includes(file.type))
    ) {
      setError("Escolha JPG, PNG ou WebP de até 3 MB.");
      return;
    }
    setPending(true);
    try {
      const data = new FormData();
      if (file) data.set("foto", file);
      else data.set("remover", "true");
      const result = await salvarFotoPerfil(data);
      if (result.error) {
        setError(result.error);
        return;
      }
      setPreview(file ? URL.createObjectURL(file) : null);
      toast.success(result.success);
      router.refresh();
    } catch {
      setError("Não foi possível atualizar a foto. Tente novamente.");
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="flex flex-col items-center gap-2 py-3">
      <input
        ref={input}
        type="file"
        className="hidden"
        tabIndex={-1}
        aria-label="Selecionar foto de perfil"
        accept="image/jpeg,image/png,image/webp"
        disabled={pending}
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = "";
          if (file) void save(file);
        }}
      />
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              disabled={pending}
              aria-label="Alterar foto de perfil"
              aria-busy={pending}
              className="group relative rounded-full outline-none ring-offset-background transition-shadow hover:ring-4 hover:ring-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 disabled:cursor-wait"
            />
          }
        >
          <Avatar className="size-24 ring-4 ring-background shadow-sm">
            {source && (
              <AvatarImage src={source} alt={nome} className="object-cover" />
            )}
            <AvatarFallback className="bg-muted text-2xl font-medium">
              {nome
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 2)
                .map((p) => p[0])
                .join("")
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="absolute bottom-0 right-0 flex size-8 items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground shadow-sm">
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Camera className="size-4" />
            )}
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="w-48">
          <DropdownMenuItem onClick={() => input.current?.click()}>
            <ImagePlus />
            {source ? "Trocar foto" : "Enviar foto"}
          </DropdownMenuItem>
          {source && (
            <DropdownMenuItem
              variant="destructive"
              onClick={() => void save(null)}
            >
              <Trash2 />
              Remover foto
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <p className="mt-1 text-xs text-muted-foreground" aria-live="polite">
        {pending
          ? "Atualizando foto…"
          : "Clique no avatar para alterar sua foto"}
      </p>
      <p className="text-[11px] text-muted-foreground">
        JPG, PNG ou WebP · até 3 MB
      </p>
      <FieldError>{error}</FieldError>
    </div>
  );
}
export function SenhaPerfilForm() {
  const id = useId();
  const form = useForm({
    defaultValues: { atual: "", nova: "", confirmacao: "", encerrar: false },
  });
  const { errors, isSubmitting } = form.formState;
  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={form.handleSubmit(async (values) => {
        form.clearErrors("root");
        try {
          const r = await alterarSenhaPerfil(values);
          if (r.error) {
            form.setError("root", { message: r.error });
            return;
          }
          toast.success(r.success);
          form.reset();
        } catch {
          form.setError("root", {
            message: "Não foi possível alterar a senha. Tente novamente.",
          });
        }
      })}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {(
          [
            { name: "atual", label: "Senha atual" },
            { name: "nova", label: "Nova senha" },
            { name: "confirmacao", label: "Confirmar nova senha" },
          ] as const
        ).map(({ name, label }) => (
          <Field
            key={name}
            className={name === "atual" ? "sm:col-span-2" : undefined}
            data-invalid={Boolean(errors[name])}
          >
            <FieldLabel htmlFor={id + name}>{label}</FieldLabel>
            <Input
              id={id + name}
              type="password"
              autoComplete={
                name === "atual" ? "current-password" : "new-password"
              }
              disabled={isSubmitting}
              aria-invalid={Boolean(errors[name])}
              {...form.register(name, {
                required: "Preencha este campo.",
                maxLength: { value: 128, message: "Use até 128 caracteres." },
                validate: (v) =>
                  name === "nova"
                    ? (v.length >= 8 && v !== form.getValues("atual")) ||
                      "Use pelo menos 8 caracteres e uma senha diferente da atual."
                    : name === "confirmacao"
                      ? v === form.getValues("nova") ||
                        "As senhas não coincidem."
                      : true,
              })}
            />
            <FieldError errors={[errors[name]]} />
          </Field>
        ))}
      </div>
      <FieldLabel className="flex items-center gap-2">
        <Controller
          control={form.control}
          name="encerrar"
          render={({ field }) => (
            <Checkbox
              checked={field.value}
              onCheckedChange={field.onChange}
              disabled={isSubmitting}
            />
          )}
        />
        Encerrar outras sessões
      </FieldLabel>
      <p className="text-xs text-muted-foreground">
        As outras sessões deixarão de renovar o acesso. Sessões já abertas podem
        continuar até o token atual expirar.
      </p>
      <FieldError errors={[errors.root]} />
      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Alterando…" : "Alterar senha"}
        </Button>
      </div>
    </form>
  );
}
