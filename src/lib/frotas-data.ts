import { createSupabaseServerClient } from "@/lib/supabase-server";

export type VeiculoStatus = "active" | "maintenance" | "inactive";
export type VencimentoStatus = "pending" | "paid" | "expired";
export type VencimentoTipo = "seguro" | "ipva" | "licenciamento";
export type PagamentoStatus = "pending" | "partial" | "paid";
export type AbastecimentoStatus =
  | "issued"
  | "completed"
  | "cancelled"
  | "expired";

export type FrotaPrefeituraOption = {
  brasao_url: string | null;
  id: string;
  nome: string;
};

export type FrotaPostoCredenciado = {
  cnpj: string | null;
  created_at?: string;
  endereco: string | null;
  id: string;
  nome: string;
  prefeitura_id: string;
  prefeitura_nome?: string;
  status: "active" | "inactive";
  telefone: string | null;
};

export type FrotaVeiculo = {
  anexos: FrotaVeiculoAnexo[];
  ano: number;
  created_at: string;
  id: string;
  marca: string;
  modelo: string;
  observacoes: string | null;
  placa: string;
  prefeitura_id: string;
  prefeitura_nome: string;
  prefixo: string;
  quilometragem: number | null;
  renavam: string | null;
  secretaria: string;
  status: VeiculoStatus;
  tipo: string;
  versao: string | null;
  combustivel: string | null;
  foto_path: string | null;
  foto_url: string | null;
  manutencoes: FrotaVeiculoManutencao[];
  vencimentos: Partial<Record<VencimentoTipo, string>>;
};

export type FrotaVencimento = {
  ano: number | null;
  data_vencimento: string;
  dias_restantes: number;
  id: string;
  marca: string;
  modelo: string;
  placa: string;
  prefixo: string;
  prefeitura_id: string;
  proximo_vencimento_pago: string | null;
  status: VencimentoStatus;
  tipo: VencimentoTipo;
  total_pagamentos: number;
  ultimo_pagamento: string | null;
  ultimo_pagamento_status: PagamentoStatus | null;
  ultimo_pagamento_valor: number | null;
  veiculo_id: string;
};

export type FrotaDebitoVeicular = {
  amount: number;
  created_at: string;
  description: string | null;
  due_date: string | null;
  expiration_date: string | null;
  id: string;
  is_expired: boolean;
  required: boolean;
  title: string | null;
  type: string | null;
  year: number | null;
};

export type FrotaDebitoConsulta = {
  client_request_id: string;
  created_at: string;
  error_message: string | null;
  id: string;
  id_consult: string | null;
  status: "pending" | "processing" | "success" | "error" | "disabled";
};

export type FrotaAbastecimento = {
  anexos: FrotaAbastecimentoAnexo[];
  ano: number | null;
  arla_incluso: boolean;
  arla_litros: number | null;
  arla_valor_litro: number | null;
  arla_valor_total: number | null;
  completed_at: string | null;
  combustivel: string;
  created_at: string;
  data_abastecimento: string;
  consumo_medio_km_l: number | null;
  cancelled_at: string | null;
  concluido_por: string | null;
  emitido_por: string | null;
  expires_at: string | null;
  fornecedor: string | null;
  id: string;
  litros: number | null;
  marca: string;
  modelo: string;
  motorista: string;
  motivo_cancelamento: string | null;
  numero_ordem: string;
  numero_nota_fiscal: string | null;
  observacoes: string | null;
  placa: string;
  posto_id: string | null;
  posto_nome: string | null;
  prefeitura_id: string;
  prefeitura_brasao_url: string | null;
  prefeitura_nome: string;
  print_count: number;
  last_printed_at: string | null;
  quilometragem: number | null;
  renavam: string | null;
  secretaria: string;
  status: AbastecimentoStatus;
  valor_litro: number | null;
  valor_total: number | null;
  veiculo_id: string;
};

export type ManutencaoStatus = "open" | "completed" | "cancelled";

export type FrotaAnexo = {
  created_at?: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  file_type: string | null;
  id: string;
  signed_url?: string | null;
};

export type FrotaVeiculoAnexo = FrotaAnexo;
export type FrotaManutencaoAnexo = FrotaAnexo;
export type FrotaAbastecimentoAnexo = FrotaAnexo;

