import { readFile } from "node:fs/promises";

const command = process.argv[2];
const organizationCnpj = onlyDigits(
  process.env.PLEXI_ORGANIZATION_CNPJ ?? "43.696.373/0001-51"
);
const certificateName = process.env.PLEXI_CERTIFICATE_NAME ?? "bdl-tech";
const baseUrl = normalizeUrl(process.env.PLEXI_BASE_URL ?? "https://api.plexi.com.br");
const token = process.env.PLEXI_API_TOKEN;

if (!token) {
  exitWithError("PLEXI_API_TOKEN não configurado no .env.local.");
}

if (!organizationCnpj) {
  exitWithError("PLEXI_ORGANIZATION_CNPJ não configurado.");
}

if (command === "list") {
  await listCertificates();
} else if (command === "detail") {
  await detailCertificate();
} else if (command === "register") {
  await registerCertificate();
} else if (command === "delete") {
  await deleteCertificate();
} else {
  exitWithError(
    "Use: node --env-file=.env.local scripts/plexi-certificate.mjs list|detail|register|delete"
  );
}

async function listCertificates() {
  const response = await fetch(
    `${baseUrl}/api/organizations/${organizationCnpj}/certificates`,
    { headers: getHeaders() }
  );
  const body = await parseResponse(response);

  if (!response.ok) {
    exitWithError(formatError("Erro ao listar certificados", response.status, body));
  }

  console.log(JSON.stringify(body, null, 2));
}

async function detailCertificate() {
  const response = await fetch(
    `${baseUrl}/api/organizations/${organizationCnpj}/certificates/${encodeURIComponent(certificateName)}`,
    { headers: getHeaders() }
  );
  const body = await parseResponse(response);

  if (!response.ok) {
    exitWithError(formatError("Erro ao consultar certificado", response.status, body));
  }

  console.log(JSON.stringify(sanitizeCertificateResponse(body), null, 2));
}

async function registerCertificate() {
  const pfxPath = process.env.PLEXI_CERT_PFX_PATH;
  const password = process.env.PLEXI_CERT_PASSWORD;
  const metadata =
    process.env.PLEXI_CERTIFICATE_METADATA ??
    "Certificado BDL Tech para consultas Detran SC";

  if (!pfxPath) {
    exitWithError("PLEXI_CERT_PFX_PATH não configurado.");
  }

  if (!password) {
    exitWithError("PLEXI_CERT_PASSWORD não configurado.");
  }

  const pfx = await readFile(pfxPath);
  const response = await fetch(
    `${baseUrl}/api/organizations/${organizationCnpj}/certificates`,
    {
      body: JSON.stringify({
        certificate: {
          password,
          pfx: pfx.toString("base64"),
        },
        metadata,
        name: certificateName,
      }),
      headers: getHeaders(),
      method: "POST",
    }
  );
  const body = await parseResponse(response);

  if (!response.ok) {
    exitWithError(formatError("Erro ao cadastrar certificado", response.status, body));
  }

  console.log(
    JSON.stringify(
      {
        certificate: sanitizeCertificateResponse(body),
        message: "Certificado cadastrado com sucesso.",
        name: certificateName,
        organizationCnpj: maskCnpj(organizationCnpj),
      },
      null,
      2
    )
  );
}

async function deleteCertificate() {
  const response = await fetch(
    `${baseUrl}/api/organizations/${organizationCnpj}/certificates/${encodeURIComponent(certificateName)}`,
    {
      headers: getHeaders(),
      method: "DELETE",
    }
  );
  const body = await parseResponse(response);

  if (!response.ok) {
    exitWithError(formatError("Erro ao remover certificado", response.status, body));
  }

  console.log(
    JSON.stringify(
      {
        certificate: sanitizeCertificateResponse(body),
        message: "Certificado removido com sucesso.",
        name: certificateName,
        organizationCnpj: maskCnpj(organizationCnpj),
      },
      null,
      2
    )
  );
}

function getHeaders() {
  return {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
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

function formatError(prefix, status, body) {
  return `${prefix} (${status}): ${JSON.stringify(body)}`;
}

function normalizeUrl(value) {
  const markdownMatch = value.match(/^\[(https?:\/\/[^\]]+)\]/);
  return (markdownMatch?.[1] ?? value).replace(/\/$/, "");
}

function onlyDigits(value) {
  return value.replace(/\D/g, "");
}

function sanitizeCertificateResponse(value) {
  if (!value || typeof value !== "object") {
    return value;
  }

  const clone = structuredClone(value);

  if (clone.certificate?.pfx) {
    clone.certificate.pfx = "[omitido]";
  }

  if (clone.certificate?.key) {
    clone.certificate.key = "[omitido]";
  }

  if (clone.certificate?.cert) {
    clone.certificate.cert = "[omitido]";
  }

  return clone;
}

function maskCnpj(value) {
  return `${value.slice(0, 2)}********${value.slice(-2)}`;
}

function exitWithError(message) {
  console.error(message);
  process.exit(1);
}
