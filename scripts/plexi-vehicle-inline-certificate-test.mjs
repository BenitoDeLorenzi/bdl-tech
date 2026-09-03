import { readFile } from "node:fs/promises";

const mode = process.argv[2] ?? "certificate-pfx";
const dryRun = process.argv.includes("--dry-run");
const disableCallback =
  process.argv.includes("--no-callback") ||
  process.env.PLEXI_DISABLE_CALLBACK === "true";
const placa = cleanPlate(process.env.PLEXI_TEST_PLACA);
const renavam = onlyDigits(process.env.PLEXI_TEST_RENAVAM ?? "");
const secretName = process.env.PLEXI_SECRET_NAME ?? process.env.PLEXI_CERTIFICATE_NAME;
const baseUrl = normalizeUrl(process.env.PLEXI_BASE_URL ?? "https://api.plexi.com.br");
const token = process.env.PLEXI_API_TOKEN;
const pfxPath = process.env.PLEXI_CERT_PFX_PATH;
const password = process.env.PLEXI_CERT_PASSWORD;
const cpfCnpj = process.env.PLEXI_TEST_CPF_CNPJ;
const modesWithPfx = new Set([
  "certificate-pfx",
  "certificate-with-secret",
  "query-certificate-with-secret-and-inline",
  "certificado-arquivo",
  "certificado-with-secret",
]);
const modesWithSecretName = new Set([
  "secret-only",
  "query-certificate",
  "query-certificate-with-secret",
  "query-secret-name",
  "query-secret-name-with-secret",
  "header-certificate-with-secret",
  "header-secret-name-with-secret",
  "secret-with-cpf-cnpj",
  "certificate-with-secret",
  "query-certificate-with-secret-and-inline",
  "certificado-with-secret",
]);

const modes = {
  "no-secret": () => ({
    body: {
      placa,
      renavam,
    },
  }),
  "secret-only": () => ({
    body: {
      placa,
      renavam,
      secretName,
    },
  }),
  "placa-secret-only": () => ({
    body: {
      placa,
      secretName,
    },
  }),
  "query-certificate": () => ({
    body: {
      placa,
      renavam,
    },
    certificateQuery: secretName,
  }),
  "query-certificate-with-secret": () => ({
    body: {
      placa,
      renavam,
      secretName,
    },
    certificateQuery: secretName,
  }),
  "query-secret-name": () => ({
    body: {
      placa,
      renavam,
    },
    secretNameQuery: secretName,
  }),
  "query-secret-name-with-secret": () => ({
    body: {
      placa,
      renavam,
      secretName,
    },
    secretNameQuery: secretName,
  }),
  "header-certificate-with-secret": () => ({
    body: {
      placa,
      renavam,
      secretName,
    },
    certificateHeader: secretName,
  }),
  "header-secret-name-with-secret": () => ({
    body: {
      placa,
      renavam,
      secretName,
    },
    secretNameHeader: secretName,
  }),
  "secret-with-cpf-cnpj": () => ({
    body: {
      cpfCnpj,
      placa,
      renavam,
      secretName,
    },
  }),
  "certificate-pfx": ({ pfx }) => ({
    body: {
      certificate: {
        password,
        pfx,
      },
      placa,
      renavam,
    },
  }),
  "certificate-with-secret": ({ pfx }) => ({
    body: {
      certificate: {
        password,
        pfx,
      },
      placa,
      renavam,
      secretName,
    },
  }),
  "query-certificate-with-secret-and-inline": ({ pfx }) => ({
    body: {
      certificate: {
        password,
        pfx,
      },
      placa,
      renavam,
      secretName,
    },
    certificateQuery: secretName,
  }),
  "certificado-arquivo": ({ pfx }) => ({
    body: {
      certificado: {
        arquivo: pfx,
        senha: password,
      },
      placa,
      renavam,
    },
  }),
  "certificado-with-secret": ({ pfx }) => ({
    body: {
      certificado: {
        arquivo: pfx,
        senha: password,
      },
      placa,
      renavam,
      secretName,
    },
  }),
};

if (!modes[mode]) {
  exitWithError(
    `Modo inválido. Use um destes: ${Object.keys(modes).join(", ")}`
  );
}

if (!token) {
  exitWithError("PLEXI_API_TOKEN não configurado no .env.local.");
}

if (!placa) {
  exitWithError("PLEXI_TEST_PLACA não configurado.");
}

if (!renavam) {
  exitWithError("PLEXI_TEST_RENAVAM não configurado.");
}

if (modesWithSecretName.has(mode) && !secretName) {
  exitWithError("PLEXI_SECRET_NAME ou PLEXI_CERTIFICATE_NAME não configurado.");
}

if (modesWithPfx.has(mode) && !pfxPath) {
  exitWithError("PLEXI_CERT_PFX_PATH não configurado.");
}