export type FrotaManutencao = {
  anexos: FrotaManutencaoAnexo[];
  created_at: string;
  data_entrada: string;
  data_saida: string | null;
  descricao: string;
  id: string;
  marca: string;
  modelo: string;
  observacoes: string | null;
  oficina: string | null;
  placa: string;
  prefeitura_id: string;
  quilometragem: number | null;
  responsavel: string | null;
  status: ManutencaoStatus;
  tipo: string;
  valor: number | null;
  veiculo_id: string;
};

export type FrotaVeiculoManutencao = Pick<
  FrotaManutencao,
  | "created_at"
  | "data_entrada"
  | "data_saida"
  | "descricao"
  | "id"
  | "observacoes"
  | "oficina"
  | "quilometragem"
  | "responsavel"
  | "status"
  | "tipo"
  | "valor"
  | "veiculo_id"
>;

type VeiculoRow = Omit<FrotaVeiculo, "prefeitura_nome"> & {
  prefeituras: {
    nome: string;
  } | null;
};

type VencimentoRow = {
  data_vencimento: string;
  id: string;
  status: VencimentoStatus;
  tipo: VencimentoTipo;
  veiculo_id: string;
  frota_veiculos: {
    ano: number;
    marca: string;
    modelo: string;
    placa: string;
    prefeitura_id: string;
    prefixo: string;
  } | null;
};

type PagamentoRow = {
  data_pagamento: string;
  proximo_vencimento: string;
  status: PagamentoStatus | null;
  valor_total: number | null;
  vencimento_id: string;
};

type ManutencaoRow = Omit<FrotaManutencao, "anexos" | "marca" | "modelo" | "placa"> & {
  frota_veiculos: {
    marca: string;
    modelo: string;
    placa: string;
  } | null;
};

type AbastecimentoRow = Omit<
  FrotaAbastecimento,
  | "ano"
  | "marca"
  | "modelo"
  | "placa"
  | "prefeitura_brasao_url"
  | "prefeitura_nome"
  | "renavam"
  | "secretaria"
> & {
  frota_veiculos: {
    ano: number;
    marca: string;
    modelo: string;
    placa: string;
    renavam: string | null;
    secretaria: string;
    prefeituras: {
      brasao_url: string | null;
      nome: string;
    } | null;
  } | null;
  frota_postos_credenciados: {
    nome: string;
  } | null;
};

type AbastecimentoAnexoRow = FrotaAbastecimentoAnexo & {
  abastecimento_id: string;
};

