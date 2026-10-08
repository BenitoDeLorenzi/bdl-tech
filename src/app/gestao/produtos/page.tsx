import { Package, CircleCheck, CircleMinus } from "lucide-react";
import {
  getGestaoContext,
  getProdutos,
  getCategorias,
} from "@/lib/gestao-data";
import { codigoProduto, dinheiro } from "@/lib/gestao-types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { GestaoShell } from "../gestao-shell";
import {
  Empty,
  Panel,
  GestaoDialog,
  MetricBadge,
  ListBadge,
  SearchToolbar,
} from "../ui";
import { NovoProdutoDialog } from "./novo-produto-dialog";
import { ProdutoForm } from "./produto-form";
import { ExcluirProdutoDialog } from "./excluir-produto-dialog";
export default async function ProdutosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const [{ unidade, gestor }, produtos, categorias, { q }] = await Promise.all([
    getGestaoContext(),
    getProdutos(),
    getCategorias(),
    searchParams,
  ]);
  const filtrados = produtos.filter(
    (p) =>
      !q ||
      [p.nome, p.categoria, codigoProduto(p.codigo)]
        .join(" ")
        .toLocaleLowerCase("pt-BR")
        .includes(q.trim().toLocaleLowerCase("pt-BR")),
  );
  return (
    <GestaoShell
      title="Produtos"
      icon={Package}
      actions={
        <SearchToolbar
          placeholder="Buscar nome, código ou categoria"
          query={q}
          clearHref="/gestao/produtos"
        >
          {gestor && unidade && (
            <NovoProdutoDialog unidadeId={unidade.id} categorias={categorias} />
          )}
        </SearchToolbar>
      }
    >
      <Panel
        title="Produtos cadastrados"
        description="Catálogo e preços de referência do estabelecimento."
        icon={Package}
        metrics={
          <>
            <MetricBadge
              label="Produtos"
              icon={Package}
              value={produtos.length}
            />
            <MetricBadge
              label="Ativos"
              icon={CircleCheck}
              tone="success"
              value={produtos.filter((p) => p.ativo).length}
            />
          </>
        }
      >
        {!unidade ? (
          <Empty
            title="Selecione um estabelecimento"
            description="Vincule uma empresa com licença vigente para começar."
            href="/gestao/configuracoes"
            action="Configurar"
          />
        ) : filtrados.length ? (
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Produto</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Preço de venda</TableHead>
                  <TableHead>Estoque</TableHead>
                  <TableHead>Situação</TableHead>
                  {gestor && (
                    <TableHead className="w-[128px] text-right">
                      Ações
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtrados.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="min-w-[180px] font-medium">{p.nome}</div>
                      <div className="text-xs text-muted-foreground">
                        {codigoProduto(p.codigo)} · {p.unidade}
                      </div>
                    </TableCell>
                    <TableCell>{p.categoria}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {p.preco === null ? "Não informado" : dinheiro(p.preco)}
                    </TableCell>
                    <TableCell>
                      {p.controlar_estoque ? "Controlado" : "Não controla"}
                    </TableCell>
                    <TableCell>
                      <ListBadge
                        icon={p.ativo ? CircleCheck : CircleMinus}
                        tone={p.ativo ? "success" : "neutral"}
                      >
                        {p.ativo ? "Ativo" : "Inativo"}
                      </ListBadge>
                    </TableCell>
                    {gestor && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <GestaoDialog
                            editing
                            title="Editar produto"
                            label={"Editar " + p.nome}
                            description="Atualize os dados ou inative o produto. O histórico será preservado."
                          >
                            <ProdutoForm
                              key={p.id + "-" + p.versao}
                              unidadeId={unidade.id}
                              categorias={categorias}
                              produto={p}
                            />
                          </GestaoDialog>
                          <ExcluirProdutoDialog produto={p} />
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <Empty
            title={
              q ? "Nenhum produto encontrado" : "Nenhum produto cadastrado"
            }
            description={
              q
                ? "Ajuste os termos da busca."
                : "Use Novo produto para iniciar o catálogo."
            }
          />
        )}
      </Panel>
    </GestaoShell>
  );
}
