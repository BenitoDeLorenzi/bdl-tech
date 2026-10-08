"use client";
import { useId, useState, useRef } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormSelect } from "@/components/form-select";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { RotateCcw, Ban } from "lucide-react";
import { CurrencyInput } from "../currency-input";
import { inputClass } from "../ui";
import { dinheiro, dataBR } from "@/lib/gestao-types";
import {
  type Colaborador,
  type Trabalho,
  horarioTrabalho,
  hojeEquipe,
  valorEquipeValido,
  totalTrabalhos,
  trabalhoPendente,
} from "@/lib/gestao-equipe";
import { operarEquipe } from "./actions";
import { ColaboradorCombobox } from "./colaborador-combobox";

function useEquipeSave() {
  const router = useRouter();
  const ref = useRef<HTMLFormElement>(null);
  const requestId = useRef<string | null>(null);
  async function save(acao: string, dados: Record<string, unknown>) {
    requestId.current ??= crypto.randomUUID();
    const result = await operarEquipe(acao, {
      id: requestId.current,
      ...dados,
    });
    if (result.error) return result.error;
    toast.success(
      acao === "pagar" ? "Pagamento registrado." : "Registro salvo.",
    );
    router.refresh();
    ref.current
      ?.closest('[data-slot="dialog-content"]')
      ?.querySelector<HTMLElement>('[data-slot="dialog-close"]')
      ?.click();
    requestId.current = null;
  }
  return { ref, save };
}
export function ColaboradorForm({
  unidadeId,
  colaborador,
}: {
  unidadeId: string;
  colaborador?: Colaborador;
}) {
  const id = useId();
  const { ref, save } = useEquipeSave();
  const form = useForm({
    defaultValues: {
      nome: colaborador?.nome ?? "",
      funcao: colaborador?.funcao ?? "",
      telefone: colaborador?.telefone ?? "",
      valor: colaborador ? String(colaborador.valor) : "",
      ativo: String(colaborador?.ativo ?? true),
      observacoes: colaborador?.observacoes ?? "",
    },
  });
  const { errors, isSubmitting } = form.formState;
  return (
    <form
      ref={ref}
      noValidate
      className="space-y-4"
      onSubmit={form.handleSubmit(async (values) => {
        form.clearErrors("root");
        try {
          const error = await save("colaborador", {
            ...values,
            unidade_id: unidadeId,
            ...(colaborador
              ? { id: colaborador.id, versao: colaborador.versao }
              : { versao: 0 }),
          });
          if (error) form.setError("root", { message: error });
        } catch {
          form.setError("root", {
            message: "Não foi possível salvar. Tente novamente.",
          });
        }
      })}
    >
      <fieldset disabled={isSubmitting} className="grid gap-4 sm:grid-cols-2">
        <Field className="sm:col-span-2" data-invalid={Boolean(errors.nome)}>
          <FieldLabel htmlFor={id + "nome"}>Nome</FieldLabel>
          <Input
            id={id + "nome"}
            aria-invalid={Boolean(errors.nome)}
            {...form.register("nome", {
              validate: (v) =>
                (v.trim().length >= 2 && v.trim().length <= 120) ||
                "Informe o nome, entre 2 e 120 caracteres.",
            })}
          />
          <FieldError errors={[errors.nome]} />
        </Field>
        <Field data-invalid={Boolean(errors.funcao)}>
          <FieldLabel htmlFor={id + "funcao"}>Função</FieldLabel>
          <Input
            id={id + "funcao"}
            placeholder="Ex.: Atendente"
            aria-invalid={Boolean(errors.funcao)}
            {...form.register("funcao", {
              validate: (v) =>
                (v.trim().length >= 2 && v.trim().length <= 80) ||
                "Informe a função, entre 2 e 80 caracteres.",
            })}
          />
          <FieldError errors={[errors.funcao]} />
        </Field>
        <Field data-invalid={Boolean(errors.telefone)}>
          <FieldLabel htmlFor={id + "telefone"}>Telefone (opcional)</FieldLabel>
          <Input
            id={id + "telefone"}
            type="tel"
            aria-invalid={Boolean(errors.telefone)}
            {...form.register("telefone", {
              maxLength: { value: 30, message: "Use até 30 caracteres." },
            })}
          />
          <FieldError errors={[errors.telefone]} />
        </Field>
        <Field data-invalid={Boolean(errors.valor)}>
          <FieldLabel htmlFor={id + "valor"}>Valor</FieldLabel>
          <Controller
            control={form.control}
            name="valor"
            rules={{
              validate: (v) =>
                valorEquipeValido(v) || "Informe um valor maior que zero.",
            }}
            render={({ field }) => (
              <CurrencyInput
                id={id + "valor"}
                value={field.value}
                onValueChange={field.onChange}
                onBlur={field.onBlur}
                ref={field.ref}
                disabled={isSubmitting}
                aria-invalid={Boolean(errors.valor)}
              />
            )}
          />
          <FieldError errors={[errors.valor]} />
        </Field>

        <Field>
          <FieldLabel htmlFor={id + "ativo"}>Status</FieldLabel>
          <Controller
            control={form.control}
            name="ativo"
            render={({ field }) => (
              <FormSelect
                id={id + "ativo"}
                value={field.value}
                onValueChange={field.onChange}
                disabled={isSubmitting}
                options={[
                  { value: "true", label: "Ativo" },
                  { value: "false", label: "Inativo" },
                ]}
                groupLabel="Status"
              />
            )}
          />
        </Field>

        <Field
          data-invalid={Boolean(errors.observacoes)}
          className="sm:col-span-2"
        >
          <FieldLabel htmlFor={id + "obs"}>Observações (opcional)</FieldLabel>
          <textarea
            id={id + "obs"}
            rows={2}
            className={inputClass + " h-auto py-2"}
            {...form.register("observacoes", {
              maxLength: { value: 1000, message: "Use até 1.000 caracteres." },
            })}
          />
          <FieldError errors={[errors.observacoes]} />
        </Field>
      </fieldset>
      <p className="text-xs text-muted-foreground">
        O valor será sugerido na equipe do dia e poderá ser ajustado no
        fechamento.
      </p>
      <FieldError errors={[errors.root]} />
      <DialogFooter>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Salvando…" : "Salvar colaborador"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function TrabalhoForm({
  unidadeId,
  colaboradores,
}: {
  unidadeId: string;
  colaboradores: Colaborador[];
}) {
  const id = useId();
  const { ref, save } = useEquipeSave();
  const form = useForm({
    defaultValues: {
      colaborador_id: "",
      data: hojeEquipe(),
      inicio: "",
      fim: "",
      valor: "",
      observacoes: "",
    },
  });
  const { errors, isSubmitting } = form.formState;
  return (
    <form
      ref={ref}
      noValidate
      className="space-y-4"
      onSubmit={form.handleSubmit(async (values) => {
        form.clearErrors("root");
        try {
          const error = await save("trabalho", {
            ...values,
            unidade_id: unidadeId,
          });
          if (error) form.setError("root", { message: error });
        } catch {
          form.setError("root", {
            message: "Não foi possível registrar. Tente novamente.",
          });
        }
      })}
    >
      <fieldset disabled={isSubmitting} className="grid gap-4 sm:grid-cols-2">
        <Field
          className="sm:col-span-2"
          data-invalid={Boolean(errors.colaborador_id)}
        >
          <FieldLabel htmlFor={id + "colaborador"}>Colaborador</FieldLabel>
          <Controller
            control={form.control}
            name="colaborador_id"
            rules={{ required: "Selecione o colaborador." }}
            render={({ field }) => (
              <ColaboradorCombobox
                id={id + "colaborador"}
                value={field.value}
                inputRef={field.ref}
                onBlur={field.onBlur}
                invalid={Boolean(errors.colaborador_id)}
                disabled={isSubmitting}
                colaboradores={colaboradores.filter((c) => c.ativo)}
                onValueChange={(v) => {
                  field.onChange(v);
                  const c = colaboradores.find((c) => c.id === v);
                  if (c) {
                    form.setValue("valor", String(c.valor), {
                      shouldValidate: Boolean(errors.valor),
                    });
                  }
                }}
              />
            )}
          />
          <FieldError errors={[errors.colaborador_id]} />
        </Field>
        <Field data-invalid={Boolean(errors.data)}>
          <FieldLabel htmlFor={id + "data"}>Data trabalhada</FieldLabel>
          <Input
            id={id + "data"}
            type="date"
            aria-invalid={Boolean(errors.data)}
            {...form.register("data", {
              validate: (v) =>
                (/^\d{4}-\d{2}-\d{2}$/.test(v) && v <= hojeEquipe()) ||
                "Informe uma data até hoje.",
            })}
          />
          <FieldError errors={[errors.data]} />
        </Field>
        <Field data-invalid={Boolean(errors.valor)}>
          <FieldLabel htmlFor={id + "valor"}>Valor do trabalho</FieldLabel>
          <Controller
            control={form.control}
            name="valor"
            rules={{
              validate: (v) =>
                valorEquipeValido(v) || "Informe um valor maior que zero.",
            }}
            render={({ field }) => (
              <CurrencyInput
                id={id + "valor"}
                value={field.value}
                onValueChange={field.onChange}
                ref={field.ref}
                onBlur={field.onBlur}
                disabled={isSubmitting}
                aria-invalid={Boolean(errors.valor)}
              />
            )}
          />
          <FieldError errors={[errors.valor]} />
        </Field>
        <div className="grid grid-cols-2 gap-3 sm:col-span-2">
          <Field data-invalid={Boolean(errors.inicio)}>
            <FieldLabel htmlFor={id + "inicio"}>Início</FieldLabel>
            <Input
              id={id + "inicio"}
              type="time"
              aria-invalid={Boolean(errors.inicio)}
              {...form.register("inicio", {
                validate: (v) => /^\d{2}:\d{2}$/.test(v) || "Informe o início.",
              })}
            />
            <FieldError errors={[errors.inicio]} />
          </Field>
          <Field data-invalid={Boolean(errors.fim)}>
            <FieldLabel htmlFor={id + "fim"}>Fim</FieldLabel>
            <Input
              id={id + "fim"}
              type="time"
              aria-invalid={Boolean(errors.fim)}
              {...form.register("fim", {
                validate: (v) =>
                  (/^\d{2}:\d{2}$/.test(v) && v !== form.getValues("inicio")) ||
                  "Informe o fim, diferente do início.",
              })}
            />
            <FieldError errors={[errors.fim]} />
          </Field>
        </div>
        <Field
          className="sm:col-span-2"
          data-invalid={Boolean(errors.observacoes)}
        >
          <FieldLabel htmlFor={id + "obs"}>Observações (opcional)</FieldLabel>
          <textarea
            id={id + "obs"}
            rows={2}
            className={inputClass + " h-auto py-2"}
            {...form.register("observacoes", {
              maxLength: { value: 1000, message: "Use até 1.000 caracteres." },
            })}
          />
          <FieldError errors={[errors.observacoes]} />
        </Field>
      </fieldset>
      <p className="text-xs text-muted-foreground">
        Se o fim for anterior ao início, o trabalho termina no dia seguinte.
      </p>
      <FieldError errors={[errors.root]} />
      <DialogFooter>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Registrando…" : "Registrar trabalho"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function PagamentoForm({
  unidadeId,
  colaboradores,
  trabalhos,
}: {
  unidadeId: string;
  colaboradores: Colaborador[];
  trabalhos: Trabalho[];
}) {
  const id = useId();
  const { ref, save } = useEquipeSave();
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");
  const form = useForm({
    defaultValues: {
      colaborador_id: "",
      data: hojeEquipe(),
      forma: "Pix",
      observacoes: "",
    },
  });
  const cid = useWatch({ control: form.control, name: "colaborador_id" });
  const pendentes = trabalhos.filter(
    (t) => trabalhoPendente(t) && t.colaborador_id === cid,
  );
  const visiveis = pendentes.filter(
    (t) => (!inicio || t.data >= inicio) && (!fim || t.data <= fim),
  );
  const escolhidos = visiveis.filter((t) => selecionados.includes(t.id));
  const { errors, isSubmitting } = form.formState;
  return (
    <form
      ref={ref}
      noValidate
      className="space-y-4"
      onSubmit={form.handleSubmit(async (values) => {
        form.clearErrors("root");
        if (!escolhidos.length || escolhidos.length > 200) {
          form.setError("root", {
            message: "Selecione de 1 a 200 trabalhos pendentes.",
          });
          return;
        }
        try {
          const error = await save("pagar", {
            ...values,
            unidade_id: unidadeId,
            trabalhos: escolhidos.map((t) => ({ id: t.id, versao: t.versao })),
          });
          if (error) form.setError("root", { message: error });
        } catch {
          form.setError("root", {
            message:
              "Não foi possível registrar. Atualize a página para conferir o pagamento.",
          });
        }
      })}
    >
      <Field data-invalid={Boolean(errors.colaborador_id)}>
        <FieldLabel htmlFor={id + "colaborador"}>Colaborador</FieldLabel>
        <Controller
          control={form.control}
          name="colaborador_id"
          rules={{ required: "Selecione o colaborador." }}
          render={({ field }) => (
            <ColaboradorCombobox
              id={id + "colaborador"}
              value={field.value}
              inputRef={field.ref}
              onBlur={field.onBlur}
              invalid={Boolean(errors.colaborador_id)}
              disabled={isSubmitting}
              colaboradores={colaboradores.filter((c) =>
                trabalhos.some(
                  (t) => t.colaborador_id === c.id && trabalhoPendente(t),
                ),
              )}
              onValueChange={(v) => {
                field.onChange(v);
                setSelecionados([]);
                setInicio("");
                setFim("");
              }}
            />
          )}
        />
        <FieldError errors={[errors.colaborador_id]} />
      </Field>
      {cid && (
        <>
          <p className="text-xs text-muted-foreground">
            Selecione os trabalhos quitados neste pagamento.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel htmlFor={id + "de"}>Trabalhos a partir de</FieldLabel>
              <Input
                id={id + "de"}
                type="date"
                disabled={isSubmitting}
                value={inicio}
                onChange={(e) => {
                  setInicio(e.target.value);
                  setSelecionados([]);
                }}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={id + "ate"}>Até</FieldLabel>
              <Input
                id={id + "ate"}
                type="date"
                disabled={isSubmitting}
                value={fim}
                onChange={(e) => {
                  setFim(e.target.value);
                  setSelecionados([]);
                }}
              />
            </Field>
          </div>
          <div className="rounded-lg border p-3">
            <label className="mb-3 flex items-center gap-2 text-sm font-medium">
              <Checkbox
                disabled={
                  isSubmitting || !visiveis.length || visiveis.length > 200
                }
                checked={
                  visiveis.length > 0 && escolhidos.length === visiveis.length
                }
                onCheckedChange={(checked) =>
                  setSelecionados(checked ? visiveis.map((t) => t.id) : [])
                }
              />
              Selecionar todos ({visiveis.length})
            </label>
            <div className="max-h-48 space-y-3 overflow-y-auto p-1">
              {visiveis.map((t) => (
                <label key={t.id} className="flex items-center gap-3 text-sm">
                  <Checkbox
                    disabled={isSubmitting}
                    checked={selecionados.includes(t.id)}
                    onCheckedChange={(checked) =>
                      setSelecionados((prev) =>
                        checked
                          ? [...prev, t.id]
                          : prev.filter((x) => x !== t.id),
                      )
                    }
                  />
                  <span className="flex-1">
                    {dataBR(t.data)} · {horarioTrabalho(t)}
                  </span>
                  <span className="tabular-nums">{dinheiro(t.valor)}</span>
                </label>
              ))}
              {!visiveis.length && (
                <p className="text-sm text-muted-foreground">
                  Nenhum trabalho pendente neste intervalo.
                </p>
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Total pendente deste colaborador:{" "}
            {dinheiro(totalTrabalhos(pendentes))}.
          </p>
        </>
      )}
      <fieldset disabled={isSubmitting} className="grid grid-cols-2 gap-3">
        <Field data-invalid={Boolean(errors.data)}>
          <FieldLabel htmlFor={id + "data"}>Data do pagamento</FieldLabel>
          <Input
            id={id + "data"}
            type="date"
            aria-invalid={Boolean(errors.data)}
            {...form.register("data", {
              validate: (v) =>
                (/^\d{4}-\d{2}-\d{2}$/.test(v) && v <= hojeEquipe()) ||
                "Informe uma data até hoje.",
            })}
          />
          <FieldError errors={[errors.data]} />
        </Field>
        <Field>
          <FieldLabel htmlFor={id + "forma"}>Forma de pagamento</FieldLabel>
          <Controller
            control={form.control}
            name="forma"
            render={({ field }) => (
              <FormSelect
                id={id + "forma"}
                value={field.value}
                onValueChange={field.onChange}
                disabled={isSubmitting}
                options={["Pix", "Dinheiro", "Transferência", "Outro"].map(
                  (value) => ({ value, label: value }),
                )}
                groupLabel="Formas de pagamento"
              />
            )}
          />
        </Field>
        <Field
          className="col-span-2"
          data-invalid={Boolean(errors.observacoes)}
        >
          <FieldLabel htmlFor={id + "obs"}>Observações (opcional)</FieldLabel>
          <Input
            id={id + "obs"}
            {...form.register("observacoes", {
              maxLength: { value: 1000, message: "Use até 1.000 caracteres." },
            })}
          />
          <FieldError errors={[errors.observacoes]} />
        </Field>
      </fieldset>
      <div className="flex justify-between border-t pt-3 text-sm">
        <span>{escolhidos.length} trabalho(s) selecionado(s)</span>
        <strong>{dinheiro(totalTrabalhos(escolhidos))}</strong>
      </div>
      <FieldError errors={[errors.root]} />
      <DialogFooter>
        <Button type="submit" disabled={isSubmitting || !escolhidos.length}>
          {isSubmitting ? "Registrando…" : "Registrar pagamento realizado"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function CorrigirEquipe({
  unidadeId,
  id,
  versao,
  pagamento = false,
}: {
  unidadeId: string;
  id: string;
  versao: number;
  pagamento?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const fieldId = useId();
  const form = useForm({ defaultValues: { motivo: "" } });
  const { errors, isSubmitting } = form.formState;
  const title = pagamento ? "Estornar pagamento" : "Cancelar trabalho";
  return (
    <>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={title}
        title={title}
        onClick={() => {
          form.reset();
          setOpen(true);
        }}
      >
        {pagamento ? (
          <RotateCcw className="size-4" />
        ) : (
          <Ban className="size-4" />
        )}
      </Button>
      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!isSubmitting) setOpen(v);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>
              {pagamento
                ? "O registro do pagamento será estornado e os trabalhos voltarão a ficar pendentes. Isso não movimenta dinheiro em contas bancárias."
                : "O trabalho será cancelado e deixará de compor os valores a pagar. O histórico será preservado."}
            </DialogDescription>
          </DialogHeader>
          <form
            noValidate
            className="space-y-4"
            onSubmit={form.handleSubmit(async (values) => {
              try {
                const r = await operarEquipe(
                  pagamento ? "estornar_pagamento" : "cancelar_trabalho",
                  { unidade_id: unidadeId, id, versao, ...values },
                );
                if (r.error) {
                  form.setError("root", { message: r.error });
                  return;
                }
                setOpen(false);
                toast.success("Correção registrada.");
                router.refresh();
              } catch {
                form.setError("root", {
                  message: "Não foi possível concluir. Tente novamente.",
                });
              }
            })}
          >
            <Field data-invalid={Boolean(errors.motivo)}>
              <FieldLabel htmlFor={fieldId}>Justificativa</FieldLabel>
              <Input
                id={fieldId}
                disabled={isSubmitting}
                aria-invalid={Boolean(errors.motivo)}
                {...form.register("motivo", {
                  validate: (v) =>
                    (v.trim().length >= 5 && v.trim().length <= 500) ||
                    "Informe entre 5 e 500 caracteres.",
                })}
              />
              <FieldError errors={[errors.motivo]} />
            </Field>
            <FieldError errors={[errors.root]} />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={() => setOpen(false)}
              >
                Voltar
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Processando…" : title}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