export async function getFrotasData(params?: {
  prefeituraId?: string;
  query?: string;
  status?: string;
  veiculoId?: string;
  vencimentoStatus?: string;
  vencimentoTipo?: string;
}) {
  const supabase = createSupabaseServerClient();
  const prefeituraOptionsResult = await supabase
    .from("prefeituras")
    .select("id,nome,brasao_url")
    .eq("status", "active")
    .order("nome");

  if (prefeituraOptionsResult.error) {
    throw new Error(prefeituraOptionsResult.error.message);
  }

  const prefeituras = (prefeituraOptionsResult.data ?? []) as FrotaPrefeituraOption[];
  const selectedPrefeituraId = params?.prefeituraId ?? prefeituras[0]?.id;

  let veiculosQuery = supabase
    .from("frota_veiculos")
    .select(
      "id,prefeitura_id,placa,prefixo,marca,modelo,ano,tipo,versao,combustivel,secretaria,quilometragem,renavam,status,observacoes,foto_url,foto_path,created_at,prefeituras(nome)"
    )
    .order("created_at", { ascending: false });

  let vencimentosQuery = supabase
    .from("frota_vencimentos")
    .select("id,veiculo_id,tipo,data_vencimento,status,frota_veiculos(prefeitura_id,placa,prefixo,marca,modelo,ano)")
    .order("data_vencimento", { ascending: true });

  if (selectedPrefeituraId && !params?.veiculoId) {
    veiculosQuery = veiculosQuery.eq("prefeitura_id", selectedPrefeituraId);
    vencimentosQuery = vencimentosQuery.eq("prefeitura_id", selectedPrefeituraId);
  }

  if (params?.veiculoId) {
    veiculosQuery = veiculosQuery.eq("id", params.veiculoId);
    vencimentosQuery = vencimentosQuery.eq("veiculo_id", params.veiculoId);
  }

  if (params?.status && params.status !== "all") {
    veiculosQuery = veiculosQuery.eq("status", params.status);
  }

  const [veiculosResult, vencimentosResult] = await Promise.all([
    veiculosQuery,
    vencimentosQuery,
  ]);

  if (veiculosResult.error) {
    if (isMissingFrotasTableError(veiculosResult.error.message)) {
      return emptyFrotasData(prefeituras, selectedPrefeituraId);
    }

    throw new Error(veiculosResult.error.message);
  }

  if (vencimentosResult.error) {
    if (isMissingFrotasTableError(vencimentosResult.error.message)) {
      return emptyFrotasData(prefeituras, selectedPrefeituraId);
    }

    throw new Error(vencimentosResult.error.message);
  }

  const vencimentoDatesByVeiculo = new Map<
    string,
    Partial<Record<VencimentoTipo, string>>
  >();
  ((vencimentosResult.data ?? []) as unknown as VencimentoRow[]).forEach(
    (vencimento) => {
      const current = vencimentoDatesByVeiculo.get(vencimento.veiculo_id) ?? {};
      current[vencimento.tipo] = vencimento.data_vencimento;
      vencimentoDatesByVeiculo.set(vencimento.veiculo_id, current);
    }
  );

  const vencimentoIds = ((vencimentosResult.data ?? []) as unknown as VencimentoRow[]).map(
    (vencimento) => vencimento.id
  );
  const pagamentosByVencimento = new Map<
    string,
    {
      proximo_vencimento_pago: string | null;
      total_pagamentos: number;
      ultimo_pagamento: string | null;
      ultimo_pagamento_status: PagamentoStatus | null;
      ultimo_pagamento_valor: number | null;
    }
  >();

  if (vencimentoIds.length) {
    const pagamentosResult = await supabase
      .from("frota_vencimento_pagamentos")
      .select("vencimento_id,data_pagamento,proximo_vencimento,valor_total,status")
      .in("vencimento_id", vencimentoIds)
      .order("data_pagamento", { ascending: false });

    if (!pagamentosResult.error) {
      ((pagamentosResult.data ?? []) as unknown as PagamentoRow[]).forEach(
        (pagamento) => {
          const current = pagamentosByVencimento.get(pagamento.vencimento_id);

          pagamentosByVencimento.set(pagamento.vencimento_id, {
            proximo_vencimento_pago:
              current?.proximo_vencimento_pago ?? pagamento.proximo_vencimento,
            total_pagamentos: (current?.total_pagamentos ?? 0) + 1,
            ultimo_pagamento:
              current?.ultimo_pagamento ?? pagamento.data_pagamento,
            ultimo_pagamento_status:
              current?.ultimo_pagamento_status ?? pagamento.status,
            ultimo_pagamento_valor:
              current?.ultimo_pagamento_valor ?? pagamento.valor_total,
          });
        }
      );
    }
  }

  const veiculoIds = ((veiculosResult.data ?? []) as unknown as VeiculoRow[]).map(
    (veiculo) => veiculo.id
  );
  const anexosByVeiculo = new Map<string, FrotaVeiculoAnexo[]>();
  const manutencoesByVeiculo = new Map<string, FrotaVeiculoManutencao[]>();

  if (veiculoIds.length) {
    const [anexosResult, manutencoesResult] = await Promise.all([
      supabase
        .from("frota_veiculo_anexos")
        .select("id,veiculo_id,file_name,file_path,file_type,file_size,created_at")
        .in("veiculo_id", veiculoIds)
        .order("created_at", { ascending: false }),
      supabase
        .from("frota_manutencoes")
        .select(
          "id,veiculo_id,tipo,descricao,oficina,responsavel,data_entrada,data_saida,valor,quilometragem,status,observacoes,created_at"
        )
        .in("veiculo_id", veiculoIds)
        .order("data_entrada", { ascending: false })
        .order("created_at", { ascending: false }),
    ]);

    if (!anexosResult.error) {
      const anexos = await withSignedUrls(
        supabase,
        "frota-veiculo-anexos",
        (anexosResult.data ?? []) as Array<
          FrotaVeiculoAnexo & { veiculo_id: string }
        >
      );

      anexos.forEach((anexo) => {
        const current = anexosByVeiculo.get(anexo.veiculo_id) ?? [];
        current.push({
          created_at: anexo.created_at,
          file_name: anexo.file_name,
          file_path: anexo.file_path,
          file_size: anexo.file_size,
          file_type: anexo.file_type,
          id: anexo.id,
          signed_url: anexo.signed_url,
        });
        anexosByVeiculo.set(anexo.veiculo_id, current);
      });
    }

    if (!manutencoesResult.error) {
      (
        (manutencoesResult.data ?? []) as FrotaVeiculoManutencao[]
      ).forEach((manutencao) => {
        const current = manutencoesByVeiculo.get(manutencao.veiculo_id) ?? [];
        current.push(manutencao);
        manutencoesByVeiculo.set(manutencao.veiculo_id, current);
      });
    }
  }

  let veiculos = ((veiculosResult.data ?? []) as unknown as VeiculoRow[]).map(
    (veiculo) => ({
      anexos: anexosByVeiculo.get(veiculo.id) ?? [],
      ano: veiculo.ano,
      created_at: veiculo.created_at,
      id: veiculo.id,
      marca: veiculo.marca,
      modelo: veiculo.modelo,
      observacoes: veiculo.observacoes,
      placa: veiculo.placa,
      prefeitura_id: veiculo.prefeitura_id,
      prefeitura_nome: veiculo.prefeituras?.nome ?? "-",
      prefixo: veiculo.prefixo,
      quilometragem: veiculo.quilometragem,
      renavam: veiculo.renavam,
      secretaria: veiculo.secretaria,
      status: veiculo.status,
      tipo: veiculo.tipo,
      versao: veiculo.versao,
      combustivel: veiculo.combustivel,
      foto_path: veiculo.foto_path,
      foto_url: veiculo.foto_url,
      manutencoes: manutencoesByVeiculo.get(veiculo.id) ?? [],
      vencimentos: vencimentoDatesByVeiculo.get(veiculo.id) ?? {},
    })
  );

  if (params?.query) {
    const normalizedQuery = params.query.toLowerCase();
    veiculos = veiculos.filter((veiculo) =>
      [
        veiculo.placa,
        veiculo.prefixo,
        veiculo.marca,
        veiculo.modelo,
        veiculo.tipo,
        veiculo.versao,
        veiculo.combustivel,
        veiculo.secretaria,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery)
    );
  }

  const vencimentos = ((vencimentosResult.data ?? []) as unknown as VencimentoRow[])
    .map((vencimento) => ({
      ano: vencimento.frota_veiculos?.ano ?? null,
      data_vencimento: vencimento.data_vencimento,
      dias_restantes: getDaysUntil(vencimento.data_vencimento),
      id: vencimento.id,
      marca: vencimento.frota_veiculos?.marca ?? "-",
      modelo: vencimento.frota_veiculos?.modelo ?? "-",
      placa: vencimento.frota_veiculos?.placa ?? "-",
      prefeitura_id: vencimento.frota_veiculos?.prefeitura_id ?? "",
      prefixo: vencimento.frota_veiculos?.prefixo ?? "-",
      proximo_vencimento_pago:
        pagamentosByVencimento.get(vencimento.id)?.proximo_vencimento_pago ??
        null,
      status: vencimento.status,
      tipo: vencimento.tipo,
      total_pagamentos:
        pagamentosByVencimento.get(vencimento.id)?.total_pagamentos ?? 0,
      ultimo_pagamento:
        pagamentosByVencimento.get(vencimento.id)?.ultimo_pagamento ?? null,
      ultimo_pagamento_status:
        pagamentosByVencimento.get(vencimento.id)?.ultimo_pagamento_status ??
        null,
      ultimo_pagamento_valor:
        pagamentosByVencimento.get(vencimento.id)?.ultimo_pagamento_valor ??
        null,
      veiculo_id: vencimento.veiculo_id,
    }))
    .filter((vencimento) =>
      params?.vencimentoStatus === "paid"
        ? vencimento.total_pagamentos > 0
        : vencimento.status !== "paid"
    )
    .filter((vencimento) =>
      params?.vencimentoTipo && params.vencimentoTipo !== "all"
        ? vencimento.tipo === params.vencimentoTipo
        : true
    )
    .filter((vencimento) => {
      if (!params?.vencimentoStatus || params.vencimentoStatus === "all") {
        return true;
      }

      if (params.vencimentoStatus === "expired") {
        return vencimento.dias_restantes < 0 && vencimento.status !== "paid";
      }

      if (params.vencimentoStatus === "due-soon") {
        return (
          vencimento.dias_restantes >= 0 &&
          vencimento.dias_restantes <= 30 &&
          vencimento.status !== "paid"
        );
      }

      return true;
    });

  return {
    metricas: {
      ativos: veiculos.filter((veiculo) => veiculo.status === "active").length,
      emManutencao: veiculos.filter((veiculo) => veiculo.status === "maintenance").length,
      total: veiculos.length,
      vencidos: vencimentos.filter((vencimento) => vencimento.dias_restantes < 0).length,
      vencendo: vencimentos.filter(
        (vencimento) =>
          vencimento.dias_restantes >= 0 && vencimento.dias_restantes <= 30
      ).length,
    },
    prefeituras,
    selectedPrefeituraId,
    veiculos,
    vencimentos,
  };
}

