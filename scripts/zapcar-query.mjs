const baseUrl = normalizeUrl(
  process.env.ZAPCAR_BASE_URL ?? "https://api.zapcarconsulta.com.br"
);
const token = process.env.ZAPCAR_API_TOKEN;
const service = process.env.ZAPCAR_SERVICE ?? "debitos-estadual";
const placa = cleanPlate(process.env.ZAPCAR_TEST_PLACA);
const uf = (process.env.ZAPCAR_TEST_UF ?? "SC").toUpperCase();
const renavam = onlyDigits(process.env.ZAPCAR_TEST_RENAVAM ?? "");
const documento = onlyDigits(process.env.ZAPCAR_TEST_DOCUMENTO ?? "");
const chassi = cleanText(process.env.ZAPCAR_TEST_CHASSI ?? "");
const showJson = process.argv.includes("--json");

if (!token) {
  exitWithError("ZAPCAR_API_TOKEN não configurado.");
}

if (!service) {
  exitWithError("ZAPCAR_SERVICE não configurado.");
}

if (!placa && !chassi) {
  exitWithError("ZAPCAR_TEST_PLACA não configurado.");
}

const payload = buildPayload();

console.log(
  JSON.stringify(
    {
      aviso: "Esta chamada pode executar uma consulta real na ZapCar.",
      endpoint: `${baseUrl}/v1/consultas`,
      payloadPreview: {
        ...payload,
        cpf: payload.cpf ? maskDocument(payload.cpf) : undefined,
        documento: payload.documento ? maskDocument(payload.documento) : undefined,
      },
    },
    null,
    2
  )
);

const response = await fetch(`${baseUrl}/v1/consultas`, {
  body: JSON.stringify(payload),
  headers: {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  method: "POST",
});
const body = await parseResponse(response);

console.table([
  {
    http: response.status,
    id: body?.id ?? "-",
    servico: body?.servico ?? service,
    status: body?.status ?? "-",
    valor: body?.valor_cobrado ?? body?.valor ?? "-",
    resumo: summarize(body),
  },
]);

if (showJson) {
  console.log(JSON.stringify(sanitizeResponse(body), null, 2));
}

function buildPayload() {
  const payload = { servico: service };

  if (placa) {
    payload.placa = placa;
  }

  if (service === "debitos-estadual") {
    payload.uf = uf;
    payload.renavam = renavam;
  }

  if (service === "consulta-completa") {
    if (uf) {
      payload.uf = uf;
    }
    if (renavam) {
      payload.renavam = renavam;
    }
  }

  if (service === "crlv") {
    payload.uf = uf;
    if (renavam) {
      payload.renavam = renavam;
    }
    if (documento) {
      payload.cpf = documento;
    }
  }

  if (service === "codigo-seguranca") {
    payload.renavam = renavam;
  }

  if (service === "decodificacao-chassi") {
    payload.chassi = chassi;
    delete payload.placa;
  }

  if (documento && !payload.cpf) {
    payload.documento = documento;
  }

  return payload;
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

  if (body.status) {
    return `Consulta ${body.status}`;
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

function sanitizeResponse(value) {
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

function cleanPlate(value) {
  return value?.toUpperCase().replace(/[^A-Z0-9]/g, "") ?? "";
}

function cleanText(value) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function onlyDigits(value) {
  return value.replace(/\D/g, "");
}

function maskDocument(value) {
  return value.length > 4 ? `${value.slice(0, 3)}******${value.slice(-2)}` : "[omitido]";
}

function exitWithError(message) {
  console.error(message);
  process.exit(1);
}
