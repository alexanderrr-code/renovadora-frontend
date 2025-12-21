/* dashboard.model.ts */
export interface DashboardStats {
  ordenesPendientes: number;
  ordenesEnProceso: number;
  ordenesListas: number;
  ordenesEntregadas: number;
  ingresosHoy: number;
  ingresosSemana: number;
  ingresosMes: number;
  totalPorCobrar: number;
  ordenesAtrasadas: number;
  ordenesSinRecoger: number;
  ordenesParaHoy: number;
  ordenesCompletadasSemana: number;
}