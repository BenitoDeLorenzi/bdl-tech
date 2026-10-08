import { createSupabaseServerClient } from "@/lib/supabase-server";

export type LicencaStatus = "active" | "suspended" | "expired" | "cancelled";
export type LicencaVigenciaStatus = "active" | "expiring" | "expired";
export type LicencaPagamentoStatus = "open" | "paid" | "overdue" | "cancelled";

export type LicencaPagamento = {
  competencia: string;
  created_at: string;
  documento: string | null;
  forma_pagamento: string | null;
  id: string;
  licenca_id: string;
  modulo_id: string;
  numero_parcela: number;
  observacoes: string | null;
  pago_em: string | null;
  prefeitura_id: string;
  status: LicencaPagamentoStatus;
  valor: number;
  valor_pago: number | null;
  vencimento: string;
};

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
  pagamentos: LicencaPagamento[];
  parcelas_abertas: number;
  parcelas_pagas: number;
  parcelas_vencidas: number;
  valor_mensal: number | null;
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
      "id,prefeitura_id,modulo_id,status,inicio,fim,valor_anual,created_at,prefeituras:empresas(nome,cnpj),modulos(nome,subdominio)"
    )
    .order("created_at", { ascending: false });

  if (params?.status && params.status !== "all") {
    query = query.eq("status", params.status);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const baseRows = (data ?? []) as unknown as LicencaRow[];
  const pagamentosMap = await getLicencaPagamentosMap(
    baseRows.map((licenca) => licenca.id)
  );

  const rows = baseRows.map((licenca) => {
    const dias_restantes = getDaysUntil(licenca.fim);
    const vigencia_status: LicencaVigenciaStatus =
      dias_restantes < 0
        ? "expired"
        : dias_restantes <= 30
          ? "expiring"
          : "active";
    const pagamentos = pagamentosMap.get(licenca.id) ?? [];

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
      pagamentos,
      parcelas_abertas: pagamentos.filter((pagamento) => pagamento.status === "open")
        .length,
      parcelas_pagas: pagamentos.filter((pagamento) => pagamento.status === "paid")
        .length,
      parcelas_vencidas: pagamentos.filter(
        (pagamento) => pagamento.status === "overdue"
      ).length,
      valor_mensal:
        licenca.valor_anual === null ? null : Math.round((licenca.valor_anual / 12) * 100) / 100,
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

async function getLicencaPagamentosMap(licencaIds: string[]) {
  const pagamentosMap = new Map<string, LicencaPagamento[]>();

  if (!licencaIds.length) {
    return pagamentosMap;
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("licenca_pagamentos")
    .select(
      "id,licenca_id,prefeitura_id,modulo_id,numero_parcela,competencia,vencimento,valor,status,pago_em,valor_pago,forma_pagamento,documento,observacoes,created_at"
    )
    .in("licenca_id", licencaIds)
    .order("numero_parcela", { ascending: true });

  if (error) {
    if (isMissingLicencaPagamentosTableError(error.message)) {
      return pagamentosMap;
    }

    throw new Error(error.message);
  }

  const today = getTodayIsoDate();

  ((data ?? []) as LicencaPagamento[]).forEach((pagamento) => {
    const normalizedPagamento = {
      ...pagamento,
      status:
        pagamento.status === "open" && pagamento.vencimento < today
          ? "overdue"
          : pagamento.status,
    } satisfies LicencaPagamento;
    const current = pagamentosMap.get(pagamento.licenca_id) ?? [];
    current.push(normalizedPagamento);
    pagamentosMap.set(pagamento.licenca_id, current);
  });

  return pagamentosMap;
}

export async function getLicencaFormOptions() {
  const supabase = createSupabaseServerClient();
  const [prefeiturasResult, modulosResult] = await Promise.all([
    supabase
      .from("empresas")
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

export function formatLicencaPagamentoStatus(status: LicencaPagamentoStatus) {
  const labels: Record<LicencaPagamentoStatus, string> = {
    cancelled: "Cancelada",
    open: "Aberta",
    overdue: "Vencida",
    paid: "Paga",
  };

  return labels[status];
}

function isMissingLicencaPagamentosTableError(message: string) {
  return (
    message.includes("licenca_pagamentos") &&
    (message.includes("does not exist") ||
      message.includes("Could not find the table") ||
      message.includes("schema cache"))
  );
}

function getTodayIsoDate() {
  const parts = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
    year: "numeric",
  }).formatToParts(new Date());
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const year = parts.find((part) => part.type === "year")?.value ?? "1970";

  return `${year}-${month}-${day}`;
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
