import { randomUUID } from "crypto";

import { createSupabaseServerClient } from "@/lib/supabase-server";

type SupabaseServerClient = ReturnType<typeof createSupabaseServerClient>;

type PlexiVehicleConsultInput = {
  licensePlate: string;
  prefeituraId: string;
  renavam: string;
  secretaria?: string;
  veiculoId?: string;
};

type PlexiConsultResponse = {
  body?: {
    id?: string;
    requestId?: string;
  };
  id?: string;
  requestId?: string;
  status?: string;
};

type PlexiConsultRow = {
  id: string;
  prefeitura_id: string;
  request_payload: {
    secretaria?: string;
  } | null;
  response_payload: unknown;
  veiculo_id: string | null;
};

export type PlexiVehicleResponse = {
  anoFabricacao?: string;
  anoModelo?: string;
  carroceria?: string;
  categoria?: string;
  combustivel?: string;
  cor?: string;
  dataAquisicao?: string;
  debitos?: PlexiDebito[];
  error?: boolean;
  especie?: string;
  historicoMultas?: PlexiMulta[];
  ipvaDividaAtiva?: PlexiDebito[];
  licenciado?: string;
  lugares?: string;
  marca?: string;
  modelo?: string;
  municipioEmplacamento?: string;
  multasPagar?: PlexiMulta[];
  placa?: string;
  principalCondutor?: string;
  processos?: PlexiProcesso[];
  proprietarioAnterior?: string;
  proprietarioAtual?: string;
  recursoInfracao?: PlexiRecursoInfracao[];
  renavam?: string;
  restricaoVenda?: string;
  restricoes?: string;
  situacao?: string;
  tipo?: string;
  ultimoProcesso?: PlexiProcesso;
  valorTotalDebitos?: number;
  valorTotalHistoricoMultas?: number;
  valorTotalMultasPagar?: number;
};

type PlexiDebito = {
  classe?: string;
  exercicio?: number;
  numeroDetranNET?: string;
  valorAtual?: number;
  vencimento?: string;
};

type PlexiMulta = {
  data?: string;
  descricao?: string;
  hora?: string;
  localComplemento?: string;
  numeroAuto?: string;
  situacao?: string;
  valor?: number;
};

type PlexiRecursoInfracao = {
  detalhamentoInfracao?: string;
  numeroAuto?: string;
  processo?: string;
  resultadoProcesso?: string;
};

type PlexiProcesso = {
  finalEm?: string;
  inicioEm?: string;
  interessado?: string;
  processo?: string;
  servicos?: Array<{
    data?: string;
    hora?: string;
    nome?: string;
  }>;
  situacao?: string;
};

export function isPlexiVehicleConsultEnabled() {
  return process.env.PLEXI_API_ENABLED === "true";
}

