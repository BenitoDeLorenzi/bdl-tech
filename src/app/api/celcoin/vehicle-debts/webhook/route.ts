import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase-server";

type CelcoinVehicleDebtWebhook = {
  body?: {
    clientRequestId?: string;
    debts?: CelcoinDebt[];
    error?: Array<{
      errorCode?: string;
      message?: string;
    }>;
    idConsult?: string;
    totalAmount?: number;
    vehicle?: {
      licensePlate?: string;
      renavam?: string;
      uf?: string;
    };
  };
  entity?: string;
  status?: string;
};

type CelcoinDebt = {
  amount?: number;
  dependsOn?: string[];
  description?: string;
  distinct?: string[];
  dueDate?: string | null;
  expirationDate?: string | null;
  hasDiscount?: boolean;
  id?: string;
  isExpired?: boolean;
  required?: boolean;
  title?: string;
  type?: string;
  year?: number | null;
};

export async function POST(request: Request) {
  const secret = process.env.CELCOIN_WEBHOOK_SECRET;

  if (secret && request.headers.get("x-celcoin-webhook-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json()) as CelcoinVehicleDebtWebhook;

  if (payload.entity !== "vehicledebts-consult") {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const supabase = createSupabaseServerClient();
  const clientRequestId = payload.body?.clientRequestId;
  const idConsult = payload.body?.idConsult;
  let query = supabase
    .from("frota_debito_consultas")
    .select("id,prefeitura_id,veiculo_id")
    .limit(1);

  if (clientRequestId) {
    query = query.eq("client_request_id", clientRequestId);
  } else if (idConsult) {
    query = query.eq("id_consult", idConsult);
  } else {
    return NextResponse.json(
      { error: "Consulta sem identificador." },
      { status: 400 }
    );
  }

  const { data: consultas, error: consultaError } = await query;
  const consulta = consultas?.[0];

  if (consultaError || !consulta) {
    return NextResponse.json(
      { error: "Consulta não encontrada." },
      { status: 404 }
    );
  }

  const status = payload.status?.toLowerCase() === "success" ? "success" : "error";
  const firstError = payload.body?.error?.[0];

  await supabase
    .from("frota_debito_consultas")
    .update({
      error_code: firstError?.errorCode ?? null,
      error_message: firstError?.message ?? null,
      id_consult: idConsult ?? null,
      response_payload: payload,
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", consulta.id);

  const debts = payload.body?.debts ?? [];

  if (debts.length) {
    await supabase
      .from("frota_debitos_veiculares")
      .delete()
      .eq("consulta_id", consulta.id);

    const { error: debtsError } = await supabase
      .from("frota_debitos_veiculares")
      .insert(
        debts.map((debt) => ({
          amount: debt.amount ?? 0,
          consulta_id: consulta.id,
          depends_on: debt.dependsOn ?? [],
          description: debt.description ?? null,
          distinct_items: debt.distinct ?? [],
          due_date: debt.dueDate,
          expiration_date: debt.expirationDate,
          is_expired: Boolean(debt.isExpired),
          prefeitura_id: consulta.prefeitura_id,
          provider_debit_id: debt.id ?? crypto.randomUUID(),
          raw_payload: debt,
          required: Boolean(debt.required),
          title: debt.title ?? null,
          type: debt.type ?? null,
          veiculo_id: consulta.veiculo_id,
          year: debt.year ?? null,
        }))
      );

    if (debtsError) {
      return NextResponse.json(
        { error: debtsError.message },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ ok: true });
}
