"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function VehicleLookupSync({ vehicleIds, prefeituraId }: { vehicleIds: string[]; prefeituraId?: string }) {
  const router = useRouter();
  const idsKey = vehicleIds.join(",");
  useEffect(() => {
    if (!idsKey || !prefeituraId) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const controller = new AbortController();
    async function sync() {
      try {
        const ids = idsKey.split(",");
        for (let offset = 0; offset < ids.length && active; offset += 10) {
          const response = await fetch("/api/frotas/veiculos/consulta", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "sync", prefeituraId, vehicleIds: ids.slice(offset, offset + 10) }),
            signal: controller.signal,
          });
          if ([401, 403].includes(response.status)) return;
          if (response.ok && active) router.refresh();
        }
      } catch { /* A failed check does not cancel the persisted consultation. */ }
      if (active) timer = setTimeout(() => { void sync(); }, 10_000);
    }
    void sync();
    return () => { active = false; controller.abort(); if (timer) clearTimeout(timer); };
  }, [idsKey, prefeituraId, router]);
  return null;
}
