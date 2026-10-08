type Estoque = {
  saldo: number;
  minimo: number;
  ativo: boolean;
  controlar_estoque: boolean;
};
export const margemAlertaEstoque = 50;

export function alertaEstoque(produto: Estoque) {
  const saldo = Math.round(Number(produto.saldo) * 1000);
  const minimo = Math.round(Number(produto.minimo) * 1000);
  if (!produto.ativo || !produto.controlar_estoque)
    return {
      nivel: "neutro",
      prioridade: 4,
      label: produto.ativo ? "Sem controle" : "Inativo",
    } as const;
  if (saldo < 0)
    return {
      nivel: "critico",
      prioridade: 0,
      label: "Saldo negativo",
    } as const;
  if (saldo === 0)
    return { nivel: "critico", prioridade: 0, label: "Sem estoque" } as const;
  if (saldo <= minimo)
    return { nivel: "critico", prioridade: 1, label: "Repor estoque" } as const;
  if (minimo > 0 && saldo * 100 <= minimo * (100 + margemAlertaEstoque))
    return {
      nivel: "atencao",
      prioridade: 2,
      label: "Próximo do mínimo",
    } as const;
  return { nivel: "regular", prioridade: 3, label: "Regular" } as const;
}

export function ordenarAlertasEstoque(a: Estoque, b: Estoque) {
  return (
    alertaEstoque(a).prioridade - alertaEstoque(b).prioridade ||
    (Number(a.minimo) > 0
      ? Number(a.saldo) / Number(a.minimo)
      : Number(a.saldo)) -
      (Number(b.minimo) > 0
        ? Number(b.saldo) / Number(b.minimo)
        : Number(b.saldo))
  );
}
