"use server";

import { getModuleLicensedEmpresas } from "@/lib/empresa-access";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUserProfile } from "@/lib/auth-data";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAuthServerClient } from "@/lib/supabase-auth-server";
import {
  validarProduto,
  type ProdutoCampos,
} from "@/lib/gestao-produto-validation";

export type GestaoState = {
  error?: string;
  success?: string;
  fieldErrors?: Partial<Record<keyof ProdutoCampos, string>>;
};
export async function excluirFechamento(
  unidadeId: string,
  fechamentoId: string,
  versao: number,
): Promise<GestaoState> {
  const profile = await requireUserProfile();
  if (profile.role !== "bdl_admin")
    return { error: "Somente o usuário Master pode excluir fechamentos." };
  const { error } = await createSupabaseServerClient().rpc(
    "gestao_excluir_fechamento",
    {
      p_ator: profile.id,
      p_unidade: unidadeId,
      p_fechamento: fechamentoId,
      p_versao: versao,
    },
  );
  if (error)
    return {
      error:
        error.code === "P0001"
          ? error.message
          : "Não foi possível excluir o fechamento. Atualize a página e tente novamente.",
    };
  revalidatePath("/gestao", "layout");
  return { success: "Fechamento excluído." };
}
export async function estornarMovimento(
  unidadeId: string,
  movimentoId: string,
  motivo: string,
): Promise<GestaoState> {
  const profile = await requireUserProfile();
  if (motivo.trim().length < 3 || motivo.trim().length > 500)
    return { error: "Informe uma justificativa entre 3 e 500 caracteres." };
  const { error } = await createSupabaseServerClient().rpc(
    "gestao_estornar_movimento",
    {
      p_ator: profile.id,
      p_unidade: unidadeId,
      p_movimento: movimentoId,
      p_motivo: motivo.trim(),
    },
  );
  if (error)
    return {
      error:
        error.code === "P0001"
          ? error.message
          : "Não foi possível estornar. Atualize a página e tente novamente.",
    };
  revalidatePath("/gestao", "layout");
  return { success: "Movimentação estornada. O histórico foi preservado." };
}
export async function excluirProduto(
  unidadeId: string,
  produtoId: string,
  versao: number,
): Promise<GestaoState> {
  const profile = await requireUserProfile();
  const { error } = await createSupabaseServerClient().rpc(
    "gestao_excluir_produto",
    {
      p_ator: profile.id,
      p_unidade: unidadeId,
      p_produto: produtoId,
      p_versao: versao,
    },
  );
  if (error)
    return {
      error:
        error.code === "P0001"
          ? error.message
          : "Não foi possível excluir o produto. Atualize a página e tente novamente.",
    };
  revalidatePath("/gestao", "layout");
  return { success: "Produto excluído." };
}
export async function reservarCodigoProduto(unidadeId: string): Promise<{
  error?: string;
  reserva?: { reserva_id: string; codigo: number };
}> {
  const profile = await requireUserProfile();
  const { data, error } = await createSupabaseServerClient().rpc(
    "gestao_reservar_codigo",
    { p_ator: profile.id, p_unidade: unidadeId },
  );
  if (error)
    return {
      error: "Não foi possível gerar o código do produto. Tente novamente.",
    };
  return { reserva: data };
}
const allowed = new Set([
  "produto",
  "categoria",
  "movimento",
  "salvar",
  "confirmar",
  "reabrir",
]);

export async function operarGestao(
  acao: string,
  dados: Record<string, unknown>,
): Promise<GestaoState & { id?: string }> {
  const profile = await requireUserProfile();
  if (!allowed.has(acao)) return { error: "Operação inválida." };
  if (JSON.stringify(dados).length > 200_000)
    return { error: "O lançamento excede o tamanho permitido." };
  if (acao === "produto") {
    const fieldErrors = validarProduto(dados);
    if (Object.keys(fieldErrors).length)
      return { error: "Confira os campos indicados.", fieldErrors };
  }
  if (
    acao === "salvar" &&
    (!Array.isArray(dados.itens) ||
      dados.itens.some(
        (item) =>
          !item ||
          (Number(item.quantidade) > 0 &&
            (item.preco_unitario == null ||
              !/^\d+(\.\d{1,2})?$/.test(String(item.preco_unitario)) ||
              Number(item.preco_unitario) >= 1e9)),
      ))
  ) {
    return { error: "Informe o preço unitário de cada produto." };
  }
  // RPC is service-only; it independently validates the active actor and tenant/role.
  const db = createSupabaseServerClient();
  const { data, error } = await db.rpc("gestao_operar", {
    p_ator: profile.id,
    p_acao: acao,
    p_dados: dados,
  });
  if (error) {
    if (acao === "salvar" && error.code === "23505")
      return {
        error:
          "Já existe um fechamento nesta unidade com a mesma data, turno e origem do relatório. Abra o fechamento existente para editar ou exclua o rascunho antes de cadastrar novamente.",
      };
    if (acao === "produto" && error.code === "23505")
      return {
        fieldErrors: {
          nome: "Já existe um produto com este nome nesta unidade.",
        },
      };
    if (
      acao === "produto" &&
      error.code === "P0001" &&
      error.message.includes("categoria ativa")
    )
      return { fieldErrors: { categoria_id: error.message } };
    if (error.code === "23505")
      return {
        error:
          "Já existe um registro com esses dados. Confira o nome da categoria, do produto ou a identificação do fechamento.",
      };
    if (error.code === "P0001") return { error: error.message };
    console.error("Gestão: operação recusada", { acao, code: error.code });
    return {
      error:
        "Não foi possível salvar. Confira os campos obrigatórios e os valores informados.",
    };
  }
  revalidatePath("/gestao", "layout");
  revalidatePath("/portal");

  return { success: "Alterações salvas.", id: data };
}

export async function formularioGestao(
  acao: string,
  _state: GestaoState,
  form: FormData,
): Promise<GestaoState> {
  const dados = Object.fromEntries(
    [...form.entries()].filter(
      ([key, value]) => !key.startsWith("$") && typeof value === "string",
    ),
  );
  return operarGestao(acao, dados);
}

export async function selecionarUnidade(form: FormData) {
  const profile = await requireUserProfile();
  if (profile.role !== "bdl_admin") return;
  const db = await createSupabaseAuthServerClient();
  const id = String(form.get("unidade_id") ?? "");
  const { data } = await db
    .from("gestao_unidades")
    .select("id,empresa_id")
    .eq("id", id)
    .maybeSingle();
  if (!data) return;
  const licenciadas = await getModuleLicensedEmpresas(
    "gestao-estabelecimentos",
  );
  if (!licenciadas.some((e) => e.id === data.empresa_id)) return;
  (await cookies()).set("gestao_unidade", id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  revalidatePath("/gestao", "layout");
  redirect("/gestao");
}
