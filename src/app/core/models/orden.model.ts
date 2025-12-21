/* orden.model.ts */
export enum EstadoOrden {
  PENDIENTE = 'PENDIENTE',
  EN_PROCESO = 'EN_PROCESO',
  LISTO = 'LISTO',
  ENTREGADO = 'ENTREGADO'
}

export enum EstadoPago {
  PAGADO = 'PAGADO',
  DEBE = 'DEBE'
}

export interface ItemRequest {
  numeroItem: number;
  tipoArticulo: string;
  servicios: string;
  descripcionProblema: string;
  detallesSolucion?: string;
}

export interface ItemResponse {
  id: number;
  numeroItem: number;
  tipoArticulo: string;
  servicios: string;
  descripcionProblema: string;
  detallesSolucion?: string;
}

export interface OrdenRequest {
  clienteId: number;
  items: ItemRequest[];
  estado?: EstadoOrden;
  estadoPago: EstadoPago;
  costoTotal: number;
  adelanto?: number;
  fechaIngreso: string;
  fechaEntregaEstimada: string;
}

export interface OrdenResponse {
  id: number;
  codigo: string;
  clienteId: number;
  clienteNombre: string;
  clienteTelefono: string;
  items: ItemResponse[];
  estado: EstadoOrden;
  estadoPago: EstadoPago;
  costoTotal: number;
  adelanto: number;
  saldoPendiente: number;
  fechaIngreso: string;
  fechaEntregaEstimada: string;
  fechaEntregaReal?: string;
  fechaCreacion: string;
}