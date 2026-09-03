"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { type LicencaPagamentoStatus, type LicencaStatus } from "@/lib/licencas-data";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export type LicencaActionState = {
  error?: string;
  success?: string;
};

const allowedStatuses = new Set<LicencaStatus>([
  "active",
  "suspended",
  "expired",
  "cancelled",
]);

const allowedPaymentStatuses = new Set<LicencaPagamentoStatus>([
  "cancelled",
  "open",
  "overdue",
  "paid",
]);

export async function createLicenca(
  _previousState: LicencaActionState,
  formData: FormData
): Promise<LicencaActionState> {
  const payload = getLicencaPayload(formData);

  if ("error" in payload) {
    return payload;
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("licencas")
    .insert(payload)
    .select("id,prefeitura_id,modulo_id,inicio,valor_anual")
    .single();

  if (error) {
    return { error: formatSupabaseError(error.message) };
  }

  const parcelasError = await syncLicencaPagamentos(supabase, data);

  if (parcelasError) {
    return { error: parcelasError };
  }

  revalidatePath("/");
  revalidatePath("/licencas");
  revalidatePath(`/prefeituras/${payload.prefeitura_id}`);
  return { success: "Licença cadastrada com sucesso." };
}

export async function updateLicenca(
  _previousState: LicencaActionState,
  formData: FormData
): Promise<LicencaActionState> {
  const id = getRequiredValue(formData, "id");

  if (!id) {
    return { error: "Licença não encontrada." };
  }

  const payload = getLicencaPayload(formData);

  if ("error" in payload) {
    return payload;
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("licencas")
    .update(payload)
    .eq("id", id)
    .select("id,prefeitura_id,modulo_id,inicio,valor_anual")
    .single();

  if (error) {
    return { error: formatSupabaseError(error.message) };
  }

  const parcelasError = await syncLicencaPagamentos(supabase, data);

  if (parcelasError) {
    return { error: parcelasError };
  }

  revalidatePath("/");
  revalidatePath("/licencas");
  revalidatePath(`/prefeituras/${payload.prefeitura_id}`);
  return { success: "Licença atualizada com sucesso." };
}

export async function deleteLicenca(formData: FormData) {
  const id = getRequiredValue(formData, "id");

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("licencas").delete().eq("id", id);

  if (error) {
    redirect(`/licencas?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/");
  revalidatePath("/licencas");
  redirect("/licencas?deleted=1");
}

export async function registerLicencaPagamento(
  _previousState: LicencaActionState,
  formData: FormData
): Promise<LicencaActionState> {
  const id = getRequiredValue(formData, "id");
  const pago_em = getRequiredValue(formData, "pago_em");
  const valor_pago = getOptionalNumber(formData, "valor_pago");
  const forma_pagamento = getOptionalValue(formData, "forma_pagamento");
  const documento = getOptionalValue(formData, "documento");
  const observacoes = getOptionalValue(formData, "observacoes");

  if (!id || !pago_em || !valor_pago || valor_pago <= 0) {
    return { error: "Informe a data e o valor pago." };
  }

  const supabase = createSupabaseServerClient();
  const { data: pagamento, error: fetchError } = await supabase
    .from("licenca_pagamentos")
    .select("id,prefeitura_id")
    .eq("id", id)
    .single();

  if (fetchError || !pagamento) {
    return {
      error: formatSupabaseError(fetchError?.message ?? "Parcela não encontrada."),
    };
  }

  const { error } = await supabase
    .from("licenca_pagamentos")
    .update({
      documento,
      forma_pagamento,
      observacoes,
      pago_em,
      status: "paid",
      updated_at: new Date().toISOString(),
      valor_pago,
    })
    .eq("id", id);

  if (error) {
    return { error: formatSupabaseError(error.message) };
  }

  revalidateLicencaPagamentoPaths(pagamento.prefeitura_id);
  return { success: "Pagamento registrado com sucesso." };
}

export async function updateLicencaPagamento(
  _previousState: LicencaActionState,
  formData: FormData
): Promise<LicencaActionState> {
  const id = getRequiredValue(formData, "id");
  const vencimento = getRequiredValue(formData, "vencimento");
  const valor = getOptionalNumber(formData, "valor");
  const observacoes = getOptionalValue(formData, "observacoes");

  if (!id || !vencimento || !valor || valor <= 0) {
    return { error: "Informe o vencimento e o valor da parcela." };
  }

  const supabase = createSupabaseServerClient();
  const { data: pagamento, error: fetchError } = await supabase
    .from("licenca_pagamentos")
    .select("id,prefeitura_id,status")
    .eq("id", id)
    .single();

  if (fetchError || !pagamento) {
    return {
      error: formatSupabaseError(fetchError?.message ?? "Parcela não encontrada."),
    };
  }

  const { error } = await supabase
    .from("licenca_pagamentos")
    .update({
      observacoes,
      status:
        pagamento.status === "paid" || pagamento.status === "cancelled"
          ? pagamento.status
          : vencimento < getTodayIsoDate()
            ? "overdue"
            : "open",
      updated_at: new Date().toISOString(),
      valor,
      vencimento,
    })
    .eq("id", id);

  if (error) {
    return { error: formatSupabaseError(error.message) };
  }

  revalidateLicencaPagamentoPaths(pagamento.prefeitura_id);
  return { success: "Parcela atualizada com sucesso." };
}

export async function renewLicenca(
  _previousState: LicencaActionState,
  formData: FormData
): Promise<LicencaActionState> {
  const id = getRequiredValue(formData, "id");
  const inicio = getRequiredValue(formData, "inicio");
  const fim = getRequiredValue(formData, "fim");
  const valor_anual = getOptionalNumber(formData, "valor_anual");

  if (!id || !inicio || !fim || !valor_anual || valor_anual <= 0) {
    return { error: "Informe início, fim e valor anual da renovação." };
  }

  if (fim < inicio) {
    return { error: "A data final não pode ser menor que a data inicial." };
  }

  const supabase = createSupabaseServerClient();
  const { data: licenca, error: fetchError } = await supabase
    .from("licencas")
    .select("id,prefeitura_id,modulo_id,inicio,fim,valor_anual")
    .eq("id", id)
    .single();

  if (fetchError || !licenca) {
    return {
      error: formatSupabaseError(fetchError?.message ?? "Licença não encontrada."),
    };
  }

  const pagamentosResult = await supabase
    .from("licenca_pagamentos")
    .select("*")
    .eq("licenca_id", licenca.id)
    .order("numero_parcela", { ascending: true });

  if (
    pagamentosResult.error &&
    !isMissingLicencaPagamentosTableError(pagamentosResult.error.message)
  ) {
    return { error: formatSupabaseError(pagamentosResult.error.message) };
  }

  const renovacaoError = await insertLicencaRenovacaoSnapshot(supabase, {
    fim_novo: fim,
    fim_anterior: licenca.fim,
    inicio_novo: inicio,
    inicio_anterior: licenca.inicio,
    licenca_id: licenca.id,
    modulo_id: licenca.modulo_id,
    pagamentos_snapshot: pagamentosResult.data ?? [],
    prefeitura_id: licenca.prefeitura_id,
    valor_anual_novo: valor_anual,
    valor_anual_anterior: licenca.valor_anual,
  });

  if (renovacaoError) {
    return { error: renovacaoError };
  }

  const { error: updateError } = await supabase
    .from("licencas")
    .update({
      fim,
      inicio,
      status: "active",
      valor_anual,
    })
    .eq("id", licenca.id);

  if (updateError) {
    return { error: formatSupabaseError(updateError.message) };
  }

  const deleteResult = await supabase
    .from("licenca_pagamentos")
    .delete()
    .eq("licenca_id", licenca.id);

  if (
    deleteResult.error &&
    !isMissingLicencaPagamentosTableError(deleteResult.error.message)
  ) {
    return { error: formatSupabaseError(deleteResult.error.message) };
  }

  const parcelasError = await syncLicencaPagamentos(supabase, {
    id: licenca.id,
    inicio,
    modulo_id: licenca.modulo_id,
    prefeitura_id: licenca.prefeitura_id,
    valor_anual,
  });

  if (parcelasError) {
    return { error: parcelasError };
  }

  revalidateLicencaPagamentoPaths(licenca.prefeitura_id);
  return { success: "Licença renovada com sucesso." };
}

export async function reopenLicencaPagamento(formData: FormData) {
  const result = await updateLicencaPagamentoStatus(formData, "open", {
    documento: null,
    forma_pagamento: null,
    observacoes: null,
    pago_em: null,
    valor_pago: null,
  });

  if ("error" in result) {
    redirect(
      `/licencas?error=${encodeURIComponent(
        result.error ?? "Não foi possível reabrir a parcela."
      )}`
    );
  }
}

export async function cancelLicencaPagamento(formData: FormData) {
  const result = await updateLicencaPagamentoStatus(formData, "cancelled");

  if ("error" in result) {
    redirect(
      `/licencas?error=${encodeURIComponent(
        result.error ?? "Não foi possível cancelar a parcela."
      )}`
    );
  }
}

async function updateLicencaPagamentoStatus(
  formData: FormData,
  status: LicencaPagamentoStatus,
  values?: Record<string, string | number | null>
) {
  const id = getRequiredValue(formData, "id");

  if (!id) {
    return { error: "Parcela não encontrada." };
  }

  if (!allowedPaymentStatuses.has(status)) {
    return { error: "Status de pagamento inválido." };
  }

  const supabase = createSupabaseServerClient();
  const { data: pagamento, error: fetchError } = await supabase
    .from("licenca_pagamentos")
    .select("id,prefeitura_id")
    .eq("id", id)
    .single();

  if (fetchError || !pagamento) {
    return {
      error: formatSupabaseError(fetchError?.message ?? "Parcela não encontrada."),
    };
  }

  const { error } = await supabase
    .from("licenca_pagamentos")
    .update({
      ...(values ?? {}),
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return { error: formatSupabaseError(error.message) };
  }

  revalidateLicencaPagamentoPaths(pagamento.prefeitura_id);
  return { success: "Parcela atualizada com sucesso." };
}

function revalidateLicencaPagamentoPaths(prefeituraId: string) {
  revalidatePath("/");
  revalidatePath("/licencas");
  revalidatePath("/prefeituras");
  revalidatePath(`/prefeituras/${prefeituraId}`);
}

async function insertLicencaRenovacaoSnapshot(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  payload: {
    fim_anterior: string;
    fim_novo: string;
    inicio_anterior: string;
    inicio_novo: string;
    licenca_id: string;
    modulo_id: string;
    pagamentos_snapshot: unknown[];
    prefeitura_id: string;
    valor_anual_anterior: number | null;
    valor_anual_novo: number;
  }
) {
  const { error } = await supabase.from("licenca_renovacoes").insert(payload);

  if (error) {
    if (isMissingLicencaRenovacoesTableError(error.message)) {
      return null;
    }

    return formatSupabaseError(error.message);
  }

  return null;
}

async function syncLicencaPagamentos(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  licenca: {
    id: string;
    inicio: string;
    modulo_id: string;
    prefeitura_id: string;
    valor_anual: number | null;
  }
) {
  const pagamentosResult = await supabase
    .from("licenca_pagamentos")
    .select("id,numero_parcela,status")
    .eq("licenca_id", licenca.id);

  if (pagamentosResult.error) {
    if (isMissingLicencaPagamentosTableError(pagamentosResult.error.message)) {
      return null;
    }

    return formatSupabaseError(pagamentosResult.error.message);
  }

  const existingPayments = new Map(
    (pagamentosResult.data ?? []).map((pagamento) => [
      pagamento.numero_parcela,
      pagamento,
    ])
  );
  const parcelas = buildMonthlyPayments(licenca);
  const inserts = parcelas.filter(
    (parcela) => !existingPayments.has(parcela.numero_parcela)
  );
  const updates = parcelas.filter((parcela) => {
    const current = existingPayments.get(parcela.numero_parcela);
    return current && current.status !== "paid";
  });

  if (inserts.length) {
    const { error } = await supabase.from("licenca_pagamentos").insert(inserts);

    if (error) {
      return formatSupabaseError(error.message);
    }
  }

  for (const pagamento of updates) {
    const { error } = await supabase
      .from("licenca_pagamentos")
      .update({
        competencia: pagamento.competencia,
        modulo_id: pagamento.modulo_id,
        prefeitura_id: pagamento.prefeitura_id,
        status: pagamento.status,
        valor: pagamento.valor,
        vencimento: pagamento.vencimento,
      })
      .eq("licenca_id", pagamento.licenca_id)
      .eq("numero_parcela", pagamento.numero_parcela);

    if (error) {
      return formatSupabaseError(error.message);
    }
  }

  return null;
}

function buildMonthlyPayments(licenca: {
  id: string;
  inicio: string;
  modulo_id: string;
  prefeitura_id: string;
  valor_anual: number | null;
}) {
  const valorMensal = Math.round((Number(licenca.valor_anual ?? 0) / 12) * 100) / 100;
  const today = getTodayIsoDate();

  return Array.from({ length: 12 }, (_, index) => {
    const vencimento = addMonthsIsoDate(licenca.inicio, index);

    return {
      competencia: vencimento,
      licenca_id: licenca.id,
      modulo_id: licenca.modulo_id,
      numero_parcela: index + 1,
      prefeitura_id: licenca.prefeitura_id,
      status: vencimento < today ? "overdue" : "open",
      valor: valorMensal,
      vencimento,
    };
  });
}

function getLicencaPayload(formData: FormData) {
  const prefeitura_id = getRequiredValue(formData, "prefeitura_id");
  const modulo_id = getRequiredValue(formData, "modulo_id");
  const inicio = getRequiredValue(formData, "inicio");
  const fim = getRequiredValue(formData, "fim");
  const status = getRequiredValue(formData, "status") as LicencaStatus;
  const valor_anual = getOptionalNumber(formData, "valor_anual");

  if (!prefeitura_id || !modulo_id || !inicio || !fim || !status) {
    return { error: "Preencha todos os campos obrigatórios." };
  }

  if (!allowedStatuses.has(status)) {
    return { error: "Status inválido." };
  }

  if (fim < inicio) {
    return { error: "A data final não pode ser menor que a data inicial." };
  }

  return {
    prefeitura_id,
    modulo_id,
    inicio,
    fim,
    status,
    valor_anual,
  };
}

function getRequiredValue(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string" || !value.trim()) {
    return "";
  }

  return value.trim();
}

function getOptionalValue(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  return value.trim();
}

function getOptionalNumber(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  return Number(value);
}

function formatSupabaseError(message: string) {
  if (
    message.includes("duplicate key") ||
    message.includes("licencas_prefeitura_id_modulo_id_key") ||
    message.includes("unique")
  ) {
    return "Esta prefeitura já possui uma licença para este módulo.";
  }

  return message;
}

function getTodayIsoDate() {
  const parts = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
    year: "numeric",
  }).formatToParts(new Date());
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const year = parts.find((part) => part.type === "year")?.value ?? "1970";

  return `${year}-${month}-${day}`;
}

function addMonthsIsoDate(value: string, months: number) {
  const [year, month, day] = value.split("-").map(Number);
  const nextDate = new Date(Date.UTC(year, month - 1 + months, day));

  if (nextDate.getUTCDate() !== day) {
    nextDate.setUTCDate(0);
  }

  return [
    nextDate.getUTCFullYear(),
    String(nextDate.getUTCMonth() + 1).padStart(2, "0"),
    String(nextDate.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

function isMissingLicencaPagamentosTableError(message: string) {
  return (
    message.includes("licenca_pagamentos") &&
    (message.includes("does not exist") ||
      message.includes("Could not find the table") ||
      message.includes("schema cache"))
  );
}

function isMissingLicencaRenovacoesTableError(message: string) {
  return (
    message.includes("licenca_renovacoes") &&
    (message.includes("does not exist") ||
      message.includes("Could not find the table") ||
      message.includes("schema cache"))
  );
}
