export type ProdutoCampos = {
  nome: string;
  categoria_id: string;
  unidade: string;
  preco: string;
  controlar_estoque: string;
  minimo: string;
  observacoes: string;
  ativo: string;
};
export function validarProduto(
  dados: Record<string, unknown>,
): Partial<Record<keyof ProdutoCampos, string>> {
  const erros: Partial<Record<keyof ProdutoCampos, string>> = {};
  const nome = String(dados.nome ?? "").trim();
  if (nome.length < 2 || nome.length > 120)
    erros.nome = "Informe um nome entre 2 e 120 caracteres.";
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      String(dados.categoria_id ?? ""),
    )
  )
    erros.categoria_id = "Selecione uma categoria.";
  if (!["un", "kg", "g", "l", "ml"].includes(String(dados.unidade)))
    erros.unidade = "Selecione uma unidade válida.";
  const preco = String(dados.preco ?? "").trim();
  if (preco && (!/^\d+(\.\d{1,2})?$/.test(preco) || Number(preco) >= 1e9))
    erros.preco = "Informe um preço válido, menor que R$ 1.000.000.000,00.";
  if (!["true", "false"].includes(String(dados.controlar_estoque)))
    erros.controlar_estoque = "Selecione uma opção.";
  if (String(dados.controlar_estoque) === "true") {
    const minimo = String(dados.minimo ?? "").trim();
    if (!/^\d+(\.\d{1,3})?$/.test(minimo) || Number(minimo) > 999999999)
      erros.minimo =
        "Informe um estoque mínimo entre 0 e 999.999.999, com até 3 casas decimais.";
  }
  if (String(dados.observacoes ?? "").length > 2000)
    erros.observacoes = "Use no máximo 2.000 caracteres.";
  if (!["true", "false"].includes(String(dados.ativo)))
    erros.ativo = "Selecione uma situação.";
  return erros;
}
