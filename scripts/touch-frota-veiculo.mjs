import { createClient } from "@supabase/supabase-js";

const vehicleId = process.argv[2];

if (!vehicleId) {
  console.error("Use: node --env-file=.env.local scripts/touch-frota-veiculo.mjs <veiculo-id>");
  process.exit(1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const { data: vehicle, error: vehicleError } = await supabase
  .from("frota_veiculos")
  .select("id,prefeitura_id,placa,observacoes,status")
  .eq("id", vehicleId)
  .maybeSingle();

if (vehicleError || !vehicle) {
  console.error(vehicleError?.message ?? "Veículo não encontrado.");
  process.exit(1);
}

const marker = `Teste Realtime ${new Date().toISOString()}`;
const { error } = await supabase
  .from("frota_veiculos")
  .update({
    observacoes: vehicle.observacoes
      ? `${vehicle.observacoes}\n${marker}`
      : marker,
  })
  .eq("id", vehicle.id);

if (error) {
  console.error(error.message);
  process.exit(1);
}

await notifyVehicleChange(vehicle);

console.log(
  JSON.stringify(
    {
      message: "Veículo atualizado para testar Realtime.",
      placa: vehicle.placa,
      status: vehicle.status,
      veiculoId: vehicle.id,
    },
    null,
    2
  )
);

async function notifyVehicleChange(vehicle) {
  const channel = supabase.channel(`frota-veiculos:${vehicle.prefeitura_id}`);

  try {
    await new Promise((resolve) => {
      const timeout = setTimeout(resolve, 1500);

      channel.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          clearTimeout(timeout);
          resolve();
        }
      });
    });

    await channel.send({
      event: "vehicle_changed",
      payload: {
        prefeituraId: vehicle.prefeitura_id,
        status: vehicle.status,
        veiculoId: vehicle.id,
      },
      type: "broadcast",
    });
  } finally {
    await supabase.removeChannel(channel);
  }
}