if (modesWithPfx.has(mode) && !password) {
  exitWithError("PLEXI_CERT_PASSWORD não configurado.");
}

const pfx = modesWithPfx.has(mode)
  ? (await readFile(pfxPath)).toString("base64")
  : undefined;
const testPayload = modes[mode]({ pfx });
const body = testPayload.body;
const endpoint = new URL(
  `${baseUrl}/api/maestro/detran-sc/veiculos/consulta-completa-veiculo`
);

if (testPayload.certificateQuery) {
  endpoint.searchParams.set("certificate", testPayload.certificateQuery);
}

if (testPayload.secretNameQuery) {
  endpoint.searchParams.set("secretName", testPayload.secretNameQuery);
}

const headers = {
  Accept: "application/json",
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
};
const callbackUrl = disableCallback ? undefined : getPlexiCallbackUrl();

if (callbackUrl) {
  headers.Callback = callbackUrl;
}

if (testPayload.certificateHeader) {
  headers.Certificate = testPayload.certificateHeader;
}

if (testPayload.secretNameHeader) {
  headers.secretName = testPayload.secretNameHeader;
}

console.log(
  JSON.stringify(
    {
      aviso:
        dryRun
          ? "Dry run: nenhuma consulta será criada."
          : "Esta chamada inicia uma consulta real se a API aceitar a requisição.",
      observacao:
        "Consultas feitas por este script não ficam vinculadas ao banco do app. Se o callback chegar, o webhook responderá not_found. Para testar atualização automática do veículo, crie a consulta pelo cadastro automático do app.",
      bodyPreview: sanitize(body),
      callback: callbackUrl ?? null,
      callbackDebug: debugUrl(callbackUrl),
      callbackDisabled: disableCallback,
      endpoint: sanitizeEndpoint(endpoint),
      endpointDebug: debugUrl(endpoint.toString()),
      headerPreview: sanitizeHeaders(headers),
      mode,
    },
    null,
    2
  )
);

if (dryRun) {
  process.exit(0);
}

const response = await fetch(
  endpoint,
  {
    body: JSON.stringify(body),
    headers,
    method: "POST",
  }
);
const responseBody = await parseResponse(response);

console.log(
  JSON.stringify(
    {
      ok: response.ok,
      response: responseBody,
      status: response.status,
    },
    null,
    2
  )
);

function getPlexiCallbackUrl() {
  const value = normalizeUrl(process.env.PLEXI_CALLBACK_URL ?? "");

  if (!value) {
    return undefined;
  }

  if (value.includes("/api/plexi/vehicle-consults/webhook")) {
    return value;
  }

  return `${value}/api/plexi/vehicle-consults/webhook`;
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

function sanitize(value) {
  const clone = structuredClone(value);

  if (clone.certificate?.pfx) {
    clone.certificate.pfx = `[base64 omitido: ${value.certificate.pfx.length} chars]`;
  }

  if (clone.certificate?.password) {
    clone.certificate.password = "[omitido]";
  }

  if (clone.certificado?.arquivo) {
    clone.certificado.arquivo = `[base64 omitido: ${value.certificado.arquivo.length} chars]`;
  }

  if (clone.certificado?.senha) {
    clone.certificado.senha = "[omitido]";
  }

  return clone;
}

function sanitizeEndpoint(value) {
  const url = new URL(value);

  if (url.searchParams.has("certificate")) {
    url.searchParams.set("certificate", "[omitido]");
  }

  if (url.searchParams.has("secretName")) {
    url.searchParams.set("secretName", "[omitido]");
  }

  return url.toString();
}

function sanitizeHeaders(value) {
  return Object.fromEntries(
    Object.entries(value).map(([key, headerValue]) => [
      key,
      ["authorization", "certificate", "secretname"].includes(key.toLowerCase())
        ? "[omitido]"
        : headerValue,
    ])
  );
}

function debugUrl(value) {
  if (!value) {
    return {
      hasMarkdownSyntax: false,
      isHttpUrl: false,
    };
  }

  return {
    hasMarkdownSyntax: /[\[\]\(\)]/.test(value),
    isHttpUrl: /^https?:\/\/[^\s\[\]\(\)]+$/.test(value),
    length: value.length,
    previewWithoutProtocol: value.replace(/^https?:\/\//, ""),
  };
}

function normalizeUrl(value) {
  const markdownMatch = value.match(/^\[(https?:\/\/[^\]]+)\]/);
  return (markdownMatch?.[1] ?? value).replace(/\/$/, "");
}

function cleanPlate(value) {
  return value?.toUpperCase().replace(/[^A-Z0-9]/g, "") ?? "";
}

function onlyDigits(value) {
  return value.replace(/\D/g, "");
}

function exitWithError(message) {
  console.error(message);
  process.exit(1);
}
