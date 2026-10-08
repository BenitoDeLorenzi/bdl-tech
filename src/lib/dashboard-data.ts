import { createSupabaseServerClient } from "@/lib/supabase-server";

export type PrefeituraResumo = {
  nome: string;
  cnpj: string;
  modulos: string[];
  usuarios: number;
  status: string;
  vencimento: string;
};

export type ModuloResumo = {
  nome: string;
  subdominio: string;
  clientes: number;
  status: string;
};

export type DashboardMetric = {
  label: string;
  valor: string;
  detalhe: string;
};

export type DashboardData = {
  prefeituras: PrefeituraResumo[];
  modulos: ModuloResumo[];
  metricas: DashboardMetric[];
  usingFallback: boolean;
};

type PrefeituraRow = {
  id: string;
  nome: string;
  cnpj: string;
  status: string;
};

type ModuloRow = {
  id: string;
  nome: string;
  subdominio: string;
  ativo: boolean;
};

type LicencaRow = {
  prefeitura_id: string;
  modulo_id: string;
  status: string;
  fim: string;
  valor_anual: number | null;
};

type PerfilRow = {
  prefeitura_id: string | null;
};

const fallbackPrefeituras: PrefeituraResumo[] = [
  {
    nome: "Empresa de Santa Helena",
    cnpj: "12.345.678/0001-90",
    modulos: ["Vibe Frotas"],
    usuarios: 8,
    status: "Ativa",
    vencimento: "14/08/2027",
  },
  {
    nome: "Empresa de Nova Esperança",
    cnpj: "23.456.789/0001-01",
    modulos: ["Vibe Frotas", "Contratos"],
    usuarios: 12,
    status: "Ativa",
    vencimento: "30/11/2027",
  },
  {
    nome: "Empresa de Lago Verde",
    cnpj: "34.567.890/0001-12",
    modulos: ["Vibe Frotas"],
    usuarios: 5,
    status: "Ativa",
    vencimento: "05/02/2027",
  },
];

const fallbackModulos: ModuloResumo[] = [
  {
    nome: "Vibe Frotas",
    subdominio: "frotaspublicas.bdltech.com.br",
    clientes: 3,
    status: "Disponível",
  },
  {
    nome: "Contratos",
    subdominio: "contratos.bdltech.com.br",
    clientes: 1,
    status: "Planejado",
  },
  {
    nome: "Patrimônio",
    subdominio: "patrimonio.bdltech.com.br",
    clientes: 0,
    status: "Futuro",
  },
];

export async function getDashboardData(): Promise<DashboardData> {
  let supabase: ReturnType<typeof createSupabaseServerClient>;

  try {
    supabase = createSupabaseServerClient();
  } catch {
    return buildFallbackData();
  }

  const [
    prefeiturasResult,
    modulosResult,
    licencasResult,
    perfisResult,
  ] = await Promise.all([
    supabase.from("empresas").select("id,nome,cnpj,status").order("nome"),
    supabase.from("modulos").select("id,nome,subdominio,ativo").order("nome"),
    supabase
      .from("licencas")
      .select("prefeitura_id,modulo_id,status,fim,valor_anual"),
    supabase.from("perfis").select("prefeitura_id"),
  ]);

  if (
    prefeiturasResult.error ||
    modulosResult.error ||
    licencasResult.error ||
    perfisResult.error
  ) {
    return buildFallbackData();
  }

  const prefeituras = (prefeiturasResult.data ?? []) as PrefeituraRow[];
  const modulos = (modulosResult.data ?? []) as ModuloRow[];
  const licencas = (licencasResult.data ?? []) as LicencaRow[];
  const perfis = (perfisResult.data ?? []) as PerfilRow[];

  if (prefeituras.length === 0 && modulos.length === 0) {
    return buildFallbackData();
  }

  const modulosById = new Map(modulos.map((modulo) => [modulo.id, modulo]));
  const usuariosPorPrefeitura = countBy(perfis, (perfil) => perfil.prefeitura_id);
  const licencasPorModulo = countBy(licencas, (licenca) => licenca.modulo_id);

  const prefeiturasResumo = prefeituras.map((prefeitura) => {
    const licencasDaPrefeitura = licencas.filter(
      (licenca) => licenca.prefeitura_id === prefeitura.id
    );

    return {
      nome: prefeitura.nome,
      cnpj: prefeitura.cnpj,
      modulos: licencasDaPrefeitura
        .map((licenca) => modulosById.get(licenca.modulo_id)?.nome)
        .filter((nome): nome is string => Boolean(nome)),
      usuarios: usuariosPorPrefeitura.get(prefeitura.id) ?? 0,
      status: formatStatus(prefeitura.status),
      vencimento: getLatestExpiration(licencasDaPrefeitura),
    };
  });

  const modulosResumo = modulos.map((modulo) => ({
    nome: modulo.nome,
    subdominio: modulo.subdominio,
    clientes: licencasPorModulo.get(modulo.id) ?? 0,
    status: modulo.ativo ? "Disponível" : "Inativo",
  }));

  return {
    prefeituras: prefeiturasResumo,
    modulos: modulosResumo,
    metricas: buildMetrics(prefeiturasResumo, modulosResumo, licencas),
    usingFallback: false,
  };
}

function buildFallbackData(): DashboardData {
  return {
    prefeituras: fallbackPrefeituras,
    modulos: fallbackModulos,
    metricas: buildMetrics(fallbackPrefeituras, fallbackModulos, []),
    usingFallback: true,
  };
}

function buildMetrics(
  prefeituras: PrefeituraResumo[],
  modulos: ModuloResumo[],
  licencas: LicencaRow[]
): DashboardMetric[] {
  const usuarios = prefeituras.reduce(
    (total, prefeitura) => total + prefeitura.usuarios,
    0
  );
  const receita = licencas.reduce(
    (total, licenca) => total + Number(licenca.valor_anual ?? 0),
    0
  );

  return [
    {
      label: "Empresas",
      valor: String(prefeituras.length),
      detalhe: `${prefeituras.filter((item) => item.status === "Ativa").length} ativas`,
    },
    {
      label: "Licenças anuais",
      valor: String(licencas.length || prefeituras.length + 1),
      detalhe: "Validade anual por módulo",
    },
    {
      label: "Usuários das empresas",
      valor: String(usuarios),
      detalhe: "Vinculados por empresa",
    },
    {
      label: "Receita prevista",
      valor: formatCurrency(receita),
      detalhe: modulos.length ? `${modulos.length} módulos cadastrados` : "Aguardando precificação",
    },
  ];
}

function countBy<T>(items: T[], getKey: (item: T) => string | null) {
  const counts = new Map<string, number>();

  for (const item of items) {
    const key = getKey(item);
    if (!key) {
      continue;
    }

    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return counts;
}

function getLatestExpiration(licencas: LicencaRow[]) {
  const latest = licencas
    .map((licenca) => licenca.fim)
    .sort()
    .at(-1);

  if (!latest) {
    return "-";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
  }).format(new Date(`${latest}T00:00:00.000Z`));
}

function formatStatus(status: string) {
  const labels: Record<string, string> = {
    active: "Ativa",
    implementation: "Ativa",
    suspended: "Suspensa",
    expired: "Vencida",
    cancelled: "Cancelada",
  };

  return labels[status] ?? status;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}
