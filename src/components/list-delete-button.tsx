"use client";

import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";

export function ListDeleteButton(props: Omit<ComponentProps<typeof Button>, "variant" | "size" | "className">) {
  return <Button {...props} variant="destructive" size="icon-sm" />;
}
