import { formasPagamento, type Fechamento, type Produto } from "./gestao-types";

// Round each receipt's fee in cents, identically to Postgres numeric round().
export function recebimentoLiquido(valor: number, percentual = 0) {
  const bruto = Math.round(valor * 100);
  const pontos = Math.round(percentual * 100);
  if (
    !Number.isSafeInteger(bruto) ||
    !Number.isSafeInteger(pontos) ||
    bruto < 0 ||
    pontos < 0 ||
    pontos > 10000
  )
    return { bruto: 0, taxa: 0, liquido: 0 };
  const taxa = Number(
    (BigInt(bruto) * BigInt(pontos) + BigInt(5000)) / BigInt(10000),
  );
  return { bruto, taxa, liquido: bruto - taxa };
}

export function produtosDoFechamento(
  produtos: Produto[],
  fechamento?: Fechamento,
) {
  const catalogo = produtos
    .filter(
      (p) => p.ativo || fechamento?.itens.some((i) => i.produto_id === p.id),
    )
    .map((p) => ({
      id: p.id,
      nome: p.nome,
      categoria: p.categoria || "Sem categoria",
      unidade: p.unidade,
      preco: p.preco,
    }));
  for (const item of fechamento?.itens ?? []) {
    if (!catalogo.some((p) => p.id === item.produto_id))
      catalogo.push({
        id: item.produto_id,
        nome: item.nome,
        categoria: "Produtos indisponíveis",
        unidade: "",
        preco: item.preco_unitario ?? null,
      });
  }
  return catalogo.sort(
    (a, b) =>
      a.categoria.localeCompare(b.categoria, "pt-BR") ||
      a.nome.localeCompare(b.nome, "pt-BR"),
  );
}

export function recebimentosIniciais(
  fechamento?: Fechamento,
  taxas: Record<string, number> = {},
) {
  return formasPagamento.flatMap((forma) => {
    const anteriores =
      fechamento?.pagamentos.filter((p) => p.forma === forma) ?? [];
    return anteriores.length
      ? anteriores.map((p) => ({
          forma,
          origem: p.origem,
          valor: String(p.valor),
          taxa_percentual: String(p.taxa_percentual ?? 0).replace(".", ","),
        }))
      : [
          {
            forma,
            origem: forma === "Dinheiro" ? "Caixa" : forma,
            valor: "",
            taxa_percentual: String(
              fechamento ? 0 : (taxas[forma] ?? 0),
            ).replace(".", ","),
          },
        ];
  });
}
