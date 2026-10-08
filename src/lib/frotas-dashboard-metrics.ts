import type { FrotaVeiculo, FrotaManutencao, FrotaAbastecimento } from "@/lib/frotas-data";
import type { FrotaUsoVeiculo } from "@/lib/uso-veiculos-data";

export function getDashboardMetrics(vehicles: FrotaVeiculo[], usages: FrotaUsoVeiculo[], maintenance: FrotaManutencao[], fuel: FrotaAbastecimento[], now = new Date()) {
  const openUsages = usages.filter(item => item.status === "in_use").sort((a,b) => Date.parse(a.data_saida)-Date.parse(b.data_saida));
  const inUseIds = new Set(openUsages.map(item => item.veiculo_id));
  const openMaintenance = maintenance.filter(item => item.status === "open").sort((a,b) => a.data_entrada.localeCompare(b.data_entrada));
  const maintenanceIds = new Set(openMaintenance.map(item => item.veiculo_id));
  const available = vehicles.filter(item => item.status === "active" && !inUseIds.has(item.id) && !maintenanceIds.has(item.id)).length;
  const completedAt = (item: FrotaAbastecimento) => Date.parse(item.completed_at ?? `${item.data_abastecimento}T00:00:00-03:00`);
  const completedFuel = fuel.filter(item => item.status === "completed").sort((a,b) => completedAt(b)-completedAt(a));
  const cutoff = now.getTime() - 30 * 24 * 60 * 60 * 1000;
  const recentFuel = completedFuel.filter(item => completedAt(item) >= cutoff && completedAt(item) <= now.getTime());
  return {
    available, availability: vehicles.length ? Math.round(available/vehicles.length*100) : 0,
    inUse: vehicles.filter(item => inUseIds.has(item.id)).length,
    maintenanceVehicles: vehicles.filter(item => item.status === "maintenance" || maintenanceIds.has(item.id)).length,
    openUsages, openMaintenance, completedFuel, recentFuel,
    fuelCost: recentFuel.reduce((sum,item) => sum + (item.valor_total ?? 0),0),
    liters: recentFuel.reduce((sum,item) => sum + (item.litros ?? 0),0),
    pendingFuel: fuel.filter(item => item.status === "issued" && (!item.expires_at || Date.parse(item.expires_at) >= now.getTime())).length,
    expiredFuel: fuel.filter(item => item.status === "expired" || (item.status === "issued" && item.expires_at && Date.parse(item.expires_at) < now.getTime())).length,
  };
}
