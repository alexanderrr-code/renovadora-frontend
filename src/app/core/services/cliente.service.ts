/* cliente.service.ts */
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ClienteRequest, ClienteResponse } from '../models/cliente.model';
import { API_ENDPOINTS } from '../constants/api.constants';

@Injectable({
  providedIn: 'root'
})
export class ClienteService {
  private http = inject(HttpClient);

  obtenerTodos(): Observable<ClienteResponse[]> {
    return this.http.get<ClienteResponse[]>(API_ENDPOINTS.clientes);
  }

  obtenerPorId(id: number): Observable<ClienteResponse> {
    return this.http.get<ClienteResponse>(`${API_ENDPOINTS.clientes}/${id}`);
  }

  buscar(termino: string): Observable<ClienteResponse[]> {
    return this.http.get<ClienteResponse[]>(`${API_ENDPOINTS.clientes}/buscar?q=${termino}`);
  }

  crear(cliente: ClienteRequest): Observable<ClienteResponse> {
    return this.http.post<ClienteResponse>(API_ENDPOINTS.clientes, cliente);
  }

  actualizar(id: number, cliente: ClienteRequest): Observable<ClienteResponse> {
    return this.http.put<ClienteResponse>(`${API_ENDPOINTS.clientes}/${id}`, cliente);
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${API_ENDPOINTS.clientes}/${id}`);
  }
}
