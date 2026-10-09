"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, type ComponentProps } from "react";

export function SidebarRouteLink({ href, onPointerEnter, onFocus, onClick, ...props }: ComponentProps<typeof Link>) {
  const router = useRouter();
  const prefetched = useRef<{ href: string; at: number } | null>(null);
  function warmRoute() {
    if (typeof href !== "string" || !href.startsWith("/frotas")) return;
    if (prefetched.current?.href === href && Date.now() - prefetched.current.at < 30000) return;
    prefetched.current = { href, at: Date.now() };
    router.prefetch(href);
  }
  return <Link {...props} href={href}
    onClick={event => {
      if (typeof href === "string" && href.startsWith("/frotas/ajuda") && window.location.pathname !== "/frotas/ajuda") {
        try { window.sessionStorage.setItem("frotas-support-origin", window.location.pathname); } catch {}
      }
      onClick?.(event);
    }}
    onPointerEnter={event => { warmRoute(); onPointerEnter?.(event); }}
    onFocus={event => { warmRoute(); onFocus?.(event); }}
  />;
}
