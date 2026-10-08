"use client";
import { useId, useRef } from "react";
import { FormSelect } from "@/components/form-select";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, Loader2 } from "lucide-react";
import type { Produto } from "@/lib/gestao-types";
import { entryCostTotal } from "@/lib/gestao-money";
import { codigoProduto, dinheiro, quantidade } from "@/lib/gestao-types";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { CurrencyInput } from "../currency-input";
import { operarGestao } from "../actions";

type Campos = {
  produto_id: string;
  tipo: string;
  quantidade: string;
  custo_unitario: string;
  motivo: string;
};
const normalizar = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
export function MovimentoForm({
  unidadeId,
  produtos,
}: {
  unidadeId: string;
  produtos: Produto[];
}) {
  const id = useId();
  const ref = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const form = useForm<Campos>({
    defaultValues: {
      produto_id: "",
      tipo: "entrada",
      quantidade: "",
      custo_unitario: "",
      motivo: "",
    },
  });
  const { errors, isSubmitting } = form.formState;
  const [produtoId, tipo, qtd, custo] = useWatch({
    control: form.control,
    name: ["produto_id", "tipo", "quantidade", "custo_unitario"],
  });
  const produto = produtos.find((p) => p.id === produtoId);
  const entrada = tipo === "entrada";
  const totalEntrada = entryCostTotal(qtd, custo);
  const attrs = (name: keyof Campos) => ({
    id: id + name,
    "aria-invalid": Boolean(errors[name]),
    "aria-describedby": errors[name] ? id + name + "-erro" : undefined,
  });
  const erro = (name: keyof Campos) => (
    <FieldError id={id + name + "-erro"} errors={[errors[name]]} />
  );
  async function salvar(values: Campos) {
    form.clearErrors("root");
    try {
      const result = await operarGestao("movimento", {
        ...values,
        unidade_id: unidadeId,
        custo_unitario: values.tipo === "entrada" ? values.custo_unitario : "",
      });
      if (result.error) {
        form.setError("root", { message: result.error });
        return;
      }
      toast.success("Movimentação registrada.");
      router.refresh();
      ref.current
        ?.closest('[data-slot="dialog-content"]')
        ?.querySelector<HTMLElement>('[data-slot="dialog-close"]')
        ?.click();
    } catch {
      form.setError("root", {
        message: "Não foi possível registrar. Tente novamente.",
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
      <fieldset disabled={isSubmitting} className="space-y-4">
        <Field data-invalid={Boolean(errors.produto_id)}>
          <FieldLabel htmlFor={id + "produto_id"}>Produto</FieldLabel>
          <Controller
            name="produto_id"
            control={form.control}
            rules={{ required: "Selecione um produto da lista." }}
            render={({ field }) => (
              <Combobox
                items={produtos}
                value={produto ?? null}
                disabled={isSubmitting}
                onValueChange={(p: Produto | null) =>
                  field.onChange(p?.id ?? "")
                }
                itemToStringLabel={(p: Produto) => p.nome}
                itemToStringValue={(p: Produto) => p.id}
                isItemEqualToValue={(a: Produto, b: Produto) => a.id === b.id}
                filter={(p: Produto, query: string) =>
                  normalizar(p.nome + " " + codigoProduto(p.codigo)).includes(
                    normalizar(query.trim()),
                  )
                }
              >
                <ComboboxInput
                  {...attrs("produto_id")}
                  ref={field.ref}
                  onBlur={field.onBlur}
                  placeholder="Pesquisar por nome ou código"
                />
                <ComboboxContent>
                  <ComboboxEmpty>Nenhum produto encontrado.</ComboboxEmpty>
                  <ComboboxList>
                    {(p: Produto) => (
                      <ComboboxItem key={p.id} value={p}>
                        <div className="min-w-0 pr-6">
                          <div className="font-medium">
                            {p.nome}
                            {!p.ativo ? " (inativo)" : ""}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {codigoProduto(p.codigo)} · {p.unidade} · Saldo:{" "}
                            {quantidade(p.saldo)}
                          </div>
                        </div>
                      </ComboboxItem>
                    )}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
            )}
          />
          {erro("produto_id")}
          {produto && (
            <p className="text-xs text-muted-foreground">
              {codigoProduto(produto.codigo)} · Unidade: {produto.unidade} ·
              Saldo atual: {quantidade(produto.saldo)}
            </p>
          )}
        </Field>
        <Field>
          <FieldLabel htmlFor={id + "tipo"}>Tipo</FieldLabel>
          <Controller
            name="tipo"
            control={form.control}
            render={({ field }) => (
              <FormSelect
                groupLabel="Tipos de movimentação"
                {...attrs("tipo")}
                ref={field.ref}
                onBlur={field.onBlur}
                value={field.value}
                disabled={isSubmitting}
                onValueChange={(value) => {
                  field.onChange(value);
                  form.setValue("custo_unitario", "");
                  form.clearErrors("custo_unitario");
                }}
                options={[
                  { value: "entrada", label: "Entrada / estoque inicial" },
                  { value: "perda", label: "Perda / quebra / vencimento" },
                  { value: "consumo", label: "Consumo interno / cortesia" },
                  { value: "ajuste", label: "Ajuste de contagem" },
                ]}
              />
            )}
          />
        </Field>
        <Field data-invalid={Boolean(errors.quantidade)}>
          <FieldLabel htmlFor={id + "quantidade"}>
            Quantidade{produto ? " (" + produto.unidade + ")" : ""}
          </FieldLabel>
          <Input
            {...attrs("quantidade")}
            type="number"
            step="0.001"
            {...form.register("quantidade", {
              validate: (value) => {
                const n = Number(value);
                return (
                  (value.trim() !== "" &&
                    /^-?\d+(\.\d{1,3})?$/.test(value) &&
                    Number.isFinite(n) &&
                    n !== 0 &&
                    Math.abs(n) <= 999999999 &&
                    (form.getValues("tipo") === "ajuste" || n > 0)) ||
                  "Informe uma quantidade válida, com até 3 casas decimais. Somente ajustes permitem valores negativos."
                );
              },
            })}
          />
          {erro("quantidade")}
        </Field>
        <p className="text-xs text-muted-foreground">
          Perdas e consumo: informe quantidade positiva. Ajuste: positivo
          acrescenta e negativo retira. Para o saldo inicial, registre uma
          entrada.
        </p>
        {entrada && (
          <Field data-invalid={Boolean(errors.custo_unitario)}>
            <FieldLabel htmlFor={id + "custo_unitario"}>
              Custo unitário (opcional)
            </FieldLabel>
            <Controller
              name="custo_unitario"
              control={form.control}
              rules={{
                validate: (value) =>
                  !value ||
                  (/^\d+(\.\d{1,2})?$/.test(value) && Number(value) < 1e9) ||
                  "Informe um custo válido.",
              }}
              render={({ field }) => (
                <CurrencyInput
                  {...attrs("custo_unitario")}
                  ref={field.ref}
                  value={field.value}
                  onValueChange={field.onChange}
                  onBlur={field.onBlur}
                />
              )}
            />
            {erro("custo_unitario")}
            <p className="text-xs text-muted-foreground">
              Valor pago por {produto?.unidade ?? "unidade de controle"} nesta
              entrada. Deixe em branco se não souber o custo.
            </p>
            {totalEntrada !== null && Number(qtd) > 0 && (
              <p className="text-sm font-medium">
                Custo total da entrada: {dinheiro(totalEntrada)}
              </p>
            )}
          </Field>
        )}
        <Field data-invalid={Boolean(errors.motivo)}>
          <FieldLabel htmlFor={id + "motivo"}>Motivo</FieldLabel>
          <Input
            {...attrs("motivo")}
            {...form.register("motivo", {
              validate: (value) =>
                (value.trim().length >= 3 && value.trim().length <= 500) ||
                "Informe um motivo entre 3 e 500 caracteres.",
            })}
            placeholder="Ex.: Compra de bebidas ou contagem inicial"
          />
          {erro("motivo")}
        </Field>
      </fieldset>
      <FieldError errors={[errors.root]} />
      <DialogFooter>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <CheckCircle2 className="size-4" />
          )}
          {isSubmitting ? "Registrando…" : "Registrar movimentação"}
        </Button>
      </DialogFooter>
    </form>
  );
}
