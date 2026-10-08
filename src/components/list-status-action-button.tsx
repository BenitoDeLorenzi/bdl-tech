"use client";

import type { ComponentProps } from "react";
import { CircleCheck, CircleX } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ListStatusActionButton({ action, ...props }: Omit<ComponentProps<typeof Button>, "variant" | "size" | "className" | "children"> & { action: "complete" | "cancel" }) {
  const Icon = action === "complete" ? CircleCheck : CircleX;
  return (
    <Button {...props} variant={action === "cancel" ? "destructive" : "ghost"} size="icon-sm"
      className={action === "complete" ? "bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-400" : undefined}>
      <Icon className="size-4" />
    </Button>
  );
}
