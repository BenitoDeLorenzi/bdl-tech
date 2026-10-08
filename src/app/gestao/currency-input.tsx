"use client";
import { useState, type ComponentProps } from "react";
import { Input } from "@/components/ui/input";
import { currencyDisplay, currencyValue } from "@/lib/gestao-money";

type CurrencyInputProps = Pick<
  ComponentProps<typeof Input>,
  "ref" | "onBlur" | "aria-invalid" | "aria-describedby"
> & {
  name?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  id?: string;
  "aria-label"?: string;
};
export function CurrencyInput({
  name,
  value,
  defaultValue = "",
  onValueChange,
  ...props
}: CurrencyInputProps) {
  const [local, setLocal] = useState(defaultValue);
  const current = value ?? local;
  return (
    <>
      {name && (
        <input
          type="hidden"
          name={name}
          value={current}
          disabled={props.disabled}
        />
      )}
      <Input
        {...props}
        type="text"
        inputMode="numeric"
        placeholder="R$ 0,00"
        value={currencyDisplay(current)}
        onChange={(event) => {
          const next = currencyValue(event.target.value);
          if (next === null) return;
          setLocal(next);
          onValueChange?.(next);
        }}
      />
    </>
  );
}