export async function getVeiculoDebitosData(veiculoId: string) {
  const supabase = createSupabaseServerClient();
  const consultasResult = await supabase
    .from("frota_debito_consultas")
    .select("id,client_request_id,id_consult,status,error_message,created_at")
    .eq("veiculo_id", veiculoId)
    .order("created_at", { ascending: false })
    .limit(5);

  if (consultasResult.error) {
    if (isMissingFrotasTableError(consultasResult.error.message)) {
      return { consultas: [], debitos: [] };
    }

    throw new Error(consultasResult.error.message);
  }

  const latestConsultaId = consultasResult.data?.[0]?.id;

  if (!latestConsultaId) {
    return {
      consultas: (consultasResult.data ?? []) as FrotaDebitoConsulta[],
      debitos: [],
    };
  }

  const debitosResult = await supabase
    .from("frota_debitos_veiculares")
    .select(
      "id,type,title,description,amount,due_date,expiration_date,is_expired,required,year,created_at"
    )
    .eq("consulta_id", latestConsultaId)
    .order("amount", { ascending: false });

  if (debitosResult.error) {
    throw new Error(debitosResult.error.message);
  }

  return {
    consultas: (consultasResult.data ?? []) as FrotaDebitoConsulta[],
    debitos: (debitosResult.data ?? []) as FrotaDebitoVeicular[],
  };
}

