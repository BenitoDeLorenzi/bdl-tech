const baseUrl = normalizeUrl(
  process.env.ZAPCAR_BASE_URL ?? "https://api.zapcarconsulta.com.br"
);
const token = process.env.ZAPCAR_API_TOKEN;
const showJson = process.argv.includes("--json");

if (!token) {
  exitWithError("ZAPCAR_API_TOKEN não configurado.");
}

const checks = [
  { label: "Serviços e preços", path: "/v1/servicos" },
  { label: "Saldo", path: "/v1/saldo" },
];

const results = [];

for (const check of checks) {
  const response = await fetch(`${baseUrl}${check.path}`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    method: "GET",
  });
  const body = await parseResponse(response);

  results.push({
    body,
    label: check.label,
    path: check.path,
    status: response.status,
  });
}

console.table(
  results.map((result) => ({
    consulta: result.label,
    http: result.status,
    resumo: summarize(result.body),
  }))
);

if (showJson) {
  console.log(JSON.stringify(results.map(sanitizeResult), null, 2));
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

function summarize(body) {
  if (!body || typeof body !== "object") {
    return "Resposta vazia ou não JSON";
  }

  if (Array.isArray(body.servicos)) {
    return `${body.servicos.length} serviço(s) disponível(is)`;
  }

  if (body.saldo !== undefined) {
    return `Saldo: R$ ${body.saldo}`;
  }

  if (body.message) {
    return body.message;
  }

  if (body.erro) {
    return body.erro;
  }

  if (body.error) {
    return body.error;
  }

  return "Resposta recebida";
}

function sanitizeResult(result) {
  return {
    ...result,
    body: sanitizeValue(result.body),
  };
}

function sanitizeValue(value) {
  if (!value || typeof value !== "object") {
    return value;
  }

  const clone = structuredClone(value);

  for (const key of ["token", "api_key", "authorization"]) {
    if (clone[key]) {
      clone[key] = "[omitido]";
    }
  }

  return clone;
}

function normalizeUrl(value) {
  const markdownMatch = value.match(/^\[(https?:\/\/[^\]]+)\]/);
  return (markdownMatch?.[1] ?? value).replace(/\/$/, "");
}

function exitWithError(message) {
  console.error(message);
  process.exit(1);
}
