import { createSupabaseServerClient } from "@/lib/supabase-server";

export type LicencaStatus = "active" | "suspended" | "expired" | "cancelled";
export type LicencaVigenciaStatus = "active" | "expiring" | "expired";

export type Licenca = {
  id: string;
  prefeitura_id: string;
  modulo_id: string;
  status: LicencaStatus;
  inicio: string;
  fim: string;
  valor_anual: number | null;
  created_at: string;
  prefeitura_nome: string;
  prefeitura_cnpj: string;
  modulo_nome: string;
  modulo_subdominio: string;
  dias_restantes: number;
  vigencia_status: LicencaVigenciaStatus;
};

type LicencaRow = {
  id: string;
  prefeitura_id: string;
  modulo_id: string;
  status: LicencaStatus;
  inicio: string;
  fim: string;
  valor_anual: number | null;
  created_at: string;
  prefeituras: {
    nome: string;
    cnpj: string;
  } | null;
  modulos: {
    nome: string;
    subdominio: string;
  } | null;
};

export type LicencaPrefeituraOption = {
  id: string;
  nome: string;
  cnpj: string;
};

export type LicencaModuloOption = {
  id: string;
  nome: string;
  subdominio: string;
};

export async function getLicencas(params?: { query?: string; status?: string }) {
  const supabase = createSupabaseServerClient();
  let query = supabase
    .from("licencas")
    .select(
      "id,prefeitura_id,modulo_id,status,inicio,fim,valor_anual,created_at,prefeituras(nome,cnpj),modulos(nome,subdominio)"
    )
    .order("created_at", { ascending: false });

  if (params?.status && params.status !== "all") {
    query = query.eq("status", params.status);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const rows = ((data ?? []) as unknown as LicencaRow[]).map((licenca) => {
    const dias_restantes = getDaysUntil(licenca.fim);
    const vigencia_status: LicencaVigenciaStatus =
      dias_restantes < 0
        ? "expired"
        : dias_restantes <= 30
          ? "expiring"
          : "active";

    return {
      id: licenca.id,
      prefeitura_id: licenca.prefeitura_id,
      modulo_id: licenca.modulo_id,
      status: licenca.status,
      inicio: licenca.inicio,
      fim: licenca.fim,
      valor_anual: licenca.valor_anual,
      created_at: licenca.created_at,
      prefeitura_nome: licenca.prefeituras?.nome ?? "-",
      prefeitura_cnpj: licenca.prefeituras?.cnpj ?? "-",
      modulo_nome: licenca.modulos?.nome ?? "-",
      modulo_subdominio: licenca.modulos?.subdominio ?? "-",
      dias_restantes,
      vigencia_status,
    };
  });

  if (!params?.query) {
    return rows;
  }

  const normalizedQuery = params.query.toLowerCase();
  return rows.filter((licenca) =>
    [
      licenca.prefeitura_nome,
      licenca.prefeitura_cnpj,
      licenca.modulo_nome,
      licenca.modulo_subdominio,
    ]
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery)
  );
}

export async function getLicencaFormOptions() {
  const supabase = createSupabaseServerClient();
  const [prefeiturasResult, modulosResult] = await Promise.all([
    supabase
      .from("prefeituras")
      .select("id,nome,cnpj")
      .eq("status", "active")
      .order("nome"),
    supabase
      .from("modulos")
      .select("id,nome,subdominio")
      .eq("ativo", true)
      .order("nome"),
  ]);

  if (prefeiturasResult.error) {
    throw new Error(prefeiturasResult.error.message);
  }

  if (modulosResult.error) {
    throw new Error(modulosResult.error.message);
  }

  return {
    prefeituras: (prefeiturasResult.data ?? []) as LicencaPrefeituraOption[],
    modulos: (modulosResult.data ?? []) as LicencaModuloOption[],
  };
}

export function formatLicencaStatus(status: LicencaStatus) {
  const labels: Record<LicencaStatus, string> = {
    active: "Ativa",
    suspended: "Suspensa",
    expired: "Vencida",
    cancelled: "Cancelada",
  };

  return labels[status];
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00.000Z`));
}

export function formatCurrency(value: number | null) {
  if (value === null) {
    return "-";
  }

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatDaysRemaining(days: number) {
  if (days < 0) {
    return `Vencida há ${Math.abs(days)} dia(s)`;
  }

  if (days === 0) {
    return "Vence hoje";
  }

  return `Vence em ${days} dia(s)`;
}

function getDaysUntil(value: string) {
  const today = new Date();
  const todayUtc = Date.UTC(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
  const [year, month, day] = value.split("-").map(Number);
  const targetUtc = Date.UTC(year, month - 1, day);

  return Math.ceil((targetUtc - todayUtc) / 86_400_000);
}