export async function getManutencoesData(params?: {
  prefeituraId?: string;
  query?: string;
  status?: string;
}) {
  const supabase = createSupabaseServerClient();
  const frotasData = await getFrotasData({
    prefeituraId: params?.prefeituraId,
  });
  const selectedPrefeituraId = params?.prefeituraId ?? frotasData.selectedPrefeituraId;

  let manutencoesQuery = supabase
    .from("frota_manutencoes")
    .select(
      "id,prefeitura_id,veiculo_id,tipo,descricao,oficina,responsavel,data_entrada,data_saida,valor,quilometragem,status,observacoes,created_at,frota_veiculos(marca,modelo,placa)"
    )
    .order("data_entrada", { ascending: false })
    .order("created_at", { ascending: false });

  if (selectedPrefeituraId) {
    manutencoesQuery = manutencoesQuery.eq("prefeitura_id", selectedPrefeituraId);
  }

  if (params?.status && params.status !== "all") {
    manutencoesQuery = manutencoesQuery.eq("status", params.status);
  }

  const manutencoesResult = await manutencoesQuery;

  if (manutencoesResult.error) {
    if (isMissingFrotasTableError(manutencoesResult.error.message)) {
      return {
        ...frotasData,
        manutencoes: [],
      };
    }

    throw new Error(manutencoesResult.error.message);
  }

  const manutencaoIds = ((manutencoesResult.data ?? []) as unknown as ManutencaoRow[]).map(
    (manutencao) => manutencao.id
  );
  const anexosByManutencao = new Map<string, FrotaManutencaoAnexo[]>();

  if (manutencaoIds.length) {
    const anexosResult = await supabase
      .from("frota_manutencao_anexos")
      .select("id,manutencao_id,file_name,file_path,file_type,file_size,created_at")
      .in("manutencao_id", manutencaoIds)
      .order("created_at", { ascending: false });

    if (!anexosResult.error) {
      const anexos = await withSignedUrls(
        supabase,
        "frota-manutencao",
        (anexosResult.data ?? []) as Array<
          FrotaManutencaoAnexo & { manutencao_id: string }
        >
      );

      anexos.forEach((anexo) => {
        const current = anexosByManutencao.get(anexo.manutencao_id) ?? [];
        current.push({
          created_at: anexo.created_at,
          file_name: anexo.file_name,
          file_path: anexo.file_path,
          file_size: anexo.file_size,
          file_type: anexo.file_type,
          id: anexo.id,
          signed_url: anexo.signed_url,
        });
        anexosByManutencao.set(anexo.manutencao_id, current);
      });
    }
  }

  let manutencoes = ((manutencoesResult.data ?? []) as unknown as ManutencaoRow[]).map(
    (manutencao) => ({
      ...manutencao,
      anexos: anexosByManutencao.get(manutencao.id) ?? [],
      marca: manutencao.frota_veiculos?.marca ?? "-",
      modelo: manutencao.frota_veiculos?.modelo ?? "-",
      placa: manutencao.frota_veiculos?.placa ?? "-",
    })
  );

  if (params?.query) {
    const normalizedQuery = params.query.toLowerCase();
    manutencoes = manutencoes.filter((manutencao) =>
      [
        manutencao.placa,
        manutencao.marca,
        manutencao.modelo,
        manutencao.tipo,
        manutencao.descricao,
        manutencao.oficina,
        manutencao.responsavel,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery)
    );
  }

  return {
    ...frotasData,
    manutencoes,
  };
}

