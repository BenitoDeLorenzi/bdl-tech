export type Colaborador = {
  id: string;
  unidade_id: string;
  nome: string;
  funcao: string;
  telefone: string;
  valor: number;
  ativo: boolean;
  observacoes: string;
  versao: number;
};
export type Trabalho = {
  id: string;
  colaborador_id: string;
  colaborador_nome: string;
  funcao: string;
  data: string;
  inicio: string | null;
  fim: string | null;
  valor: number;
  observacoes: string;
  cancelado: boolean;
  motivo_cancelamento: string | null;
  pagamento_id: string | null;
  versao: number;
};
export type PagamentoEquipe = {
  id: string;
  colaborador_id: string;
  colaborador_nome: string;
  data: string;
  forma: string;
  total: number;
  itens: Trabalho[];
  observacoes: string;
  status: "pago" | "estornado";
  motivo_estorno: string | null;
  versao: number;
};
export const horarioTrabalho = (t: Pick<Trabalho, "inicio" | "fim">) =>
  t.inicio && t.fim
    ? t.inicio.slice(0, 5) +
      " – " +
      t.fim.slice(0, 5) +
      (t.fim < t.inicio ? " (+1 dia)" : "")
    : "Horário não informado";
export const hojeEquipe = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(
    new Date(),
  );
export const valorEquipeValido = (value: string) =>
  /^\d+(\.\d{1,2})?$/.test(value) && Number(value) > 0 && Number(value) < 1e9;
export const trabalhoPendente = (t: Trabalho) =>
  !t.cancelado && !t.pagamento_id;
export const totalTrabalhos = (itens: Trabalho[]) =>
  itens.reduce((s, t) => s + Math.round(Number(t.valor) * 100), 0) / 100;

export type EquipeFechamento = {
  colaborador_id: string;
  nome: string;
  presente: boolean;
  valor_trabalho: number;
  valor_pago: number;
  saldo_anterior: number | null;
  saldo_final: number | null;
};
export type ExtratoEquipe = {
  id: number;
  colaborador_id: string;
  fechamento_id: string | null;
  tipo: "trabalho" | "pagamento";
  data: string;
  valor: number;
  nome: string;
  estornado: boolean;
  motivo_estorno: string | null;
  legado_id: string | null;
};
export type ColaboradorSaldo = Colaborador & { saldo: number };
export function saldoColaborador(
  extrato: ExtratoEquipe[],
  colaboradorId: string,
) {
  return (
    extrato.reduce(
      (sum, item) =>
        sum +
        (item.colaborador_id === colaboradorId && !item.estornado
          ? Math.round(Number(item.valor) * 100) *
            (item.tipo === "trabalho" ? 1 : -1)
          : 0),
      0,
    ) / 100
  );
}
