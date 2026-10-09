"use server";

import { revalidatePath } from "next/cache";

import { requireUserProfile } from "@/lib/auth-data";
import { hasFrotasPermission } from "@/lib/frotas-permissions";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export type UsoVeiculoActionState = {
  error?: string;
  success?: string;
};

export async function deleteUsoVeiculo(
  _previousState: UsoVeiculoActionState,
  formData: FormData
): Promise<UsoVeiculoActionState> {
  const profile = await requireUserProfile();
  if (profile.role !== "bdl_admin" || !(await hasFrotasPermission(profile, "vehicle_usage.cancel"))) {
    return { error: "Somente o Master pode excluir retiradas." };
  }
  const id = getRequiredValue(formData, "id");
  if (!id) return { error: "Informe a retirada que deseja excluir." };

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("frota_uso_veiculos")
    .delete()
    .eq("id", id)
    .eq("status", "cancelled")
    .select("id,veiculo_id")
    .maybeSingle();

  if (error) return { error: "Não foi possível excluir a retirada. Tente novamente." };
  if (!data) return { error: "Retirada não encontrada ou não cancelada. Somente retiradas canceladas podem ser excluídas." };

  revalidateUsoVeiculoPaths();
  revalidatePath(`/frotas/veiculos/${data.veiculo_id}`);
  return { success: "Retirada excluída com sucesso." };
}

export async function createUsoVeiculo(
  _previousState: UsoVeiculoActionState,
  formData: FormData
): Promise<UsoVeiculoActionState> {
  const profile = await requireUserProfile();
  const allowed = await hasFrotasPermission(profile, "vehicle_usage.create");

  if (!allowed) {
    return { error: "Você não tem permissão para registrar retirada." };
  }

  const veiculoId = getRequiredValue(formData, "veiculo_id");
  const funcionarioNome = getRequiredValue(formData, "funcionario_nome");
  const funcionarioCpf = onlyDigits(getOptionalValue(formData, "funcionario_cpf"));
  const kmSaida = parseInteger(getRequiredValue(formData, "km_saida"));
  const destino = getOptionalValue(formData, "destino");
  const finalidade = getOptionalValue(formData, "finalidade");
  const observacoesSaida = getOptionalValue(formData, "observacoes_saida");

  if (!veiculoId || !funcionarioNome || kmSaida === null) {
    return { error: "Informe o veículo, o motorista e a quilometragem." };
  }

  if (funcionarioCpf && funcionarioCpf.length !== 11) {
    return { error: "Informe um CPF válido ou deixe o campo em branco." };
  }

  const supabase = createSupabaseServerClient();
  const { data: veiculo, error: veiculoError } = await supabase
    .from("frota_veiculos")
    .select("id,prefeitura_id,quilometragem,status")
    .eq("id", veiculoId)
    .single();

  if (veiculoError || !veiculo) {
    return {
      error: formatUsoVeiculoError(
        veiculoError?.message ?? "Veículo não encontrado."
      ),
    };
  }

  if (profile.role !== "bdl_admin" && veiculo.prefeitura_id !== profile.prefeitura_id) {
    return { error: "Este veículo não pertence à sua empresa." };
  }

  if (veiculo.status === "inactive") {
    return { error: "Não é possível retirar um veículo inativo." };
  }

  const currentMileage =
    typeof veiculo.quilometragem === "number" ? veiculo.quilometragem : null;

  if (currentMileage !== null && kmSaida < currentMileage) {
    return {
      error: `A quilometragem de saída não pode ser menor que ${formatNumber(currentMileage)} km.`,
    };
  }

  const { data: activeUsage, error: activeUsageError } = await supabase
    .from("frota_uso_veiculos")
    .select("id,funcionario_nome")
    .eq("veiculo_id", veiculo.id)
    .eq("status", "in_use")
    .maybeSingle();

  if (activeUsageError) {
    return { error: formatUsoVeiculoError(activeUsageError.message) };
  }

  if (activeUsage) {
    return {
      error: `Este veículo já está em uso por ${activeUsage.funcionario_nome}. Registre a devolução antes de criar uma nova retirada.`,
    };
  }

  const motoristaResult = funcionarioCpf
    ? await findOrCreateMotorista(supabase, {
        cpf: funcionarioCpf,
        nome: funcionarioNome,
        prefeituraId: veiculo.prefeitura_id,
      })
    : { motoristaId: null };

  if ("error" in motoristaResult) {
    return motoristaResult;
  }

  const { error } = await supabase.from("frota_uso_veiculos").insert({
    atividade_por: profile.nome,
    atividade_usuario_id: profile.id,
    created_by: profile.id,
    destino,
    finalidade,
    funcionario_cpf: funcionarioCpf || null,
    funcionario_nome: funcionarioNome,
    km_saida: kmSaida,
    motorista_id: motoristaResult.motoristaId,
    observacoes_saida: observacoesSaida,
    prefeitura_id: veiculo.prefeitura_id,
    status: "in_use",
    veiculo_id: veiculo.id,
  });

  if (error) {
    return { error: formatUsoVeiculoError(error.message) };
  }

  const { error: mileageError } = await supabase
    .from("frota_veiculos")
    .update({ quilometragem: kmSaida })
    .eq("id", veiculo.id)
    .eq("prefeitura_id", veiculo.prefeitura_id)
    .or(`quilometragem.is.null,quilometragem.lt.${kmSaida}`);

  revalidateUsoVeiculoPaths();
  revalidatePath(`/frotas/veiculos/${veiculo.id}`);

  if (mileageError) {
    return {
      error: "A retirada foi registrada, mas não foi possível atualizar a quilometragem do veículo. Atualize-a no cadastro do veículo; não registre outra retirada.",
    };
  }

  return { success: "Retirada registrada com sucesso." };
}

