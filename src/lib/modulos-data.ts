import { createSupabaseServerClient } from "@/lib/supabase-server";

export type Modulo = {
  ativo: boolean;
  clientes_ativos: number;
  created_at: string;
  id: string;
  licencas_totais: number;
  nome: string;
  receita_anual: number;
  slug: string;
  subdominio: string;
};

type ModuloRow = {
  ativo: boolean;
  created_at: string;
  id: string;
  licencas: Array<{
    status: string;
    valor_anual: number | null;
  }> | null;
  nome: string;
  slug: string;
  subdominio: string;
};

export async function getModulos(params?: { query?: string; status?: string }) {
  const supabase = createSupabaseServerClient();
  let query = supabase
    .from("modulos")
    .select("id,nome,slug,subdominio,ativo,created_at,licencas(status,valor_anual)")
    .order("created_at", { ascending: false });

  if (params?.query) {
    query = query.or(
      `nome.ilike.%${params.query}%,slug.ilike.%${params.query}%,subdominio.ilike.%${params.query}%`
    );
  }

  if (params?.status === "active") {
    query = query.eq("ativo", true);
  }

  if (params?.status === "inactive") {
    query = query.eq("ativo", false);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as unknown as ModuloRow[]).map((modulo) => {
    const activeLicencas = (modulo.licencas ?? []).filter(
      (licenca) => licenca.status === "active"
    );

    return {
      ativo: modulo.ativo,
      clientes_ativos: activeLicencas.length,
      created_at: modulo.created_at,
      id: modulo.id,
      licencas_totais: modulo.licencas?.length ?? 0,
      nome: modulo.nome,
      receita_anual: activeLicencas.reduce(
        (total, licenca) => total + Number(licenca.valor_anual ?? 0),
        0
      ),
      slug: modulo.slug,
      subdominio: modulo.subdominio,
    };
  });
}

export function formatModuloStatus(ativo: boolean) {
  return ativo ? "Ativo" : "Inativo";
}

export function formatModuloCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}
