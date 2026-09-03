import { getFrotasData } from "@/lib/frotas-data";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export type SecretariaStatus = "active" | "inactive";

export type FrotaSecretaria = {
  created_at: string;
  id: string;
  nome: string;
  prefeitura_id: string;
  prefeitura_nome: string;
  status: SecretariaStatus;
  total_veiculos: number;
};

type SecretariaRow = {
  created_at: string;
  id: string;
  nome: string;
  prefeitura_id: string;
  prefeituras: {
    nome: string;
  } | null;
  status: SecretariaStatus;
};

type VeiculoSecretariaRow = {
  prefeitura_id: string;
  secretaria: string;
};

export async function getSecretariasData(params?: {
  prefeituraId?: string;
  query?: string;
  status?: string;
}) {
  const supabase = createSupabaseServerClient();
  const frotasData = await getFrotasData({
    prefeituraId: params?.prefeituraId,
  });
  const selectedPrefeituraId =
    params?.prefeituraId ?? frotasData.selectedPrefeituraId;

  let secretariasQuery = supabase
    .from("frota_secretarias")
    .select("id,prefeitura_id,nome,status,created_at,prefeituras(nome)")
    .order("nome", { ascending: true });

  let veiculosQuery = supabase
    .from("frota_veiculos")
    .select("prefeitura_id,secretaria");

  if (selectedPrefeituraId) {
    secretariasQuery = secretariasQuery.eq("prefeitura_id", selectedPrefeituraId);
    veiculosQuery = veiculosQuery.eq("prefeitura_id", selectedPrefeituraId);
  }

  if (params?.status && params.status !== "all") {
    secretariasQuery = secretariasQuery.eq("status", params.status);
  }

  const [secretariasResult, veiculosResult] = await Promise.all([
    secretariasQuery,
    veiculosQuery,
  ]);

  if (secretariasResult.error) {
    if (isMissingSecretariasTableError(secretariasResult.error.message)) {
      return {
        metricas: { ativas: 0, inativas: 0, total: 0 },
        prefeituras: frotasData.prefeituras,
        secretarias: [],
        selectedPrefeituraId,
      };
    }

    throw new Error(secretariasResult.error.message);
  }

  const veiculos = veiculosResult.error
    ? []
    : ((veiculosResult.data ?? []) as VeiculoSecretariaRow[]);
  const vehicleCountBySecretaria = new Map<string, number>();

  veiculos.forEach((veiculo) => {
    const key = buildSecretariaKey(veiculo.prefeitura_id, veiculo.secretaria);
    vehicleCountBySecretaria.set(
      key,
      (vehicleCountBySecretaria.get(key) ?? 0) + 1
    );
  });

  let secretarias = ((secretariasResult.data ?? []) as unknown as SecretariaRow[]).map(
    (secretaria) => ({
      created_at: secretaria.created_at,
      id: secretaria.id,
      nome: secretaria.nome,
      prefeitura_id: secretaria.prefeitura_id,
      prefeitura_nome: secretaria.prefeituras?.nome ?? "-",
      status: secretaria.status,
      total_veiculos:
        vehicleCountBySecretaria.get(
          buildSecretariaKey(secretaria.prefeitura_id, secretaria.nome)
        ) ?? 0,
    })
  );

  if (params?.query) {
    const normalizedQuery = normalizeSearch(params.query);
    secretarias = secretarias.filter((secretaria) =>
      normalizeSearch(
        [secretaria.nome, secretaria.prefeitura_nome].join(" ")
      ).includes(normalizedQuery)
    );
  }

  return {
    metricas: {
      ativas: secretarias.filter((secretaria) => secretaria.status === "active").length,
      inativas: secretarias.filter((secretaria) => secretaria.status === "inactive").length,
      total: secretarias.length,
    },
    prefeituras: frotasData.prefeituras,
    secretarias,
    selectedPrefeituraId,
  };
}

export async function getSecretariaOptions(prefeituraId?: string) {
  if (!prefeituraId) {
    return [];
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("frota_secretarias")
    .select("id,prefeitura_id,nome,status,prefeituras(nome)")
    .eq("prefeitura_id", prefeituraId)
    .eq("status", "active")
    .order("nome", { ascending: true });

  if (error) {
    if (isMissingSecretariasTableError(error.message)) {
      return [];
    }

    throw new Error(error.message);
  }

  return ((data ?? []) as unknown as Array<
    Pick<FrotaSecretaria, "id" | "nome" | "prefeitura_id" | "status"> & {
      prefeituras: { nome: string } | null;
    }
  >).map((secretaria) => ({
    id: secretaria.id,
    nome: secretaria.nome,
    prefeitura_id: secretaria.prefeitura_id,
    prefeitura_nome: secretaria.prefeituras?.nome ?? "-",
    status: secretaria.status,
  }));
}

export function formatSecretariaStatus(status: SecretariaStatus) {
  return status === "active" ? "Ativa" : "Inativa";
}

function buildSecretariaKey(prefeituraId: string, secretaria: string) {
  return `${prefeituraId}:${normalizeSearch(secretaria.trim())}`;
}

function isMissingSecretariasTableError(message: string) {
  return message.includes("frota_secretarias");
}

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
