"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { Fuel, LogIn } from "lucide-react";
import { mask } from "remask";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { loginPostoAction, type PostoLoginState } from "./actions";

const initialState: PostoLoginState = {};

export function PostoLoginForm() {
  const [state, formAction] = useActionState(loginPostoAction, initialState);

  useEffect(() => {
    if (state.error) {
      toast.error(state.error, {
        id: "posto-login-error",
      });
    }
  }, [state.error]);

  return (
    <form action={formAction} className="space-y-5">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="cnpj">CNPJ</FieldLabel>
          <Input
            id="cnpj"
            name="cnpj"
            placeholder="00.000.000/0000-00"
            inputMode="numeric"
            maxLength={18}
            autoComplete="username"
            onChange={(event) => {
              event.currentTarget.value = mask(
                event.currentTarget.value.replace(/\D/g, ""),
                "99.999.999/9999-99"
              );
            }}
            required
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="senha">Senha</FieldLabel>
          <Input
            id="senha"
            name="senha"
            type="password"
            placeholder="Digite a senha do posto"
            autoComplete="current-password"
            required
          />
        </Field>
      </FieldGroup>

      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="h-9 w-full gap-2" disabled={pending}>
      {pending ? <Fuel className="size-4" /> : <LogIn className="size-4" />}
      {pending ? "Entrando..." : "Entrar no portal"}
    </Button>
  );
}
