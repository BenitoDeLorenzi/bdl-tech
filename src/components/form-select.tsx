"use client";
import type { ComponentProps } from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectLabel,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
type Props = Pick<
  ComponentProps<typeof SelectTrigger>,
  "id" | "ref" | "onBlur" | "aria-label" | "aria-invalid" | "aria-describedby"
> & {
  options: { value: string; label: string; disabled?: boolean }[];
  name?: string;
  value?: string | null;
  defaultValue?: string;
  disabled?: boolean;
  required?: boolean;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  groupLabel?: string;
};
export function FormSelect({
  options,
  name,
  value,
  defaultValue,
  disabled,
  required,
  onValueChange,
  placeholder = "Selecione",
  groupLabel = "Opções",
  ...trigger
}: Props) {
  return (
    <Select
      items={options}
      name={name}
      value={value === "" ? null : value}
      defaultValue={defaultValue}
      disabled={disabled}
      required={required}
      onValueChange={(v) => onValueChange?.(v ?? "")}
    >
      <SelectTrigger {...trigger} className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>{groupLabel}</SelectLabel>
          {options.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
