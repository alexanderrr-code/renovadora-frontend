/* pago.model.ts */
export interface PagoRequest {
  ordenId: number;
  monto: number;
  metodoPago?: string;
  notas?: string;
}

export interface PagoResponse {
  id: number;
  ordenId: number;
  ordenCodigo: string;
  monto: number;
  metodoPago?: string;
  notas?: string;
  fechaPago: string;
}