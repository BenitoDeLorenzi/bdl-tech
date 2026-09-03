import { createClient } from "@supabase/supabase-js";

const vehicleId = process.argv[2];

if (!vehicleId) {
  console.error("Use: node --env-file=.env.local scripts/test-frota-realtime.mjs <veiculo-id>");
  process.exit(1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);
let received = false;

const timeout = setTimeout(async () => {
  await supabase.removeChannel(channel);
  console.log(
    JSON.stringify(
      {
        message: "Nenhum evento Realtime recebido em 15 segundos.",
        received,
      },
      null,
      2
    )
  );
  process.exit(received ? 0 : 1);
}, 15000);

const channel = supabase
  .channel(`debug-frota-veiculos-${Date.now()}`)
  .on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "frota_veiculos",
    },
    async (payload) => {
      received = true;
      clearTimeout(timeout);
      console.log(
        JSON.stringify(
          {
            event: payload.eventType,
            message: "Evento Realtime recebido.",
            new: payload.new,
            old: payload.old,
          },
          null,
          2
        )
      );
      await supabase.removeChannel(channel);
      process.exit(0);
    }
  )
  .subscribe(async (status, error) => {
    console.log(JSON.stringify({ error: error?.message, status }));

    if (status !== "SUBSCRIBED") {
      return;
    }

    const { data: vehicle, error: vehicleError } = await supabase
      .from("frota_veiculos")
      .select("id,observacoes")
      .eq("id", vehicleId)
      .maybeSingle();

    if (vehicleError || !vehicle) {
      clearTimeout(timeout);
      console.error(vehicleError?.message ?? "Veículo não encontrado.");
      await supabase.removeChannel(channel);
      process.exit(1);
    }

    const marker = `Teste Realtime service role ${new Date().toISOString()}`;
    const { error: updateError } = await supabase
      .from("frota_veiculos")
      .update({
        observacoes: vehicle.observacoes
          ? `${vehicle.observacoes}\n${marker}`
          : marker,
      })
      .eq("id", vehicle.id);

    if (updateError) {
      clearTimeout(timeout);
      console.error(updateError.message);
      await supabase.removeChannel(channel);
      process.exit(1);
    }
  });