export async function requestPlexiVehicleConsult(
  supabase: SupabaseServerClient,
  input: PlexiVehicleConsultInput
) {
  const existingConsult = await findReusablePlexiConsult(supabase, input);

  if (existingConsult.error) {
    return { error: existingConsult.error, started: false };
  }

  if (existingConsult.found) {
    return {
      error: "Este veículo já possui uma consulta automática em andamento.",
      started: false,
    };
  }

  const secretName = process.env.PLEXI_SECRET_NAME;
  const payload: {
    placa: string;
    renavam: string;
    secretName?: string;
  } = {
    placa: input.licensePlate,
    renavam: input.renavam,
  };

  if (secretName) {
    payload.secretName = secretName;
  }
  const clientRequestId = randomUUID();

  const { data: consulta, error: consultaError } = await supabase
    .from("frota_debito_consultas")
    .insert({
      client_request_id: clientRequestId,
      license_plate: input.licensePlate,
      prefeitura_id: input.prefeituraId,
      provider: "plexi",
      renavam: input.renavam,
      request_payload: {
        ...payload,
        secretaria: input.secretaria,
      },
      state: "SC",
      status: isPlexiVehicleConsultEnabled() ? "pending" : "disabled",
      veiculo_id: input.veiculoId ?? null,
    })
    .select("id")
    .single();

  if (consultaError || !consulta) {
    return {
      error: consultaError?.message ?? "Consulta automática não criada.",
      started: false,
    };
  }

  if (!isPlexiVehicleConsultEnabled()) {
    return { consultaId: consulta.id, started: false };
  }

  const token = process.env.PLEXI_API_TOKEN;

  if (!token || !secretName) {
    await markPlexiConsultAsError(
      supabase,
      consulta.id,
      "Credenciais da Plexi não configuradas."
    );

    return {
      error:
        "Configure PLEXI_API_TOKEN e PLEXI_SECRET_NAME antes de consultar.",
      started: false,
    };
  }

  try {
    const headers: Record<string, string> = {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
    const callbackUrl = getPlexiCallbackUrl();

    if (callbackUrl) {
      headers.Callback = callbackUrl;
    }

    const response = await fetch(
      `${getPlexiBaseUrl()}/api/maestro/detran-sc/veiculos/consulta-completa-veiculo`,
      {
        body: JSON.stringify(payload),
        headers,
        method: "POST",
      }
    );
    const responsePayload = (await parsePlexiResponse(
      response
    )) as PlexiConsultResponse | null;

    if (!response.ok) {
      const message = formatPlexiRequestError(response.status, responsePayload);
      await supabase
        .from("frota_debito_consultas")
        .update({
          error_message: message,
          response_payload: responsePayload,
          status: "error",
          updated_at: new Date().toISOString(),
        })
        .eq("id", consulta.id);

      return { error: message, started: false };
    }

    const requestId = responsePayload ? getPlexiRequestId(responsePayload) : null;

    if (!requestId) {
      const message =
        "A consulta automática foi aceita, mas não retornou identificador para acompanhamento.";

      await markPlexiConsultAsError(supabase, consulta.id, message);
      return { error: message, started: false };
    }

    await supabase
      .from("frota_debito_consultas")
      .update({
        id_consult: requestId,
        response_payload: responsePayload,
        status: "processing",
        updated_at: new Date().toISOString(),
      })
      .eq("id", consulta.id);

    return { consultaId: consulta.id, started: true };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Erro inesperado ao consultar veículo na Plexi.";

    await markPlexiConsultAsError(supabase, consulta.id, message);
    return { error: message, started: false };
  }
}

export async function persistPlexiVehicleResponse(
  supabase: SupabaseServerClient,
  consultaId: string,
  veiculoId: string | null,
  prefeituraId: string,
  payload: PlexiVehicleResponse,
  secretaria?: string
) {
  const vehicleUpdate: Record<string, unknown> = {
    ano_fabricacao: toNumber(payload.anoFabricacao),
    ano_modelo: toNumber(payload.anoModelo),
    carroceria: payload.carroceria ?? null,
    categoria: payload.categoria ?? null,
    combustivel: payload.combustivel ?? null,
    cor: payload.cor ?? null,
    data_aquisicao: parsePlexiDate(payload.dataAquisicao),
    especie: payload.especie ?? null,
    licenciado: payload.licenciado ?? null,
    lugares: payload.lugares ?? null,
    marca: payload.marca ?? "Não informado",
    modelo: payload.modelo ?? "Não informado",
    municipio_emplacamento: payload.municipioEmplacamento ?? null,
    origem_dados: "Consulta automática",
    principal_condutor: payload.principalCondutor ?? null,
    proprietario_anterior: payload.proprietarioAnterior ?? null,
    proprietario_atual: payload.proprietarioAtual ?? null,
    restricao_venda: payload.restricaoVenda ?? null,
    restricoes: payload.restricoes ?? null,
    situacao_veicular: payload.situacao ?? null,
    status: "active",
    tipo: payload.tipo ?? "Automovel",
  };
  const ano = toNumber(payload.anoModelo) ?? toNumber(payload.anoFabricacao);

  if (ano) {
    vehicleUpdate.ano = ano;
  }

  if (payload.placa) {
    vehicleUpdate.placa = payload.placa;
  }

  if (payload.renavam) {
    vehicleUpdate.renavam = payload.renavam;
  }

  const resolvedVeiculoId =
    veiculoId ??
    (await createVehicleFromPlexiResponse(
      supabase,
      prefeituraId,
      secretaria,
      payload
    ));

  await supabase
    .from("frota_veiculos")
    .update(vehicleUpdate)
    .eq("id", resolvedVeiculoId);

  await persistPlexiDebts(supabase, consultaId, resolvedVeiculoId, prefeituraId, payload);
  await persistPlexiFines(supabase, consultaId, resolvedVeiculoId, prefeituraId, payload);
  await persistPlexiProcesses(supabase, consultaId, resolvedVeiculoId, prefeituraId, payload);

  await supabase
    .from("frota_debito_consultas")
    .update({
      error_message: null,
      response_payload: payload,
      status: "success",
      updated_at: new Date().toISOString(),
      veiculo_id: resolvedVeiculoId,
    })
    .eq("id", consultaId);

  return { veiculoId: resolvedVeiculoId };
}

export async function refreshPlexiVehicleConsultResult(
  supabase: SupabaseServerClient,
  consultaId: string
) {
  const { data, error } = await supabase
    .from("frota_debito_consultas")
    .select("id,prefeitura_id,veiculo_id,id_consult,status,error_message,request_payload,response_payload")
    .eq("provider", "plexi")
    .eq("id", consultaId)
    .maybeSingle();

  if (error || !data) {
    return {
      error: error?.message ?? "Consulta não encontrada.",
      status: "error" as const,
    };
  }

  const consulta = data as unknown as PlexiConsultRow & {
    error_message: string | null;
    id_consult: string | null;
    status: string;
  };

  if (consulta.status === "success") {
    return { status: "success" as const, veiculoId: consulta.veiculo_id };
  }

  if (consulta.status === "error" && !consulta.id_consult) {
    return {
      error: consulta.error_message ?? "A consulta automática retornou erro.",
      status: "error" as const,
    };
  }

  if (!consulta.id_consult) {
    return { status: "processing" as const };
  }

  const token = process.env.PLEXI_API_TOKEN;

  if (!token) {
    return {
      error: "Configure PLEXI_API_TOKEN antes de consultar.",
      status: "error" as const,
    };
  }

  const response = await fetch(
    `${getPlexiBaseUrl()}/api/maestro/result/${consulta.id_consult}`,
    {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      method: "GET",
    }
  );

  const resultPayload = await parsePlexiResponse(response);

  if (response.status === 202) {
    await supabase
      .from("frota_debito_consultas")
      .update({
        response_payload: resultPayload ?? consulta.response_payload,
        status: "processing",
        updated_at: new Date().toISOString(),
      })
      .eq("id", consulta.id);

    return { status: "processing" as const };
  }

  if (!response.ok) {
    const message =
      response.status === 404
        ? "Resultado ainda não encontrado ou consulta expirada."
        : formatPlexiRequestError(response.status, resultPayload);

    const updatePayload: Record<string, unknown> = {
      error_message: message,
      status: response.status === 404 ? "processing" : "error",
      updated_at: new Date().toISOString(),
    };

    if (resultPayload) {
      updatePayload.response_payload = resultPayload;
    }

    await supabase.from("frota_debito_consultas").update(updatePayload).eq("id", consulta.id);

    if (response.status === 404) {
      return { status: "processing" as const };
    }

    if (consulta.veiculo_id) {
      await supabase
        .from("frota_veiculos")
        .update({ status: "consult_error" })
        .eq("id", consulta.veiculo_id);
    }

    return { error: message, status: "error" as const };
  }

  const payload = extractPlexiVehiclePayload(resultPayload);

  if (payload.error === true) {
    const message =
      extractPlexiMessage(resultPayload) ??
      "A Plexi retornou erro na consulta veicular.";

    await supabase
      .from("frota_debito_consultas")
      .update({
        error_message: message,
        response_payload: resultPayload,
        status: "error",
        updated_at: new Date().toISOString(),
      })
      .eq("id", consulta.id);

    if (consulta.veiculo_id) {
      await supabase
        .from("frota_veiculos")
        .update({ status: "consult_error" })
        .eq("id", consulta.veiculo_id);
    }

    return { error: message, status: "error" as const };
  }

  const result = await persistPlexiVehicleResponse(
    supabase,
    consulta.id,
    consulta.veiculo_id,
    consulta.prefeitura_id,
    payload,
    consulta.request_payload?.secretaria
  );

  return { status: "success" as const, veiculoId: result.veiculoId };
}

async function findReusablePlexiConsult(
  supabase: SupabaseServerClient,
  input: PlexiVehicleConsultInput
) {
  const { data, error } = await supabase
    .from("frota_debito_consultas")
    .select("id,status")
    .eq("provider", "plexi")
    .eq("license_plate", input.licensePlate)
    .eq("renavam", input.renavam)
    .in("status", ["pending", "processing"])
    .limit(1);

  if (error) {
    return { error: error.message, found: false };
  }

  return { found: Boolean(data?.length) };
}

async function markPlexiConsultAsError(
  supabase: SupabaseServerClient,
  consultaId: string,
  message: string
) {
  await supabase
    .from("frota_debito_consultas")
    .update({
      error_message: message,
      status: "error",
      updated_at: new Date().toISOString(),
    })
    .eq("id", consultaId);
}

async function persistPlexiDebts(
  supabase: SupabaseServerClient,
  consultaId: string,
  veiculoId: string,
  prefeituraId: string,
  payload: PlexiVehicleResponse
) {
  const debitos = [
    ...(payload.debitos ?? []).map((debito) => ({ ...debito, type: "debito" })),
    ...(payload.ipvaDividaAtiva ?? []).map((debito) => ({
      ...debito,
      type: "ipva_divida_ativa",
    })),
  ];

  await supabase
    .from("frota_debitos_veiculares")
    .delete()
    .eq("consulta_id", consultaId);

  if (!debitos.length) {
    return;
  }

  await supabase.from("frota_debitos_veiculares").insert(
    debitos.map((debito, index) => ({
      amount: debito.valorAtual ?? 0,
      consulta_id: consultaId,
      description: debito.numeroDetranNET ?? null,
      due_date: parsePlexiDateTime(debito.vencimento),
      expiration_date: parsePlexiDateTime(debito.vencimento),
      is_expired: isExpiredDate(debito.vencimento),
      prefeitura_id: prefeituraId,
      provider: "plexi",
      provider_debit_id:
        debito.numeroDetranNET ??
        `${debito.classe ?? "debito"}-${debito.exercicio ?? "sem-exercicio"}-${index}`,
      raw_payload: debito,
      required: true,
      title: debito.classe ?? "Débito veicular",
      type: debito.type,
      veiculo_id: veiculoId,
      year: debito.exercicio ?? null,
    }))
  );
}

async function createVehicleFromPlexiResponse(
  supabase: SupabaseServerClient,
  prefeituraId: string,
  secretaria: string | undefined,
  payload: PlexiVehicleResponse
) {
  const placa = payload.placa?.toUpperCase().replace(/[^A-Z0-9]/g, "");

  if (!placa) {
    throw new Error("A consulta não retornou a placa do veículo.");
  }

  const { data: existingVehicle, error: existingVehicleError } = await supabase
    .from("frota_veiculos")
    .select("id")
    .eq("prefeitura_id", prefeituraId)
    .eq("placa", placa)
    .maybeSingle();

  if (existingVehicleError) {
    throw new Error(existingVehicleError.message);
  }

  if (existingVehicle) {
    return existingVehicle.id as string;
  }

  const ano = toNumber(payload.anoModelo) ?? toNumber(payload.anoFabricacao);
  const { data, error } = await supabase
    .from("frota_veiculos")
    .insert({
      ano: ano ?? new Date().getFullYear(),
      ano_fabricacao: toNumber(payload.anoFabricacao),
      ano_modelo: toNumber(payload.anoModelo),
      carroceria: payload.carroceria ?? null,
      categoria: payload.categoria ?? null,
      combustivel: payload.combustivel ?? null,
      cor: payload.cor ?? null,
      data_aquisicao: parsePlexiDate(payload.dataAquisicao),
      especie: payload.especie ?? null,
      licenciado: payload.licenciado ?? null,
      lugares: payload.lugares ?? null,
      marca: payload.marca ?? "Não informado",
      modelo: payload.modelo ?? "Não informado",
      municipio_emplacamento: payload.municipioEmplacamento ?? null,
      origem_dados: "Consulta automática",
      placa,
      prefeitura_id: prefeituraId,
      principal_condutor: payload.principalCondutor ?? null,
      proprietario_anterior: payload.proprietarioAnterior ?? null,
      proprietario_atual: payload.proprietarioAtual ?? null,
      renavam: payload.renavam ?? null,
      restricao_venda: payload.restricaoVenda ?? null,
      restricoes: payload.restricoes ?? null,
      situacao_veicular: payload.situacao ?? null,
      status: "active",
      tipo: payload.tipo ?? "Automovel",
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Veículo não criado após a consulta.");
  }

  return data.id as string;
}

async function persistPlexiFines(
  supabase: SupabaseServerClient,
  consultaId: string,
  veiculoId: string,
  prefeituraId: string,
  payload: PlexiVehicleResponse
) {
  await supabase
    .from("frota_multas_veiculares")
    .delete()
    .eq("consulta_id", consultaId);

  const multas = [
    ...(payload.historicoMultas ?? []).map((multa) => ({
      ...multa,
      origem: "historico",
    })),
    ...(payload.multasPagar ?? []).map((multa) => ({
      ...multa,
      origem: "pagar",
    })),
  ];

  if (multas.length) {
    await supabase.from("frota_multas_veiculares").insert(
      multas.map((multa) => ({
        consulta_id: consultaId,
        data_infracao: parsePlexiDate(multa.data),
        descricao: multa.descricao ?? null,
        hora: multa.hora ?? null,
        local_complemento: multa.localComplemento ?? null,
        numero_auto: multa.numeroAuto ?? randomUUID(),
        origem: multa.origem,
        prefeitura_id: prefeituraId,
        raw_payload: multa,
        situacao: multa.situacao ?? null,
        valor: multa.valor ?? 0,
        veiculo_id: veiculoId,
      }))
    );
  }

  await supabase
    .from("frota_recursos_infracao")
    .delete()
    .eq("consulta_id", consultaId);

  if (payload.recursoInfracao?.length) {
    await supabase.from("frota_recursos_infracao").insert(
      payload.recursoInfracao.map((recurso) => ({
        consulta_id: consultaId,
        detalhamento_infracao: recurso.detalhamentoInfracao ?? null,
        numero_auto: recurso.numeroAuto ?? null,
        prefeitura_id: prefeituraId,
        processo: recurso.processo ?? null,
        resultado_processo: recurso.resultadoProcesso ?? null,
        raw_payload: recurso,
        veiculo_id: veiculoId,
      }))
    );
  }
}

async function persistPlexiProcesses(
  supabase: SupabaseServerClient,
  consultaId: string,
  veiculoId: string,
  prefeituraId: string,
  payload: PlexiVehicleResponse
) {
  await supabase
    .from("frota_processos_veiculares")
    .delete()
    .eq("consulta_id", consultaId);

  const processos = [
    ...(payload.processos ?? []),
    ...(payload.ultimoProcesso ? [payload.ultimoProcesso] : []),
  ];

  if (!processos.length) {
    return;
  }

  await supabase.from("frota_processos_veiculares").insert(
    processos.map((processo) => ({
      consulta_id: consultaId,
      final_em: processo.finalEm ?? null,
      inicio_em: processo.inicioEm ?? null,
      interessado: processo.interessado ?? null,
      prefeitura_id: prefeituraId,
      processo: processo.processo ?? null,
      raw_payload: processo,
      servicos: processo.servicos ?? [],
      situacao: processo.situacao ?? null,
      veiculo_id: veiculoId,
    }))
  );
}

function getPlexiBaseUrl() {
  return (process.env.PLEXI_BASE_URL ?? "https://api.plexi.com.br").replace(
    /\/$/,
    ""
  );
}

function getPlexiRequestId(response: PlexiConsultResponse) {
  return response.requestId ?? response.id ?? response.body?.requestId ?? response.body?.id ?? null;
}

function extractPlexiVehiclePayload(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return {} as PlexiVehicleResponse;
  }

  const record = payload as Record<string, unknown>;
  const normalizedPayload = (record.data ??
    record.result ??
    record.body ??
    payload) as PlexiVehicleResponse;

  return normalizedPayload;
}

async function parsePlexiResponse(response: Response) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { message: text };
  }
}

