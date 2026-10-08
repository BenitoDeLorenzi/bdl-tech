import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export function HeaderSeparator({ className }: { className?: string }) {
  return (
    <Separator
      orientation="vertical"
      className={cn("h-5 data-vertical:self-center", className)}
    />
  );
}
