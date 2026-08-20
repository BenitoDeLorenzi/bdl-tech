import * as React from "react"

import { cn } from "@/lib/utils"

function Item({
  className,
  size = "default",
  ...props
}: React.ComponentProps<"div"> & {
  size?: "default" | "sm" | "xs"
}) {
  return (
    <div
      data-slot="item"
      data-size={size}
      className={cn(
        "flex w-full min-w-0 items-center gap-3 rounded-md text-sm data-[size=default]:p-3 data-[size=sm]:p-2 data-[size=xs]:p-0",
        className
      )}
      {...props}
    />
  )
}

function ItemContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="item-content"
      className={cn("grid min-w-0 flex-1 gap-0.5", className)}
      {...props}
    />
  )
}

function ItemTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="item-title"
      className={cn("truncate font-medium leading-none", className)}
      {...props}
    />
  )
}

function ItemDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="item-description"
      className={cn("truncate text-xs text-muted-foreground", className)}
      {...props}
    />
  )
}

export { Item, ItemContent, ItemDescription, ItemTitle }
