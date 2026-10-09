import "server-only";
import type { CurrentUserProfile } from "@/lib/auth-data";
import { getModuleLicensedEmpresas } from "@/lib/empresa-access";

// Only the shell's company context is loaded here. Transaction data stays in the page query.
export async function getFrotasLoadingData(profile: CurrentUserProfile, requested?: string) {
  const empresas = await getModuleLicensedEmpresas("frotas-publicas");
  const prefeituras = profile.role === "bdl_admin" ? empresas : empresas.filter(item => item.id === profile.prefeitura_id);
  const selectedPrefeituraId = prefeituras.find(item => item.id === requested)?.id ?? prefeituras[0]?.id;
  return {
    prefeituras, selectedPrefeituraId,
    metricas: { ativos: 0, inativos: 0, emUso: 0, devolvidos: 0, cancelados: 0, emManutencao: 0, total: 0, vencidos: 0, vencendo: 0 },
    veiculos: [], vencimentos: [], abastecimentos: [], manutencoes: [], oficinas: [], motoristas: [], postos: [], usos: [],
  };
}
