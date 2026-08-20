"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { LogIn } from "lucide-react";
import { mask } from "remask";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { loginAction, type LoginState } from "./actions";

const initialState: LoginState = {};

export function LoginForm() {
  const [state, formAction] = useActionState(loginAction, initialState);

  useEffect(() => {
    if (state.error) {
      toast.error(state.error, {
        id: "login-error",
      });
    }
  }, [state.error]);

  return (
    <form action={formAction} className="space-y-5">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="identifier">CPF</FieldLabel>
          <Input
            id="identifier"
            name="identifier"
            placeholder="000.000.000-00"
            inputMode="numeric"
            maxLength={14}
            autoComplete="username"
            onChange={(event) => {
              event.currentTarget.value = mask(
                event.currentTarget.value.replace(/\D/g, ""),
                "999.999.999-99"
              );
            }}
            required
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="password">Senha</FieldLabel>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="Digite sua senha"
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
      <LogIn className="size-4" />
      {pending ? "Entrando..." : "Entrar"}
    </Button>
  );
}