export async function getAbastecimentosData(params?: {
  postoId?: string;
  prefeituraId?: string;
  query?: string;
  status?: string;
}) {
  const supabase = createSupabaseServerClient();
  const frotasData = await getFrotasData({
    prefeituraId: params?.prefeituraId,
  });
  const selectedPrefeituraId = params?.prefeituraId ?? frotasData.selectedPrefeituraId;

  let postosQuery = supabase
    .from("frota_postos_credenciados")
    .select("id,prefeitura_id,nome,cnpj,endereco,telefone,status")
    .eq("status", "active")
    .order("nome");

  let abastecimentosQuery = supabase
    .from("frota_abastecimentos")
    .select(
      "id,prefeitura_id,veiculo_id,posto_id,numero_ordem,data_abastecimento,motorista,fornecedor,combustivel,quilometragem,litros,valor_litro,valor_total,arla_incluso,arla_litros,arla_valor_litro,arla_valor_total,status,observacoes,emitido_por,expires_at,concluido_por,numero_nota_fiscal,completed_at,created_at,print_count,last_printed_at,motivo_cancelamento,cancelled_at,frota_veiculos(placa,marca,modelo,ano,renavam,secretaria,prefeituras(nome,brasao_url)),frota_postos_credenciados(nome)"
    )
    .order("data_abastecimento", { ascending: false })
    .order("created_at", { ascending: false });

  if (selectedPrefeituraId) {
    postosQuery = postosQuery.eq("prefeitura_id", selectedPrefeituraId);
    abastecimentosQuery = abastecimentosQuery.eq(
      "prefeitura_id",
      selectedPrefeituraId
    );
  }

  if (params?.status && params.status !== "all") {
    abastecimentosQuery = abastecimentosQuery.eq("status", params.status);
  }

  if (params?.postoId) {
    abastecimentosQuery = abastecimentosQuery.eq("posto_id", params.postoId);
  }

  const [postosResult, abastecimentosResult] = await Promise.all([
    postosQuery,
    abastecimentosQuery,
  ]);

  if (postosResult.error) {
    if (isMissingFrotasTableError(postosResult.error.message)) {
      return {
        ...frotasData,
        abastecimentos: [],
        postos: [],
      };
    }

    throw new Error(postosResult.error.message);
  }

  if (abastecimentosResult.error) {
    if (isMissingFrotasTableError(abastecimentosResult.error.message)) {
      return {
        ...frotasData,
        abastecimentos: [],
        postos: (postosResult.data ?? []) as FrotaPostoCredenciado[],
      };
    }

    throw new Error(abastecimentosResult.error.message);
  }

  const rawAbastecimentos = (
    (abastecimentosResult.data ?? []) as unknown as AbastecimentoRow[]
  );
  const abastecimentoIds = rawAbastecimentos.map((abastecimento) => abastecimento.id);
  const anexosByAbastecimento = new Map<string, FrotaAbastecimentoAnexo[]>();

  if (abastecimentoIds.length) {
    const anexosResult = await supabase
      .from("frota_abastecimento_anexos")
      .select("id,abastecimento_id,file_name,file_path,file_type,file_size,created_at")
      .in("abastecimento_id", abastecimentoIds)
      .order("created_at", { ascending: false });

    if (!anexosResult.error) {
      const anexos = await withSignedUrls(
        supabase,
        "frota-abastecimento",
        (anexosResult.data ?? []) as AbastecimentoAnexoRow[]
      );

      anexos.forEach((anexo) => {
        const current = anexosByAbastecimento.get(anexo.abastecimento_id) ?? [];
        current.push({
          created_at: anexo.created_at,
          file_name: anexo.file_name,
          file_path: anexo.file_path,
          file_size: anexo.file_size,
          file_type: anexo.file_type,
          id: anexo.id,
          signed_url: anexo.signed_url,
        });
        anexosByAbastecimento.set(anexo.abastecimento_id, current);
      });
    }
  }

  let abastecimentos: FrotaAbastecimento[] = rawAbastecimentos.map(
    (abastecimento) => {
      const {
        frota_postos_credenciados,
        frota_veiculos,
        ...baseAbastecimento
      } = abastecimento;

      return {
        ...baseAbastecimento,
        anexos: anexosByAbastecimento.get(abastecimento.id) ?? [],
        ano: frota_veiculos?.ano ?? null,
        consumo_medio_km_l: null,
        marca: frota_veiculos?.marca ?? "-",
        modelo: frota_veiculos?.modelo ?? "-",
        placa: frota_veiculos?.placa ?? "-",
        posto_nome: frota_postos_credenciados?.nome ?? null,
        prefeitura_brasao_url: frota_veiculos?.prefeituras?.brasao_url ?? null,
        prefeitura_nome: frota_veiculos?.prefeituras?.nome ?? "-",
        renavam: frota_veiculos?.renavam ?? null,
        secretaria: frota_veiculos?.secretaria ?? "-",
      };
    }
  );

  abastecimentos = withFuelConsumption(abastecimentos);

  if (params?.query) {
    const normalizedQuery = params.query.toLowerCase();
    abastecimentos = abastecimentos.filter((abastecimento) =>
      [
        abastecimento.numero_ordem,
        abastecimento.placa,
        abastecimento.marca,
        abastecimento.modelo,
        abastecimento.motorista,
        abastecimento.fornecedor,
        abastecimento.secretaria,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery)
    );
  }

  return {
    ...frotasData,
    abastecimentos,
    postos: (postosResult.data ?? []) as FrotaPostoCredenciado[],
  };
}

