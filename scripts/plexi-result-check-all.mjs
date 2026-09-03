const defaultRequestIds = [
  { label: "SAB secret-only", requestId: "a29a7297-6fb9-4b86-8cb7-7274988d29d3" },
  {
    label: "SAB query certificate + secret + inline",
    requestId: "a29a72bf-bc4b-4a62-9ab5-2e85ea45537d",
  },
  {
    label: "SAB secret + cpfCnpj",
    requestId: "a29a72db-0f2d-4b5c-b546-92db9b547ae5",
  },
  { label: "RXV secret-only", requestId: "a29a775c-cc3a-4b0d-9b3a-b690c19514f1" },
  {
    label: "RXV query certificate + secret + inline",
    requestId: "a29a7766-3a47-420a-ad8a-1ead41c8888d",
  },
  {
    label: "RXV secret + cpfCnpj",
    requestId: "a29a776d-2952-4a69-8f09-c8d21c6a645b",
  },
  { label: "QPI secret-only", requestId: "a29a7e78-7404-4906-8ed1-9d296ccdce5a" },
  {
    label: "QPI secret + cpfCnpj",
    requestId: "a29a7e86-bd0f-48f1-81c0-2d7773677af2",
  },
  {
    label: "QPI secret + cpfCnpj sem callback",
    requestId: "a29a7fe9-d956-47b9-ae51-fe308f2d5619",
  },
  {
    label: "RXV secret-only atual",
    requestId: "a29acb85-e75f-4ab2-8e2e-3e126bfb3501",
  },
];

const idsFromArgs = process.argv.slice(2);
const showJson = idsFromArgs.includes("--json");
const watch = idsFromArgs.includes("--watch");
const intervalArg = idsFromArgs.find((value) => value.startsWith("--interval="));
const intervalSeconds = Number(intervalArg?.replace("--interval=", "") ?? 10);
const requestIdArgs = idsFromArgs.filter(
  (value) =>
    value !== "--json" &&
    value !== "--watch" &&
    !value.startsWith("--interval=")
);
const idsFromEnv = (process.env.PLEXI_RESULT_IDS ?? "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const requestIds = requestIdArgs.length
  ? requestIdArgs.map((requestId) => ({ label: requestId, requestId }))
  : idsFromEnv.length
    ? idsFromEnv.map((requestId) => ({ label: requestId, requestId }))
    : defaultRequestIds;

const baseUrl = normalizeUrl(process.env.PLEXI_BASE_URL ?? "https://api.plexi.com.br");
const token = process.env.PLEXI_API_TOKEN;

if (!token) {
  exitWithError("PLEXI_API_TOKEN não configurado no .env.local.");
}

if (watch && !Number.isFinite(intervalSeconds)) {
  exitWithError("Intervalo inválido. Ex: --interval=30");
}

await runMonitor();

if (watch) {
  const intervalMs = Math.max(intervalSeconds, 5) * 1000;

  setInterval(runMonitor, intervalMs);
}

async function runMonitor() {
  const results = [];

  for (const item of requestIds) {
    results.push(await checkResult(item));
  }

  console.clear();
  console.log(`Plexi monitor - ${new Date().toLocaleString("pt-BR")}`);
  console.log(
    watch
      ? `Atualizando a cada ${Math.max(intervalSeconds, 5)}s. Pressione Ctrl+C para parar.`
      : "Consulta única."
  );
  console.table(
    results.map((result) => ({
      label: result.label,
      ok: result.ok,
      requestId: result.requestId,
      status: result.status,
      resumo: result.summary,
    }))
  );

  if (showJson) {
    console.log(JSON.stringify(results, null, 2));
  }
}

async function checkResult(item) {
  try {
    const response = await fetch(`${baseUrl}/api/maestro/result/${item.requestId}`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      method: "GET",
    });
    const body = await parseResponse(response);

    return {
      label: item.label,
      ok: response.ok,
      requestId: item.requestId,
      response: body,
      status: response.status,
      summary: summarize(response.status, body),
    };
  } catch (error) {
    return {
      label: item.label,
      ok: false,
      requestId: item.requestId,
      response: null,
      status: "network_error",
      summary: error instanceof Error ? error.message : "Erro inesperado.",
    };
  }
}

async function parseResponse(response) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function summarize(status, body) {
  if (status === 202) {
    return "Processando";
  }

  if (status === 520) {
    return "Falha interna Plexi/consulta";
  }

  if (status === 404) {
    return "Resultado não encontrado";
  }

  if (body && typeof body === "object") {
    if (body.error === true) {
      return body.message ?? "Erro retornado pela Plexi";
    }

    if (body.placa || body.renavam || body.marca || body.modelo) {
      return "Dados do veículo disponíveis";
    }
  }

  return status >= 200 && status < 300 ? "Resposta recebida" : "Erro";
}

function normalizeUrl(value) {
  const markdownMatch = value.match(/^\[(https?:\/\/[^\]]+)\]/);
  return (markdownMatch?.[1] ?? value).replace(/\/$/, "");
}

function exitWithError(message) {
  console.error(message);
  process.exit(1);
}