function formatPlexiRequestError(status: number, payload: unknown) {
  const message = extractPlexiMessage(payload);

  return message
    ? `Consulta automática recusada (${status}): ${message}`
    : `Consulta automática recusada pela API (${status}).`;
}

function extractPlexiMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const record = payload as Record<string, unknown>;
  const directMessage =
    record.message ?? record.mensagem ?? record.error ?? record.detail;

  if (typeof directMessage === "string") {
    return directMessage;
  }

  if (Array.isArray(record.errors) && record.errors.length) {
    return record.errors
      .map((error) =>
        typeof error === "string"
          ? error
          : typeof error === "object" && error
            ? extractPlexiMessage(error)
            : null
      )
      .filter(Boolean)
      .join(" | ");
  }

  if (record.errors && typeof record.errors === "object") {
    return Object.entries(record.errors as Record<string, unknown>)
      .map(([field, value]) => {
        if (Array.isArray(value)) {
          return `${field}: ${value.join(", ")}`;
        }

        return typeof value === "string" ? `${field}: ${value}` : null;
      })
      .filter(Boolean)
      .join(" | ");
  }

  return null;
}

function getPlexiCallbackUrl() {
  if (process.env.PLEXI_DISABLE_CALLBACK === "true") {
    return undefined;
  }

  const callbackUrl = normalizeUrl(process.env.PLEXI_CALLBACK_URL ?? "");

  if (!callbackUrl) {
    return undefined;
  }

  if (callbackUrl.includes("/api/plexi/vehicle-consults/webhook")) {
    return callbackUrl;
  }

  return `${callbackUrl}/api/plexi/vehicle-consults/webhook`;
}

function normalizeUrl(value: string) {
  const markdownMatch = value.match(/^\[(https?:\/\/[^\]]+)\]/);

  return (markdownMatch?.[1] ?? value).replace(/\/$/, "");
}

function parsePlexiDate(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

  if (!match) {
    return null;
  }

  const [, day, month, year] = match;
  return `${year}-${month}-${day}`;
}

function parsePlexiDateTime(value: string | null | undefined) {
  const date = parsePlexiDate(value);

  if (!date) {
    return null;
  }

  return `${date}T00:00:00.000Z`;
}

function isExpiredDate(value: string | null | undefined) {
  const date = parsePlexiDate(value);

  if (!date) {
    return false;
  }

  return new Date(`${date}T23:59:59.999Z`).getTime() < Date.now();
}

function toNumber(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}