export async function getPostosCredenciadosData(params?: {
  prefeituraId?: string;
  query?: string;
}) {
  const supabase = createSupabaseServerClient();
  const frotasData = await getFrotasData({
    prefeituraId: params?.prefeituraId,
  });
  const selectedPrefeituraId = params?.prefeituraId ?? frotasData.selectedPrefeituraId;

  let postosQuery = supabase
    .from("frota_postos_credenciados")
    .select("id,prefeitura_id,nome,cnpj,endereco,telefone,status,created_at,prefeituras(nome)")
    .order("created_at", { ascending: false });

  if (selectedPrefeituraId) {
    postosQuery = postosQuery.eq("prefeitura_id", selectedPrefeituraId);
  }

  const { data, error } = await postosQuery;

  if (error) {
    if (isMissingFrotasTableError(error.message)) {
      return {
        ...frotasData,
        postos: [],
      };
    }

    throw new Error(error.message);
  }

  let postos = ((data ?? []) as unknown as Array<
    FrotaPostoCredenciado & { prefeituras: { nome: string } | null }
  >).map(({ prefeituras, ...posto }) => ({
    ...posto,
    prefeitura_nome: prefeituras?.nome ?? "-",
  }));

  if (params?.query) {
    const normalizedQuery = params.query.toLowerCase();
    postos = postos.filter((posto) =>
      [posto.nome, posto.cnpj, posto.telefone, posto.endereco, posto.prefeitura_nome]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery)
    );
  }

  return {
    ...frotasData,
    postos,
  };
}

