"use client";
import { useId, useRef } from "react";
import {
  Controller,
  useForm,
  useWatch,
  type FieldErrors,
} from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, Loader2 } from "lucide-react";
import type { Categoria, Produto } from "@/lib/gestao-types";
import { codigoProduto } from "@/lib/gestao-types";
import {
  validarProduto,
  type ProdutoCampos,
} from "@/lib/gestao-produto-validation";
import { FormSelect } from "@/components/form-select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { DialogFooter } from "@/components/ui/dialog";
import { CurrencyInput } from "../currency-input";
import { inputClass as baseInputClass } from "../ui";
import { operarGestao } from "../actions";
const inputClass =
  baseInputClass +
  " aria-invalid:border-destructive aria-invalid:ring-destructive/20";

export function ProdutoForm({
  unidadeId,
  categorias,
  produto,
  reserva,
}: {
  unidadeId: string;
  categorias: Categoria[];
  produto?: Produto;
  reserva?: { reserva_id: string; codigo: number };
}) {
  const id = useId();
  const ref = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const form = useForm<ProdutoCampos>({
    defaultValues: {
      nome: produto?.nome ?? "",
      categoria_id: produto?.categoria_id ?? "",
      unidade: produto?.unidade ?? "un",
      preco: produto?.preco == null ? "" : String(produto.preco),
      controlar_estoque: String(produto?.controlar_estoque ?? true),
      minimo: String(produto?.minimo ?? 0),
      observacoes: produto?.observacoes ?? "",
      ativo: String(produto?.ativo ?? true),
    },
    resolver: (values) => {
      const erros = validarProduto(values);
      const errors: FieldErrors<ProdutoCampos> = {};
      for (const campo of Object.keys(erros) as (keyof ProdutoCampos)[])
        errors[campo] = { type: "validate", message: erros[campo] };
      return Object.keys(errors).length
        ? { values: {}, errors }
        : { values, errors: {} };
    },
  });
  const controle =
    useWatch({ control: form.control, name: "controlar_estoque" }) === "true";
  const { errors, isSubmitting } = form.formState;
  const opcoes = categorias.filter(
    (c) => c.ativo || c.id === produto?.categoria_id,
  );
  const attrs = (name: keyof ProdutoCampos) => ({
    id: id + name,
    "aria-invalid": Boolean(errors[name]),
    "aria-describedby": errors[name] ? id + name + "-error" : undefined,
  });
  const erro = (name: keyof ProdutoCampos) => (
    <FieldError id={id + name + "-error"} errors={[errors[name]]} />
  );
  async function salvar(values: ProdutoCampos) {
    form.clearErrors("root");
    try {
      const result = await operarGestao("produto", {
        ...values,
        nome: values.nome.trim(),
        minimo: controle ? values.minimo : "0",
        unidade_id: unidadeId,
        ...(produto
          ? { id: produto.id, versao: produto.versao }
          : { reserva_id: reserva?.reserva_id }),
      });
      if (result.fieldErrors) {
        for (const [name, message] of Object.entries(result.fieldErrors))
          form.setError(name as keyof ProdutoCampos, { message });
        const first = Object.keys(result.fieldErrors)[0] as keyof ProdutoCampos;
        if (first) form.setFocus(first);
        return;
      }
      if (result.error) {
        form.setError("root", { message: result.error });
        return;
      }
      toast.success(result.success);
      router.refresh();
      ref.current
        ?.closest('[data-slot="dialog-content"]')
        ?.querySelector<HTMLElement>('[data-slot="dialog-close"]')
        ?.click();
    } catch {
      form.setError("root", {
        message: "Não foi possível salvar. Tente novamente.",
      });
    }
  }
  return (
    <form
      ref={ref}
      noValidate
      onSubmit={(event) => void form.handleSubmit(salvar)(event)}
      className="space-y-4"
    >
      <fieldset disabled={isSubmitting} className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor={id + "codigo"}>Código interno</FieldLabel>
          <Input
            id={id + "codigo"}
            value={codigoProduto(produto?.codigo ?? reserva!.codigo)}
            readOnly
          />
        </Field>
        <Field data-invalid={Boolean(errors.ativo)}>
          <FieldLabel htmlFor={id + "ativo"}>Situação</FieldLabel>
          <Controller
            name="ativo"
            control={form.control}
            render={({ field }) => (
              <FormSelect
                groupLabel="Situação"
                {...attrs("ativo")}
                ref={field.ref}
                onBlur={field.onBlur}
                value={field.value}
                onValueChange={field.onChange}
                disabled={isSubmitting}
                options={[
                  { value: "true", label: "Ativo" },
                  { value: "false", label: "Inativo" },
                ]}
                placeholder="Selecione"
              />
            )}
          />
          {erro("ativo")}
        </Field>
        <Field className="sm:col-span-2" data-invalid={Boolean(errors.nome)}>
          <FieldLabel htmlFor={id + "nome"}>Nome do produto</FieldLabel>
          <Input
            {...attrs("nome")}
            {...form.register("nome")}
            placeholder="Ex.: Água mineral 500 ml"
          />
          {erro("nome")}
        </Field>
        <Field data-invalid={Boolean(errors.categoria_id)}>
          <FieldLabel htmlFor={id + "categoria_id"}>Categoria</FieldLabel>
          <Controller
            name="categoria_id"
            control={form.control}
            render={({ field }) => (
              <FormSelect
                groupLabel="Categorias"
                {...attrs("categoria_id")}
                ref={field.ref}
                onBlur={field.onBlur}
                value={field.value}
                onValueChange={field.onChange}
                disabled={isSubmitting}
                options={opcoes.map((c) => ({
                  value: c.id,
                  label: c.nome + (!c.ativo ? " (inativa)" : ""),
                }))}
                placeholder="Selecione uma categoria"
              />
            )}
          />
          {erro("categoria_id")}
        </Field>
        <Field data-invalid={Boolean(errors.unidade)}>
          <FieldLabel htmlFor={id + "unidade"}>Unidade de controle</FieldLabel>
          <Controller
            name="unidade"
            control={form.control}
            render={({ field }) => (
              <FormSelect
                groupLabel="Unidades de controle"
                {...attrs("unidade")}
                ref={field.ref}
                onBlur={field.onBlur}
                value={field.value}
                onValueChange={field.onChange}
                disabled={isSubmitting}
                options={[
                  ["un", "Unidade"],
                  ["kg", "Quilograma"],
                  ["g", "Grama"],
                  ["l", "Litro"],
                  ["ml", "Mililitro"],
                ].map(([value, label]) => ({ value, label }))}
                placeholder="Selecione"
              />
            )}
          />
          {erro("unidade")}
        </Field>
        <Field className="sm:col-span-2" data-invalid={Boolean(errors.preco)}>
          <FieldLabel htmlFor={id + "preco"}>
            Preço de venda (opcional)
          </FieldLabel>
          <Controller
            name="preco"
            control={form.control}
            render={({ field }) => (
              <CurrencyInput
                {...attrs("preco")}
                ref={field.ref}
                value={field.value}
                onBlur={field.onBlur}
                onValueChange={field.onChange}
              />
            )}
          />
          {erro("preco")}
          <p className="text-xs text-muted-foreground">
            Preço de referência. Pode ficar em branco; informe o valor efetivo
            da venda no fechamento.
          </p>
        </Field>
        <Field data-invalid={Boolean(errors.controlar_estoque)}>
          <FieldLabel htmlFor={id + "controlar_estoque"}>
            Controlar estoque
          </FieldLabel>
          <Controller
            name="controlar_estoque"
            control={form.control}
            render={({ field }) => (
              <FormSelect
                groupLabel="Controle de estoque"
                {...attrs("controlar_estoque")}
                ref={field.ref}
                onBlur={field.onBlur}
                value={field.value}
                onValueChange={field.onChange}
                disabled={isSubmitting}
                options={[
                  { value: "true", label: "Sim" },
                  { value: "false", label: "Não" },
                ]}
                placeholder="Selecione"
              />
            )}
          />
          {erro("controlar_estoque")}
        </Field>
        <Field data-invalid={Boolean(errors.minimo)}>
          <FieldLabel htmlFor={id + "minimo"}>Estoque mínimo</FieldLabel>
          <Input
            {...attrs("minimo")}
            {...form.register("minimo")}
            type="number"
            step="0.001"
            disabled={!controle}
          />
          {erro("minimo")}
        </Field>
        <Field
          className="sm:col-span-2"
          data-invalid={Boolean(errors.observacoes)}
        >
          <FieldLabel htmlFor={id + "observacoes"}>Observações</FieldLabel>
          <textarea
            {...attrs("observacoes")}
            {...form.register("observacoes")}
            rows={2}
            className={inputClass + " h-auto py-2"}
          />
          {erro("observacoes")}
        </Field>
      </fieldset>
      <p className="text-xs text-muted-foreground">
        {controle
          ? "O saldo é alterado apenas por movimentações e fechamentos conferidos."
          : "As vendas deste produto serão registradas sem baixar estoque."}
        {produto
          ? " Unidade e controle de estoque só podem mudar enquanto não houver histórico."
          : ""}
      </p>
      <FieldError errors={[errors.root]} />
      <DialogFooter>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <CheckCircle2 className="size-4" />
          )}
          {isSubmitting
            ? "Salvando…"
            : produto
              ? "Salvar alterações"
              : "Cadastrar produto"}
        </Button>
      </DialogFooter>
    </form>
  );
}
