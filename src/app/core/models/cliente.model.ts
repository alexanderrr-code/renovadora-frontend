/* cliente.model.ts */
export interface ClienteRequest {
  nombreCompleto: string;
  telefono: string;
  email?: string;
  direccion?: string;
  notas?: string;
}

export interface ClienteResponse {
  id: number;
  nombreCompleto: string;
  telefono: string;
  email?: string;
  direccion?: string;
  notas?: string;
  totalOrdenes: number;
  ultimaVisita?: string;
  fechaRegistro: string;
}