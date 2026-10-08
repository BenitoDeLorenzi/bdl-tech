"use client";

import { CarFront } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export function VeiculoAvatar({
  fotoUrl,
  placa,
  className,
}: {
  fotoUrl?: string | null;
  placa: string;
  className?: string;
}) {
  return (
    <Avatar
      className={cn(
        "size-12 overflow-hidden rounded-xl border border-border/70 after:hidden",
        className,
      )}
    >
      {fotoUrl ? (
        <AvatarImage src={fotoUrl} alt={`Foto do veículo ${placa}`} className="rounded-none" />
      ) : null}
      <AvatarFallback
        className="rounded-none bg-muted/60 text-muted-foreground"
        role="img"
        aria-label={`Veículo ${placa} sem foto`}
      >
        <CarFront className="size-[55%]" strokeWidth={1.5} aria-hidden="true" />
      </AvatarFallback>
    </Avatar>
  );
}
