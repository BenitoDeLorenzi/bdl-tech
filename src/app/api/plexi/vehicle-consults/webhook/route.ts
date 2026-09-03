import { NextResponse } from "next/server";

import {
  type PlexiVehicleResponse,
  persistPlexiVehicleResponse,
} from "@/lib/plexi";
import { notifyFrotaVehicleChange } from "@/lib/frota-realtime";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type PlexiWebhookPayload = {
  body?: Record<string, unknown>;
  error?: boolean;
  id?: string;
  requestId?: string;
  request_id?: string;
  status?: string;
  data?: Record<string, unknown>;
  result?: Record<string, unknown>;
};

export async function POST(request: Request) {
  const secret = process.env.PLEXI_WEBHOOK_SECRET;

  if (secret && request.headers.get("x-plexi-webhook-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await parseWebhookPayload(request);
  const requestId =
    payload.requestId ??
    payload.request_id ??
    payload.id ??
    stringFromRecord(payload.data, "requestId") ??
    stringFromRecord(payload.data, "id") ??
    stringFromRecord(payload.result, "requestId") ??
    stringFromRecord(payload.result, "id") ??
    stringFromRecord(payload.body, "requestId") ??
    stringFromRecord(payload.body, "id");
  const supabase = createSupabaseServerClient();

  if (!requestId) {
    await logWebhook(supabase, {
      message: "Callback sem identificador da consulta.",
      payload,
      status: "invalid",
    });

    return NextResponse.json({
      ok: true,
      status: "invalid",
      message: "Webhook recebido, mas sem identificador da consulta.",
    });
  }

  const { data: consulta, error: consultaError } = await supabase
    .from("frota_debito_consultas")
    .select("id,prefeitura_id,veiculo_id,request_payload")
    .eq("provider", "plexi")
    .eq("id_consult", requestId)
    .maybeSingle();

  if (consultaError || !consulta) {
    await logWebhook(supabase, {
      message: "Consulta da Plexi não encontrada.",
      payload,
      requestId,
      status: "not_found",
    });

    return NextResponse.json({
      ok: true,
      status: "not_found",
      message: "Webhook recebido, mas a consulta não está vinculada ao app.",
    });
  }

  await logWebhook(supabase, {
    consultaId: consulta.id,
    payload,
    requestId,
    status: "received",
  });

  const responseData = (payload.data ??
    payload.result ??
    payload.body ??
    payload) as PlexiVehicleResponse;

  if (isErrorPayload(payload)) {
    await supabase
      .from("frota_debito_consultas")
      .update({
        error_message: getWebhookErrorMessage(payload),
        response_payload: payload,
        status: "error",
        updated_at: new Date().toISOString(),
      })
      .eq("id", consulta.id);
    await logWebhook(supabase, {
      consultaId: consulta.id,
      message: getWebhookErrorMessage(payload),
      payload,
      requestId,
      status: "error",
    });

    if (consulta.veiculo_id) {
      await supabase
        .from("frota_veiculos")
        .update({ status: "consult_error" })
        .eq("id", consulta.veiculo_id);
      await notifyFrotaVehicleChange({
        prefeituraId: consulta.prefeitura_id,
        status: "consult_error",
        veiculoId: consulta.veiculo_id,
      });
    }

    return NextResponse.json({ ok: true });
  }

  try {
    const result = await persistPlexiVehicleResponse(
      supabase,
      consulta.id,
      consulta.veiculo_id,
      consulta.prefeitura_id,
      responseData,
      getSecretaria(consulta.request_payload)
    );
    await notifyFrotaVehicleChange({
      prefeituraId: consulta.prefeitura_id,
      status: "active",
      veiculoId: result.veiculoId,
    });
    await logWebhook(supabase, {
      consultaId: consulta.id,
      message: "Consulta veicular gravada com sucesso.",
      payload,
      requestId,
      status: "success",
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Erro ao gravar retorno da consulta automática.";

    await supabase
      .from("frota_debito_consultas")
      .update({
        error_message: errorMessage,
        response_payload: payload,
        status: "error",
        updated_at: new Date().toISOString(),
      })
      .eq("id", consulta.id);
    await logWebhook(supabase, {
      consultaId: consulta.id,
      message: errorMessage,
      payload,
      requestId,
      status: "persist_error",
    });

    if (consulta.veiculo_id) {
      await supabase
        .from("frota_veiculos")
        .update({ status: "consult_error" })
        .eq("id", consulta.veiculo_id);
      await notifyFrotaVehicleChange({
        prefeituraId: consulta.prefeitura_id,
        status: "consult_error",
        veiculoId: consulta.veiculo_id,
      });
    }

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "plexi-vehicle-consults-webhook",
    status: "online",
  });
}

async function parseWebhookPayload(request: Request): Promise<PlexiWebhookPayload> {
  try {
    return (await request.json()) as PlexiWebhookPayload;
  } catch {
    return {
      error: true,
      status: "invalid_json",
    };
  }
}

function stringFromRecord(
  record: Record<string, unknown> | undefined,
  key: string
) {
  const value = record?.[key];

  return typeof value === "string" ? value : undefined;
}

function getSecretaria(value: unknown) {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const secretaria = (value as { secretaria?: unknown }).secretaria;

  return typeof secretaria === "string" ? secretaria : undefined;
}

function isErrorPayload(payload: PlexiWebhookPayload) {
  const statuses = [
    payload.status,
    stringFromRecord(payload.data, "status"),
    stringFromRecord(payload.result, "status"),
    stringFromRecord(payload.body, "status"),
  ]
    .filter(Boolean)
    .map((status) => status?.toLowerCase());

  return (
    payload.error === true ||
    booleanFromRecord(payload.data, "error") ||
    booleanFromRecord(payload.result, "error") ||
    booleanFromRecord(payload.body, "error") ||
    statuses.some((status) =>
      status && ["erro", "error", "failed", "failure"].includes(status)
    )
  );
}

function booleanFromRecord(
  record: Record<string, unknown> | undefined,
  key: string
) {
  return record?.[key] === true;
}

function getWebhookErrorMessage(payload: PlexiWebhookPayload) {
  const message =
    stringFromRecord(payload, "message") ??
    stringFromRecord(payload.data, "message") ??
    stringFromRecord(payload.result, "message") ??
    stringFromRecord(payload.body, "message");

  return message ?? "A Plexi retornou erro na consulta veicular.";
}

async function logWebhook(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  input: {
    consultaId?: string;
    message?: string;
    payload: PlexiWebhookPayload;
    requestId?: string;
    status: string;
  }
) {
  try {
    await supabase
      .from("frota_plexi_webhook_logs")
      .insert({
        consulta_id: input.consultaId ?? null,
        message: input.message ?? null,
        payload: input.payload,
        request_id: input.requestId ?? null,
        status: input.status,
      })
      .throwOnError();
  } catch {
    return undefined;
  }
}
