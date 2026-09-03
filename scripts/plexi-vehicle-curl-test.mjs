import { execFileSync } from "node:child_process";

const disableCallback =
  process.argv.includes("--no-callback") ||
  process.env.PLEXI_DISABLE_CALLBACK === "true";

const placa = cleanPlate(process.env.PLEXI_TEST_PLACA);
const renavam = onlyDigits(process.env.PLEXI_TEST_RENAVAM ?? "");
const secretName = process.env.PLEXI_SECRET_NAME ?? process.env.PLEXI_CERTIFICATE_NAME;
const baseUrl = normalizeUrl(process.env.PLEXI_BASE_URL ?? "https://api.plexi.com.br");
const token = process.env.PLEXI_API_TOKEN;
const endpoint = `${baseUrl}/api/maestro/detran-sc/veiculos/consulta-completa-veiculo`;
const callbackUrl = disableCallback ? undefined : getPlexiCallbackUrl();

if (!token) {
  exitWithError("PLEXI_API_TOKEN não configurado no .env.local.");
}

if (!placa) {
  exitWithError("PLEXI_TEST_PLACA não configurado.");
}

if (!renavam) {
  exitWithError("PLEXI_TEST_RENAVAM não configurado.");
}

if (!secretName) {
  exitWithError("PLEXI_SECRET_NAME ou PLEXI_CERTIFICATE_NAME não configurado.");
}

const body = JSON.stringify({
  placa,
  renavam,
  secretName,
});

const args = [
  "--silent",
  "--show-error",
  "--include",
  "--request",
  "POST",
  "--url",
  endpoint,
  "--header",
  "Accept: application/json",
  "--header",
  "Content-Type: application/json",
  "--header",
  `Authorization: Bearer ${token}`,
  "--data",
  body,
];

if (callbackUrl) {
  args.push("--header", `Callback: ${callbackUrl}`);
}

console.log(
  JSON.stringify(
    {
      aviso: "Esta chamada usa curl.exe e inicia uma consulta real se a API aceitar.",
      body: {
        placa,
        renavam,
        secretName,
      },
      callback: callbackUrl ?? null,
      endpoint,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: "[omitido]",
        ...(callbackUrl ? { Callback: callbackUrl } : {}),
      },
    },
    null,
    2
  )
);

const output = execFileSync("curl.exe", args, {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
});

console.log(output.trim());

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