export async function returnUsoVeiculo(
  _previousState: UsoVeiculoActionState,
  formData: FormData
): Promise<UsoVeiculoActionState> {
  const profile = await requireUserProfile();
  const allowed = await hasFrotasPermission(profile, "vehicle_usage.return");

  if (!allowed) {
    return { error: "Você não tem permissão para registrar devolução." };
  }

  const id = getRequiredValue(formData, "id");
  const kmRetorno = parseInteger(getRequiredValue(formData, "km_retorno"));
  const observacoesRetorno = getOptionalValue(formData, "observacoes_retorno");

  if (!id || kmRetorno === null) {
    return { error: "Informe a quilometragem de retorno." };
  }

  const supabase = createSupabaseServerClient();
  const { data: uso, error: usoError } = await supabase
    .from("frota_uso_veiculos")
    .select("id,prefeitura_id,veiculo_id,km_saida,status")
    .eq("id", id)
    .single();

  if (usoError || !uso) {
    return {
      error: formatUsoVeiculoError(usoError?.message ?? "Retirada não encontrada."),
    };
  }

  if (profile.role !== "bdl_admin" && uso.prefeitura_id !== profile.prefeitura_id) {
    return { error: "Esta retirada não pertence à sua empresa." };
  }

  if (uso.status !== "in_use") {
    return { error: "Esta retirada não está aberta para devolução." };
  }

  if (kmRetorno < uso.km_saida) {
    return {
      error: `A quilometragem de retorno não pode ser menor que ${formatNumber(uso.km_saida)} km.`,
    };
  }

  const { data: returned, error: updateError } = await supabase
    .from("frota_uso_veiculos")
    .update({
      data_retorno: new Date().toISOString(),
      km_retorno: kmRetorno,
      observacoes_retorno: observacoesRetorno,
      returned_by: profile.id,
      atividade_por: profile.nome,
      atividade_usuario_id: profile.id,
      status: "returned",
      updated_at: new Date().toISOString(),
    })
    .eq("id", uso.id).eq("status", "in_use").select("id").maybeSingle();

  if (updateError || !returned) {
    return { error: formatUsoVeiculoError(updateError?.message ?? "Não foi possível devolver. Atualize a lista e tente novamente.") };
  }

  const { error: veiculoError } = await supabase
    .from("frota_veiculos")
    .update({ quilometragem: kmRetorno })
    .eq("id", uso.veiculo_id);

  if (veiculoError) {
    return { error: formatUsoVeiculoError(veiculoError.message) };
  }

  revalidateUsoVeiculoPaths();
  return { success: "Devolução registrada com sucesso." };
}

