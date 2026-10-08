"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Radio } from "lucide-react";

export function OrdensRealtime({ nextExpiry }: { nextExpiry: string | null }) {
  const router = useRouter();
  const [connected, setConnected] = useState(false);
  useEffect(() => {
    const source = new EventSource("/frotas/posto/realtime");
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => router.refresh(), 300);
    };
    source.addEventListener("ready", () => { setConnected(true); refresh(); });
    source.addEventListener("changed", refresh);
    source.onerror = () => setConnected(false);
    const onVisible = () => { if (document.visibilityState === "visible") refresh(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { source.close(); clearTimeout(refreshTimer); document.removeEventListener("visibilitychange", onVisible); };
  }, [router]);
  useEffect(() => {
    if (!nextExpiry) return;
    // Expiration happens with the clock, even when no database event is emitted.
    const delay = Math.min(Math.max(Date.parse(nextExpiry) - Date.now() + 1000, 1000), 2147483647);
    const timer = setTimeout(() => router.refresh(), delay);
    return () => clearTimeout(timer);
  }, [nextExpiry, router]);
  return <span role="status" className="flex items-center gap-1.5 text-xs text-muted-foreground"><Radio className={connected ? "size-3.5 text-emerald-600" : "size-3.5 text-amber-600"} />{connected ? "Atualização em tempo real" : "Conectando atualização automática…"}</span>;
}
