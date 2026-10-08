import type { EquipeFechamento } from "./gestao-equipe";
export type Empresa = {
  nome_fantasia?: string | null;
  id: string;
  nome: string;
  ativo: boolean;
  logo_url?: string | null;
};
export type Unidade = { id: string; empresa_id: string; nome: string };
export type Categoria = {
  id: string;
  empresa_id: string;
  nome: string;
  descricao: string;
  ativo: boolean;
  versao: number;
};
export const codigoProduto = (codigo: number) =>
  `PROD-${String(codigo).padStart(6, "0")}`;
export type Produto = {
  id: string;
  empresa_id: string;
  unidade_id: string;
  nome: string;
  categoria: string;
  categoria_id: string;
  codigo: number;
  custo: number;
  controlar_estoque: boolean;
  observacoes: string;
  versao: number;
  unidade: string;
  preco: number | null;
  minimo: number;
  saldo: number;
  ativo: boolean;
};
export type ItemFechamento = {
  cortesia?: number;
  preco_unitario?: number | null;
  produto_id: string;
  nome: string;
  quantidade: number;
  total: number;
};
export type Pagamento = {
  forma: string;
  origem: string;
  valor: number;
  taxa_percentual?: number;
  valor_taxa?: number;
  valor_liquido?: number;
};
export type DespesaFechamento = { descricao: string; valor: number };
export type Fechamento = {
  financeiro?: import("./gestao-contas").FinanceiroFechamento;
  financeiro_gerado?: boolean;
  financeiro_legado?: boolean;
  id: string;
  empresa_id: string;
  unidade_id: string;
  data: string;
  turno: string;
  origem: string;
  status: "rascunho" | "conferido";
  itens: ItemFechamento[];
  pagamentos: Pagamento[];
  despesas?: DespesaFechamento[];
  equipe?: EquipeFechamento[];
  observacoes: string;
  total: number;
  versao: number;
  created_at: string;
  confirmado_em: string | null;
};
export type Movimento = {
  estorno_de: string | null;
  estornado_em: string | null;
  estornado_por: string | null;
  custo_unitario: number | null;
  custo_total: number | null;
  id: string;
  produto_id: string;
  quantidade: number;
  tipo: string;
  motivo: string;
  created_at: string;
  fechamento_id: string | null;
};
export const dinheiro = (valor: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    valor,
  );
export const quantidade = (valor: number) =>
  new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 }).format(valor);
export const dataBR = (valor: string) =>
  valor.slice(0, 10).split("-").reverse().join("/");
export const formasPagamento = [
  "Dinheiro",
  "Pix",
  "Débito",
  "Crédito",
  "Outros",
];
