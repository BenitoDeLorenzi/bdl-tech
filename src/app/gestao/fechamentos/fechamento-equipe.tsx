"use client";
import { Controller, useWatch, type UseFormReturn } from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Field, FieldError } from "@/components/ui/field";
import { CurrencyInput } from "../currency-input";
import type { Campos } from "./fechamento-form";
import type { ColaboradorSaldo } from "@/lib/gestao-equipe";
import { dinheiro } from "@/lib/gestao-types";

export function FechamentoEquipe({
  form,
  colaboradores,
  disabled,
}: {
  form: UseFormReturn<Campos>;
  colaboradores: ColaboradorSaldo[];
  disabled: boolean;
}) {
  const equipe = useWatch({ control: form.control, name: "equipe" });
  const centavos = (v: string | number) => Math.round(Number(v || 0) * 100);
  const valido = (v: string) =>
    /^\d+(\.\d{1,2})?$/.test(v) && Number(v) > 0 && Number(v) < 1e9;
  const valorTrabalhos = equipe.reduce(
    (s, c) => s + (c.presente ? centavos(c.valor_trabalho) : 0),
    0,
  );
  const valorPago = equipe.reduce(
    (s, c) => s + (c.pagar ? centavos(c.valor_pago) : 0),
    0,
  );
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Marque quem trabalhou e registre os pagamentos realizados. É possível
        pagar parte do saldo ou quitar dias anteriores, mesmo sem presença hoje.
      </p>
      <div className="rounded-lg border [&>[data-slot=table-container]]:max-h-[42vh] [&>[data-slot=table-container]]:overflow-auto">
        <Table className="min-w-[820px] table-fixed">
          <TableHeader className="sticky top-0 z-10 bg-background">
            <TableRow>
              <TableHead className="px-3">Colaborador</TableHead>
              <TableHead className="w-[70px] text-center">Presente</TableHead>
              <TableHead className="w-[125px]">Trabalho</TableHead>
              <TableHead className="w-[115px] text-right">
                Saldo anterior
              </TableHead>
              <TableHead className="w-[80px] text-center">Pagar hoje</TableHead>
              <TableHead className="w-[125px]">Valor a pagar</TableHead>
              <TableHead className="w-[115px] text-right">Pendente</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {colaboradores.map((c, index) => {
              const row = equipe[index];
              const errors = form.formState.errors.equipe?.[index];
              const disponivel =
                centavos(c.saldo) +
                (row.presente ? centavos(row.valor_trabalho) : 0);
              return (
                <TableRow key={c.id} className="[&>td]:px-3 [&>td]:py-2">
                  <TableCell className="whitespace-normal">
                    <div className="font-medium">{c.nome}</div>
                    <div className="text-xs text-muted-foreground">
                      {c.funcao}
                      {!c.ativo ? " · Inativo" : ""}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Controller
                      control={form.control}
                      name={`equipe.${index}.presente`}
                      render={({ field }) => (
                        <Checkbox
                          className="mx-auto"
                          aria-label={`Presença de ${c.nome}`}
                          checked={field.value}
                          disabled={disabled || (!c.ativo && !field.value)}
                          onCheckedChange={(checked) => {
                            const antes =
                              centavos(c.saldo) +
                              (field.value
                                ? centavos(
                                    form.getValues(
                                      `equipe.${index}.valor_trabalho`,
                                    ),
                                  )
                                : 0);
                            field.onChange(checked);
                            if (!checked)
                              form.clearErrors(
                                `equipe.${index}.valor_trabalho`,
                              );
                            const depois =
                              centavos(c.saldo) +
                              (checked
                                ? centavos(
                                    form.getValues(
                                      `equipe.${index}.valor_trabalho`,
                                    ),
                                  )
                                : 0);
                            if (row.pagar && centavos(row.valor_pago) === antes)
                              form.setValue(
                                `equipe.${index}.valor_pago`,
                                (Math.max(0, depois) / 100).toFixed(2),
                                { shouldDirty: true },
                              );
                            if (
                              form.getFieldState(`equipe.${index}.valor_pago`)
                                .error
                            )
                              void form.trigger(`equipe.${index}.valor_pago`);
                          }}
                        />
                      )}
                    />
                  </TableCell>
                  <TableCell className="align-top">
                    <Field data-invalid={Boolean(errors?.valor_trabalho)}>
                      <Controller
                        control={form.control}
                        name={`equipe.${index}.valor_trabalho`}
                        rules={{
                          validate: (v) =>
                            !form.getValues(`equipe.${index}.presente`) ||
                            valido(v) ||
                            "Informe um valor positivo.",
                        }}
                        render={({ field }) => (
                          <CurrencyInput
                            aria-label={`Valor do trabalho de ${c.nome}`}
                            aria-invalid={Boolean(errors?.valor_trabalho)}
                            value={field.value}
                            ref={field.ref}
                            onBlur={field.onBlur}
                            disabled={disabled || !row.presente}
                            onValueChange={(v) => {
                              form.setValue(field.name, v, {
                                shouldDirty: true,
                                shouldValidate: Boolean(errors?.valor_trabalho),
                              });
                              if (errors?.valor_pago)
                                void form.trigger(`equipe.${index}.valor_pago`);
                            }}
                          />
                        )}
                      />
                      <FieldError errors={[errors?.valor_trabalho]} />
                    </Field>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {dinheiro(c.saldo)}
                  </TableCell>
                  <TableCell>
                    <Controller
                      control={form.control}
                      name={`equipe.${index}.pagar`}
                      render={({ field }) => (
                        <Checkbox
                          className="mx-auto"
                          aria-label={`Pagar ${c.nome} hoje`}
                          checked={field.value}
                          disabled={disabled}
                          onCheckedChange={(checked) => {
                            field.onChange(checked);
                            form.setValue(
                              `equipe.${index}.valor_pago`,
                              checked
                                ? (Math.max(0, disponivel) / 100).toFixed(2)
                                : "",
                              { shouldDirty: true },
                            );
                            form.clearErrors(`equipe.${index}.valor_pago`);
                          }}
                        />
                      )}
                    />
                  </TableCell>
                  <TableCell className="align-top">
                    <Field data-invalid={Boolean(errors?.valor_pago)}>
                      <Controller
                        control={form.control}
                        name={`equipe.${index}.valor_pago`}
                        rules={{
                          validate: (v) =>
                            !form.getValues(`equipe.${index}.pagar`) ||
                            (valido(v) &&
                              centavos(v) <=
                                centavos(c.saldo) +
                                  (form.getValues(`equipe.${index}.presente`)
                                    ? centavos(
                                        form.getValues(
                                          `equipe.${index}.valor_trabalho`,
                                        ),
                                      )
                                    : 0)) ||
                            "Informe um valor positivo até o saldo disponível.",
                        }}
                        render={({ field }) => (
                          <CurrencyInput
                            aria-label={`Pagamento de ${c.nome}`}
                            aria-invalid={Boolean(errors?.valor_pago)}
                            value={field.value}
                            ref={field.ref}
                            onBlur={field.onBlur}
                            disabled={disabled || !row.pagar}
                            onValueChange={(v) =>
                              form.setValue(field.name, v, {
                                shouldDirty: true,
                                shouldValidate: Boolean(errors?.valor_pago),
                              })
                            }
                          />
                        )}
                      />
                      <FieldError errors={[errors?.valor_pago]} />
                    </Field>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {dinheiro(
                      (disponivel -
                        (row.pagar ? centavos(row.valor_pago) : 0)) /
                        100,
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {!colaboradores.length && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-24 text-center text-muted-foreground"
                >
                  Cadastre os colaboradores em Equipe para registrar a presença.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex flex-wrap justify-between gap-2 text-sm">
        <span>
          Trabalho do dia: <strong>{dinheiro(valorTrabalhos / 100)}</strong>
        </span>
        <span>
          Pago neste fechamento: <strong>{dinheiro(valorPago / 100)}</strong>
        </span>
      </div>
    </div>
  );
}
