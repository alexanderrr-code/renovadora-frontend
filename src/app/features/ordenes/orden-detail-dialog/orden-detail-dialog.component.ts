// orden-detail-dialog.component.ts - CORREGIDO FINAL
import { Component, inject, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { OrdenResponse, EstadoOrden, EstadoPago } from '../../../core/models/orden.model';
import { OrdenService } from '../../../core/services/orden.service';
import { PagoFormDialogComponent } from '../../pagos/pago-form-dialog/pago-form-dialog.component';

@Component({
  selector: 'app-orden-detail-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule
  ],
  templateUrl: './orden-detail-dialog.component.html',
  styleUrl: './orden-detail-dialog.component.css'
})
export class OrdenDetailDialogComponent {
  private dialogRef = inject(MatDialogRef<OrdenDetailDialogComponent>);
  private dialog = inject(MatDialog);
  private ordenService = inject(OrdenService);
  
  orden: OrdenResponse;
  readonly EstadoPago = EstadoPago;
  // ✅ NUEVO: Flag para indicar si hubo cambios
  huboCambios = false;

  constructor(@Inject(MAT_DIALOG_DATA) public data: { orden: OrdenResponse }) {
    this.orden = data.orden;
  }

  cerrar() {
    // ✅ CAMBIO: Notificar si hubo cambios
    if (this.huboCambios) {
      this.dialogRef.close('updated');
    } else {
      this.dialogRef.close();
    }
  }

  registrarPago() {
    const dialogRef = this.dialog.open(PagoFormDialogComponent, {
      width: '500px',
      disableClose: true,
      data: { orden: this.orden }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        console.log('Pago registrado, resultado:', result);
        
        if (typeof result === 'object' && result.id) {
          this.orden = result;
          this.huboCambios = true;
          console.log('Orden actualizada en el modal:', this.orden);
        } else {
          this.recargarOrden();
        }
      }
    });
  }

  recargarOrden() {
    this.ordenService.obtenerPorId(this.orden.id).subscribe({
      next: (ordenActualizada) => {
        console.log('Orden recargada desde backend:', ordenActualizada);
        this.orden = ordenActualizada;
        this.huboCambios = true;
      },
      error: (error) => {
        console.error('Error al recargar orden:', error);
      }
    });
  }

  formatearFechaCorta(fecha: string): string {
    const date = new Date(fecha);
    return date.toLocaleDateString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  formatearHora(fecha: string): string {
    const date = new Date(fecha);
    return date.toLocaleTimeString('es-PE', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatearFechaCompleta(fecha: string): string {
    return `${this.formatearFechaCorta(fecha)} - ${this.formatearHora(fecha)}`;
  }

  esOrdenAtrasada(): boolean {
    const hoy = new Date();
    const fechaEntrega = new Date(this.orden.fechaEntregaEstimada);
    return fechaEntrega < hoy && this.orden.estado !== EstadoOrden.ENTREGADO;
  }

  esOrdenHoy(): boolean {
    const hoy = new Date();
    const fechaEntrega = new Date(this.orden.fechaEntregaEstimada);
    return (
      fechaEntrega.getDate() === hoy.getDate() &&
      fechaEntrega.getMonth() === hoy.getMonth() &&
      fechaEntrega.getFullYear() === hoy.getFullYear()
    );
  }

  getEstadoBadgeClass(): string {
    switch (this.orden.estado) {
      case EstadoOrden.PENDIENTE: return 'badge-pending';
      case EstadoOrden.EN_PROCESO: return 'badge-process';
      case EstadoOrden.LISTO: return 'badge-ready';
      case EstadoOrden.ENTREGADO: return 'badge-delivered';
      default: return '';
    }
  }
}