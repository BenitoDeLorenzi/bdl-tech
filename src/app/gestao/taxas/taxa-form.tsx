"use client";
import { useId } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { DialogFooter } from "@/components/ui/dialog";
import { salvarTaxa } from "./actions";

export function TaxaForm({
  unidadeId,
  forma,
  percentual,
  versao,
}: {
  unidadeId: string;
  forma: string;
  percentual: number;
  versao: number;
}) {
  const id = useId();
  const router = useRouter();
  const form = useForm({
    defaultValues: { percentual: String(percentual).replace(".", ",") },
    mode: "onSubmit",
    reValidateMode: "onChange",
  });
  const { errors, isSubmitting } = form.formState;
  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={form.handleSubmit(async (values, event) => {
        const element = event?.target as HTMLFormElement | undefined;
        form.clearErrors("root");
        try {
          const result = await salvarTaxa(
            unidadeId,
            forma,
            values.percentual,
            versao,
          );
          if (result.error) {
            form.setError("root", { message: result.error });
            return;
          }
          toast.success("Taxa atualizada.");
          element
            ?.closest('[data-slot="dialog-content"]')
            ?.querySelector<HTMLElement>('[data-slot="dialog-close"]')
            ?.click();
          router.refresh();
        } catch {
          form.setError("root", {
            message: "Não foi possível salvar. Tente novamente.",
          });
        }
      })}
    >
      <Field data-invalid={Boolean(errors.percentual)}>
        <FieldLabel htmlFor={id}>Taxa de {forma} (%)</FieldLabel>
        <Input
          id={id}
          inputMode="decimal"
          disabled={isSubmitting}
          aria-invalid={Boolean(errors.percentual)}
          aria-describedby={errors.percentual ? id + "-error" : undefined}
          {...form.register("percentual", {
            validate: (value) =>
              (/^\d{1,3}([.,]\d{1,2})?$/.test(value.trim()) &&
                Number(value.replace(",", ".")) <= 100) ||
              "Informe de 0 a 100%, com até duas casas decimais.",
          })}
        />
        <FieldError id={id + "-error"} errors={[errors.percentual]} />
      </Field>
      <p className="text-xs text-muted-foreground">
        Será sugerida nos novos fechamentos desta unidade. Você poderá ajustar a
        taxa em cada fechamento.
      </p>
      <FieldError errors={[errors.root]} />
      <DialogFooter>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Salvando…" : "Salvar taxa"}
        </Button>
      </DialogFooter>
    </form>
  );
}