function withFuelConsumption(abastecimentos: FrotaAbastecimento[]) {
  const byVehicle = new Map<string, FrotaAbastecimento[]>();

  abastecimentos.forEach((abastecimento) => {
    if (
      abastecimento.status !== "completed" ||
      !abastecimento.quilometragem ||
      !abastecimento.litros
    ) {
      return;
    }

    const current = byVehicle.get(abastecimento.veiculo_id) ?? [];
    current.push(abastecimento);
    byVehicle.set(abastecimento.veiculo_id, current);
  });

  const consumptionByOrder = new Map<string, number | null>();

  byVehicle.forEach((orders) => {
    orders
      .sort((a, b) => {
        const aTime = new Date(a.completed_at ?? a.created_at).getTime();
        const bTime = new Date(b.completed_at ?? b.created_at).getTime();
        return aTime - bTime;
      })
      .forEach((order, index, sortedOrders) => {
        const previous = sortedOrders[index - 1];

        if (!previous?.quilometragem || !order.quilometragem || !order.litros) {
          consumptionByOrder.set(order.id, null);
          return;
        }

        const distance = order.quilometragem - previous.quilometragem;

        if (distance <= 0) {
          consumptionByOrder.set(order.id, null);
          return;
        }

        consumptionByOrder.set(
          order.id,
          Math.round((distance / order.litros) * 100) / 100
        );
      });
  });

  return abastecimentos.map((abastecimento) => ({
    ...abastecimento,
    consumo_medio_km_l: consumptionByOrder.get(abastecimento.id) ?? null,
  }));
}

export function formatVeiculoStatus(status: VeiculoStatus) {
  const labels: Record<VeiculoStatus, string> = {
    active: "Ativo",
    maintenance: "Em manutenção",
    inactive: "Inativo",
  };

  return labels[status];
}

export function formatManutencaoStatus(status: ManutencaoStatus) {
  const labels: Record<ManutencaoStatus, string> = {
    cancelled: "Cancelada",
    completed: "Concluída",
    open: "Em manutenção",
  };

  return labels[status];
}

export function formatAbastecimentoStatus(status: AbastecimentoStatus) {
  const labels: Record<AbastecimentoStatus, string> = {
    cancelled: "Cancelada",
    completed: "Concluída",
    expired: "Vencida",
    issued: "Pendente",
  };

  return labels[status];
}

export function formatVencimentoTipo(tipo: VencimentoTipo) {
  const labels: Record<VencimentoTipo, string> = {
    ipva: "IPVA",
    licenciamento: "Licenciamento",
    seguro: "Seguro",
  };

  return labels[tipo];
}

export function formatFrotaDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00.000Z`));
}

export function formatFrotaDaysRemaining(days: number) {
  if (days < 0) {
    return `Vencido há ${Math.abs(days)} dia(s)`;
  }

  if (days === 0) {
    return "Vence hoje";
  }

  return `Vence em ${days} dia(s)`;
}

function emptyFrotasData(
  prefeituras: FrotaPrefeituraOption[],
  selectedPrefeituraId?: string
) {
  return {
    metricas: {
      ativos: 0,
      emManutencao: 0,
      total: 0,
      vencendo: 0,
      vencidos: 0,
    },
    prefeituras,
    selectedPrefeituraId,
    veiculos: [],
    vencimentos: [],
  };
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

function isMissingFrotasTableError(message: string) {
  return (
    message.includes("frota_debito_consultas") ||
    message.includes("frota_debitos_veiculares") ||
    message.includes("frota_abastecimento_anexos") ||
    message.includes("frota_manutencao_anexos") ||
    message.includes("frota_manutencoes") ||
    message.includes("frota_abastecimentos") ||
    message.includes("frota_postos_credenciados") ||
    message.includes("frota_veiculo_anexos") ||
    message.includes("frota_veiculos") ||
    message.includes("frota_vencimentos")
  );
}

async function withSignedUrls<T extends FrotaAnexo>(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  bucket: string,
  anexos: T[]
) {
  return Promise.all(
    anexos.map(async (anexo) => {
      const { data } = await supabase.storage
        .from(bucket)
        .createSignedUrl(anexo.file_path, 60 * 10);

      return {
        ...anexo,
        signed_url: data?.signedUrl ?? null,
      };
    })
  );
}
