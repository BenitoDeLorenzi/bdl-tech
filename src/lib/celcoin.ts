import { randomUUID } from "crypto";

import { createSupabaseServerClient } from "@/lib/supabase-server";

type SupabaseServerClient = ReturnType<typeof createSupabaseServerClient>;

type VehicleDebtConsultInput = {
  licensePlate: string;
  prefeituraId: string;
  renavam: string;
  veiculoId: string;
};

type CelcoinTokenResponse = {
  access_token: string;
  expires_in: number;
  token_type: string;
};

type CelcoinConsultResponse = {
  body?: {
    clientRequestId?: string;
    idConsult?: string;
    licensePlate?: string;
    renavam?: string;
    state?: string;
  };
  error?: {
    errorCode?: string;
    message?: string;
  };
  status?: string;
  version?: string;
};

export function isCelcoinVehicleDebtsEnabled() {
  return process.env.CELCOIN_VEHICLE_DEBTS_ENABLED === "true";
}

export async function requestCelcoinVehicleDebtConsult(
  supabase: SupabaseServerClient,
  input: VehicleDebtConsultInput
) {
  const clientRequestId = randomUUID();
  const payload = {
    clientRequestId,
    licensePlate: input.licensePlate,
    renavam: input.renavam,
    state: "SC",
  };
  const { data: consulta, error: consultaError } = await supabase
    .from("frota_debito_consultas")
    .insert({
      client_request_id: clientRequestId,
      license_plate: input.licensePlate,
      prefeitura_id: input.prefeituraId,
      renavam: input.renavam,
      request_payload: payload,
      state: "SC",
      status: isCelcoinVehicleDebtsEnabled() ? "pending" : "disabled",
      veiculo_id: input.veiculoId,
    })
    .select("id")
    .single();

  if (consultaError || !consulta) {
    return {
      error: consultaError?.message ?? "Consulta de débitos não criada.",
      started: false,
    };
  }

  if (!isCelcoinVehicleDebtsEnabled()) {
    return { started: false };
  }

  try {
    const token = await getCelcoinAccessToken();
    const response = await fetch(
      `${getCelcoinBaseUrl()}/baas/v2/vehicledebts/consult`,
      {
        body: JSON.stringify(payload),
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        method: "POST",
      }
    );
    const responsePayload = (await response.json()) as CelcoinConsultResponse;

    if (!response.ok || responsePayload.status === "ERROR") {
      const errorMessage =
        responsePayload.error?.message ?? "Erro ao consultar débitos na Celcoin.";

      await supabase
        .from("frota_debito_consultas")
        .update({
          error_code: responsePayload.error?.errorCode ?? null,
          error_message: errorMessage,
          response_payload: responsePayload,
          status: "error",
          updated_at: new Date().toISOString(),
        })
        .eq("id", consulta.id);

      return { error: errorMessage, started: false };
    }

    await supabase
      .from("frota_debito_consultas")
      .update({
        id_consult: responsePayload.body?.idConsult ?? null,
        response_payload: responsePayload,
        status:
          responsePayload.status?.toLowerCase() === "processing"
            ? "processing"
            : "pending",
        updated_at: new Date().toISOString(),
      })
      .eq("id", consulta.id);

    return { started: true };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Erro inesperado ao consultar débitos na Celcoin.";

    await supabase
      .from("frota_debito_consultas")
      .update({
        error_message: message,
        status: "error",
        updated_at: new Date().toISOString(),
      })
      .eq("id", consulta.id);

    return { error: message, started: false };
  }
}

async function getCelcoinAccessToken() {
  const clientId = process.env.CELCOIN_CLIENT_ID;
  const clientSecret = process.env.CELCOIN_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Credenciais da Celcoin não configuradas.");
  }

  const body = new URLSearchParams();
  body.set("client_id", clientId);
  body.set("client_secret", clientSecret);
  body.set("grant_type", process.env.CELCOIN_GRANT_TYPE ?? "client_credentials");

  const response = await fetch(process.env.CELCOIN_AUTH_URL ?? getCelcoinBaseUrl(), {
    body,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    method: "POST",
  });
  const payload = (await response.json()) as CelcoinTokenResponse;

  if (!response.ok || !payload.access_token) {
    throw new Error("Não foi possível autenticar na Celcoin.");
  }

  return payload.access_token;
}

function getCelcoinBaseUrl() {
  return (
    process.env.CELCOIN_BASE_URL ?? "https://sandbox.openfinance.celcoin.dev"
  ).replace(/\/$/, "");
}
