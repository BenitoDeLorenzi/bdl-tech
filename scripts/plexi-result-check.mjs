const requestId = process.argv[2];
const baseUrl = normalizeUrl(process.env.PLEXI_BASE_URL ?? "https://api.plexi.com.br");
const token = process.env.PLEXI_API_TOKEN;

if (!requestId) {
  exitWithError(
    "Informe o requestId. Ex: node --env-file=.env.local scripts/plexi-result-check.mjs a29a65be-04a0-4f4a-8139-4bdfef638ce4"
  );
}

if (!token) {
  exitWithError("PLEXI_API_TOKEN não configurado no .env.local.");
}

const response = await fetch(`${baseUrl}/api/maestro/result/${requestId}`, {
  headers: {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  method: "GET",
});
const body = await parseResponse(response);

console.log(
  JSON.stringify(
    {
      ok: response.ok,
      requestId,
      response: body,
      status: response.status,
    },
    null,
    2
  )
);

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

function normalizeUrl(value) {
  const markdownMatch = value.match(/^\[(https?:\/\/[^\]]+)\]/);
  return (markdownMatch?.[1] ?? value).replace(/\/$/, "");
}

function exitWithError(message) {
  console.error(message);
  process.exit(1);
}
