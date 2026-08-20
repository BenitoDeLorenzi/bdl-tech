"use client";

import * as React from "react";
import { CalendarIcon } from "lucide-react";
import { mask } from "remask";
import { ptBR } from "date-fns/locale";

import { Calendar } from "@/components/ui/calendar";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type DatePickerInputProps = {
  defaultValue?: string;
  disabled?: boolean;
  error?: string;
  id: string;
  label: string;
  name: string;
  onValueChange?: (value: string) => void;
  required?: boolean;
  value?: string;
};

export function DatePickerInput({
  defaultValue,
  disabled,
  error,
  id,
  label,
  name,
  onValueChange,
  required,
  value: controlledValue,
}: DatePickerInputProps) {
  const currentIsoValue = controlledValue ?? defaultValue;
  const initialDate = parseIsoDate(currentIsoValue);
  const [open, setOpen] = React.useState(false);
  const [date, setDate] = React.useState<Date | undefined>(initialDate);
  const [month, setMonth] = React.useState<Date | undefined>(initialDate);
  const [value, setValue] = React.useState(formatDisplayDate(initialDate));

  return (
    <Field data-invalid={Boolean(error)}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <input name={name} type="hidden" value={formatIsoDate(date)} />
      <InputGroup>
        <InputGroupInput
          id={id}
          disabled={disabled}
          value={value}
          placeholder="dd/MM/aaaa"
          required={required}
          aria-invalid={Boolean(error)}
          onChange={(event) => {
            const nextValue = mask(event.target.value, "99/99/9999");
            const nextDate = parseDisplayDate(nextValue);

            setValue(nextValue);
            setDate(nextDate);
            onValueChange?.(formatIsoDate(nextDate));

            if (nextDate) {
              setMonth(nextDate);
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setOpen(true);
            }
          }}
        />
        <InputGroupAddon align="inline-end">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger
              render={
                <InputGroupButton
                  id={`${id}-picker`}
                  variant="ghost"
                  size="icon-xs"
                  aria-label="Selecionar data"
                  disabled={disabled}
                >
                  <CalendarIcon />
                  <span className="sr-only">Selecionar data</span>
                </InputGroupButton>
              }
            />
            <PopoverContent
              className="w-auto overflow-hidden p-0"
              align="end"
              alignOffset={-8}
              sideOffset={10}
            >
              <Calendar
                mode="single"
                selected={date}
                month={month}
                onMonthChange={setMonth}
                locale={ptBR}
                onSelect={(selectedDate) => {
                  setDate(selectedDate);
                  setMonth(selectedDate);
                  setValue(formatDisplayDate(selectedDate));
                  onValueChange?.(formatIsoDate(selectedDate));
                  setOpen(false);
                }}
              />
            </PopoverContent>
          </Popover>
        </InputGroupAddon>
      </InputGroup>
      <FieldError errors={[error ? { message: error } : undefined]} />
    </Field>
  );
}

function parseIsoDate(value?: string) {
  if (!value) {
    return undefined;
  }

  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) {
    return undefined;
  }

  return new Date(year, month - 1, day);
}

function parseDisplayDate(value: string) {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
    return undefined;
  }

  const [day, month, year] = value.split("/").map(Number);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return undefined;
  }

  return date;
}

function formatDisplayDate(date: Date | undefined) {
  if (!date) {
    return "";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatIsoDate(date: Date | undefined) {
  if (!date) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
