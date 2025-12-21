/* orden.service.ts */
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { OrdenRequest, OrdenResponse, EstadoOrden } from '../models/orden.model';
import { API_ENDPOINTS } from '../constants/api.constants';

@Injectable({
  providedIn: 'root'
})
export class OrdenService {
  private http = inject(HttpClient);

  obtenerTodas(): Observable<OrdenResponse[]> {
    return this.http.get<OrdenResponse[]>(API_ENDPOINTS.ordenes);
  }

  obtenerPorId(id: number): Observable<OrdenResponse> {
    return this.http.get<OrdenResponse>(`${API_ENDPOINTS.ordenes}/${id}`);
  }

  obtenerPorCodigo(codigo: string): Observable<OrdenResponse> {
    return this.http.get<OrdenResponse>(`${API_ENDPOINTS.ordenes}/codigo/${codigo}`);
  }

  obtenerPorCliente(clienteId: number): Observable<OrdenResponse[]> {
    return this.http.get<OrdenResponse[]>(`${API_ENDPOINTS.ordenes}/cliente/${clienteId}`);
  }

  obtenerPorEstado(estado: EstadoOrden): Observable<OrdenResponse[]> {
    return this.http.get<OrdenResponse[]>(`${API_ENDPOINTS.ordenes}/estado/${estado}`);
  }

  buscar(termino: string): Observable<OrdenResponse[]> {
    return this.http.get<OrdenResponse[]>(`${API_ENDPOINTS.ordenes}/buscar?q=${termino}`);
  }

  crear(orden: OrdenRequest): Observable<OrdenResponse> {
    return this.http.post<OrdenResponse>(API_ENDPOINTS.ordenes, orden);
  }

  actualizar(id: number, orden: OrdenRequest): Observable<OrdenResponse> {
    return this.http.put<OrdenResponse>(`${API_ENDPOINTS.ordenes}/${id}`, orden);
  }

  cambiarEstado(id: number, nuevoEstado: EstadoOrden): Observable<OrdenResponse> {
    return this.http.patch<OrdenResponse>(
      `${API_ENDPOINTS.ordenes}/${id}/estado?nuevoEstado=${nuevoEstado}`,
      {}
    );
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${API_ENDPOINTS.ordenes}/${id}`);
  }
}