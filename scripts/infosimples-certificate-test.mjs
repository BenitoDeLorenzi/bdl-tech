import { readFile } from "node:fs/promises";
import { stdin as input, stdout as output } from "node:process";
import { createCipheriv, pbkdf2Sync, randomBytes } from "node:crypto";

const baseUrl = normalizeUrl(
  process.env.INFOSIMPLES_BASE_URL ?? "https://api.infosimples.com"
);
const token = process.env.INFOSIMPLES_TOKEN;
const encryptionKey = process.env.INFOSIMPLES_ENCRYPTION_KEY;
const certPath = process.env.INFOSIMPLES_CERT_PFX_PATH;
const showJson = process.argv.includes("--json");

if (!token) {
  exitWithError("INFOSIMPLES_TOKEN não configurado.");
}

if (!encryptionKey) {
  exitWithError("INFOSIMPLES_ENCRYPTION_KEY não configurado.");
}

if (!certPath) {
  exitWithError("INFOSIMPLES_CERT_PFX_PATH não configurado.");
}

const certPassword =
  process.env.INFOSIMPLES_CERT_PASSWORD ??
  (await promptHidden("Senha do certificado PFX: "));

if (!certPassword) {
  exitWithError("Senha do certificado PFX não informada.");
}

const cert = await readFile(certPath);
const certBase64 = cert.toString("base64");
const encryptedCert = toUrlSafeBase64(encryptAesBridgeGcm(certBase64, encryptionKey));
const encryptedCertPassword = toUrlSafeBase64(
  encryptAesBridgeGcm(certPassword, encryptionKey)
);
const body = new URLSearchParams({
  pkcs12_cert: encryptedCert,
  pkcs12_pass: encryptedCertPassword,
  token,
});
const endpoint = `${baseUrl}/api/v2/consultas/infosimples/certificado`;

console.log(
  JSON.stringify(
    {
      aviso: "Esta chamada valida o envio do certificado na InfoSimples.",
      bodyPreview: {
        pkcs12_cert: `[criptografado omitido: ${encryptedCert.length} chars]`,
        pkcs12_pass: "[omitido]",
        token: "[omitido]",
      },
      endpoint,
      service: "infosimples/certificado",
    },
    null,
    2
  )
);

const response = await fetch(endpoint, {
  body,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/x-www-form-urlencoded",
  },
  method: "POST",
});
const responseBody = await parseResponse(response);

console.table([summarizeResponse(response.status, responseBody)]);

if (showJson) {
  console.log(JSON.stringify(sanitizeResponse(responseBody), null, 2));
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

function summarizeResponse(status, body) {
  if (!body || typeof body !== "object") {
    return {
      billable: "-",
      code: "-",
      data_count: "-",
      http: status,
      mensagem: "Resposta vazia ou não JSON",
      price: "-",
    };
  }

  return {
    billable: body.header?.billable ?? "-",
    code: body.code ?? "-",
    data_count: body.data_count ?? "-",
    http: status,
    mensagem: body.code_message ?? body.mensagem_codigo ?? body.message ?? "-",
    price: body.header?.price ?? "-",
  };
}

function sanitizeResponse(value) {
  if (!value || typeof value !== "object") {
    return value;
  }

  const clone = structuredClone(value);

  if (clone.header?.parameters) {
    for (const key of ["pkcs12_cert", "pkcs12_pass", "token"]) {
      if (clone.header.parameters[key]) {
        clone.header.parameters[key] = "[omitido]";
      }
    }
  }

  return clone;
}

function encryptAesBridgeGcm(value, passphrase) {
  const salt = randomBytes(16);
  const nonce = randomBytes(12);
  const key = pbkdf2Sync(passphrase, salt, 100000, 32, "sha256");
  const cipher = createCipheriv("aes-256-gcm", key, nonce);
  const ciphertext = Buffer.concat([
    cipher.update(Buffer.from(value, "utf8")),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([salt, nonce, ciphertext, tag]).toString("base64");
}

function toUrlSafeBase64(value) {
  return value.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function promptHidden(question) {
  if (!input.isTTY) {
    return "";
  }

  output.write(question);
  input.setRawMode(true);

  let value = "";

  return await new Promise((resolve) => {
    const onData = (chunk) => {
      const char = chunk.toString("utf8");

      if (char === "\u0003") {
        input.setRawMode(false);
        output.write("\n");
        process.exit(130);
      }

      if (char === "\r" || char === "\n") {
        input.off("data", onData);
        input.setRawMode(false);
        output.write("\n");
        resolve(value);
        return;
      }

      if (char === "\u007f" || char === "\b") {
        value = value.slice(0, -1);
        return;
      }

      value += char;
    };

    input.on("data", onData);
  });
}

function normalizeUrl(value) {
  const markdownMatch = value.match(/^\[(https?:\/\/[^\]]+)\]/);
  return (markdownMatch?.[1] ?? value).replace(/\/$/, "");
}

function exitWithError(message) {
  console.error(message);
  process.exit(1);
}