export async function cancelUsoVeiculo(_previousState: UsoVeiculoActionState, formData: FormData): Promise<UsoVeiculoActionState> {
  const profile = await requireUserProfile();
  const allowed = await hasFrotasPermission(profile, "vehicle_usage.cancel");
  if (!allowed) return { error: "Você não tem permissão para cancelar este registro." };
  const id = getRequiredValue(formData, "id");
  const motivo = getRequiredValue(formData, "motivo_cancelamento");
  if (!id || motivo.length < 8) return { error: "Descreva o motivo com pelo menos 8 caracteres." };
  const supabase = createSupabaseServerClient();
  const { data: registro, error: readError } = await supabase.from("frota_uso_veiculos")
    .select("id,prefeitura_id,status,veiculo_id").eq("id", id).single();
  if (readError || !registro) return { error: "Registro não encontrado." };
  if (profile.role !== "bdl_admin" && registro.prefeitura_id !== profile.prefeitura_id)
    return { error: "Este registro não pertence à sua empresa." };
  if (registro.status !== "in_use") return { error: "Somente registros abertos podem ser cancelados." };
  const now = new Date().toISOString();
  const { data: cancelled, error } = await supabase.from("frota_uso_veiculos")
    .update({ status: "cancelled", motivo_cancelamento: motivo, cancelled_at: now, updated_at: now, atividade_por: profile.nome, atividade_usuario_id: profile.id })
    .eq("id", id).eq("prefeitura_id", registro.prefeitura_id).eq("status", "in_use").select("id").maybeSingle();
  if (error || !cancelled) return { error: "Não foi possível cancelar. Atualize a lista e tente novamente." };
  revalidateUsoVeiculoPaths();
  return { success: "Cancelamento registrado com sucesso." };
}

async function findOrCreateMotorista(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  payload: {
    cpf: string;
    nome: string;
    prefeituraId: string;
  }
) {
  if (payload.cpf) {
    const { data: existing, error: existingError } = await supabase
      .from("frota_motoristas")
      .select("id")
      .eq("prefeitura_id", payload.prefeituraId)
      .eq("cpf", payload.cpf)
      .maybeSingle();

    if (existingError) {
      return { error: formatUsoVeiculoError(existingError.message) };
    }

    if (existing) {
      const { error } = await supabase
        .from("frota_motoristas")
        .update({
          nome: payload.nome,
          status: "active",
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      if (error) {
        return { error: formatUsoVeiculoError(error.message) };
      }

      return { motoristaId: existing.id as string };
    }
  }

  const { data: created, error } = await supabase
    .from("frota_motoristas")
    .insert({
      cpf: payload.cpf || null,
      nome: payload.nome,
      prefeitura_id: payload.prefeituraId,
      status: "active",
    })
    .select("id")
    .single();

  if (error || !created) {
    return {
      error: formatUsoVeiculoError(error?.message ?? "Motorista não cadastrado."),
    };
  }

  return { motoristaId: created.id as string };
}

function getRequiredValue(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function getOptionalValue(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return null;
  }

  return value.trim() || null;
}

function onlyDigits(value: string | null) {
  return value?.replace(/\D/g, "") ?? "";
}

function parseInteger(value: string) {
  const normalized = value.replace(/\D/g, "");

  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

function formatUsoVeiculoError(message: string) {
  if (message.includes("frota_uso_veiculos_one_active_per_vehicle_idx")) {
    return "Este veículo já possui uma retirada em aberto.";
  }

  if (
    message.includes("frota_uso_veiculos") ||
    message.includes("frota_motoristas")
  ) {
    return "Rode a migration de Uso do Veículo no Supabase antes de registrar retiradas.";
  }

  if (message.includes("duplicate") || message.includes("unique")) {
    return "Já existe um registro cadastrado com estes dados.";
  }

  return message;
}

function revalidateUsoVeiculoPaths() {
  revalidatePath("/frotas");
  revalidatePath("/frotas/veiculos");
  revalidatePath("/frotas/uso-veiculo");
  revalidatePath("/frotas/motoristas");
}
