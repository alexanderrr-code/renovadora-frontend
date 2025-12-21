/* pago.service.ts */
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PagoRequest, PagoResponse } from '../models/pago.model';
import { API_ENDPOINTS } from '../constants/api.constants';

@Injectable({
  providedIn: 'root'
})
export class PagoService {
  private http = inject(HttpClient);

  obtenerTodos(): Observable<PagoResponse[]> {
    return this.http.get<PagoResponse[]>(API_ENDPOINTS.pagos);
  }

  obtenerPorOrden(ordenId: number): Observable<PagoResponse[]> {
    return this.http.get<PagoResponse[]>(`${API_ENDPOINTS.pagos}/orden/${ordenId}`);
  }

  registrar(pago: PagoRequest): Observable<PagoResponse> {
    return this.http.post<PagoResponse>(API_ENDPOINTS.pagos, pago);
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${API_ENDPOINTS.pagos}/${id}`);
  }
}
