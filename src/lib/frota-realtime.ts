import { createClient } from "@supabase/supabase-js";

type NotifyVehicleChangeInput = {
  prefeituraId: string;
  status?: string;
  veiculoId: string;
};

export async function notifyFrotaVehicleChange({
  prefeituraId,
  status,
  veiculoId,
}: NotifyVehicleChangeInput) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return;
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  const channel = supabase.channel(`frota-veiculos:${prefeituraId}`);

  try {
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(resolve, 1500);

      channel.subscribe((subscriptionStatus) => {
        if (subscriptionStatus === "SUBSCRIBED") {
          clearTimeout(timeout);
          resolve();
        }
      });
    });

    await channel.send({
      event: "vehicle_changed",
      payload: {
        prefeituraId,
        status,
        veiculoId,
      },
      type: "broadcast",
    });
  } catch {
    return;
  } finally {
    await supabase.removeChannel(channel);
  }
}
