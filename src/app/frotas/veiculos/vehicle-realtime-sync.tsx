"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase";

type VehicleRealtimeSyncProps = {
  prefeituraId?: string;
  vehicleId?: string;
};

export function VehicleRealtimeSync({
  prefeituraId,
  vehicleId,
}: VehicleRealtimeSyncProps) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const debug = process.env.NODE_ENV === "development";
    const channelName = prefeituraId
      ? `frota-veiculos:${prefeituraId}`
      : `frota-veiculos-sync-${vehicleId ?? "all"}`;
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const shouldRefresh = (row: Record<string, unknown>) => {
      if (vehicleId) {
        return row.id === vehicleId || row.veiculo_id === vehicleId;
      }

      if (prefeituraId) {
        return row.prefeitura_id === prefeituraId;
      }

      return true;
    };

    async function subscribe() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const serverSession = session
        ? null
        : await getServerRealtimeSession(debug);
      const accessToken = session?.access_token ?? serverSession?.accessToken;
      const userId = session?.user.id ?? serverSession?.userId;

      if (cancelled) {
        return;
      }

      if (accessToken) {
        supabase.realtime.setAuth(accessToken);

        if (debug) {
          console.info("[BDL Realtime] autenticado", {
            origem: session ? "browser" : "server",
            userId,
          });
        }
      } else if (debug) {
        console.warn("[BDL Realtime] sessão ausente no navegador");
      }

      channel = supabase
        .channel(channelName)
        .on(
          "broadcast",
          {
            event: "vehicle_changed",
          },
          ({ payload }) => {
            if (debug) {
              console.info("[BDL Realtime] broadcast vehicle_changed", payload);
            }

            if (shouldRefresh(payload as Record<string, unknown>)) {
              router.refresh();
            }
          }
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "frota_veiculos",
          },
          (payload) => {
            if (debug) {
              console.info("[BDL Realtime] frota_veiculos", payload);
            }

            if (shouldRefresh(payload.new as Record<string, unknown>)) {
              router.refresh();
            }
          }
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "frota_debito_consultas",
          },
          (payload) => {
            if (debug) {
              console.info("[BDL Realtime] frota_debito_consultas", payload);
            }

            if (shouldRefresh(payload.new as Record<string, unknown>)) {
              router.refresh();
            }
          }
        )
        .subscribe((status, error) => {
          if (!debug) {
            return;
          }

          if (error) {
            console.error("[BDL Realtime] erro na assinatura", status, error);
            return;
          }

          console.info("[BDL Realtime] status da assinatura", status);
        });
    }

    void subscribe();

    return () => {
      cancelled = true;

      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [prefeituraId, router, vehicleId]);

  return null;
}

async function getServerRealtimeSession(debug: boolean) {
  try {
    const response = await fetch("/api/realtime/token", {
      cache: "no-store",
    });

    if (!response.ok) {
      if (debug) {
        console.warn("[BDL Realtime] token do servidor indisponível", {
          status: response.status,
        });
      }

      return null;
    }

    return (await response.json()) as {
      accessToken: string;
      userId: string;
    };
  } catch (error) {
    if (debug) {
      console.warn("[BDL Realtime] erro ao buscar token do servidor", error);
    }

    return null;
  }
}
