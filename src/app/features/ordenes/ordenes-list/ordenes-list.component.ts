/*ordenes-list.component.ts*/
import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatMenuModule } from '@angular/material/menu';
import { OrdenService } from '../../../core/services/orden.service';
import { OrdenResponse, EstadoOrden, EstadoPago } from '../../../core/models/orden.model';
import { OrdenFormDialogComponent } from '../orden-form-dialog/orden-form-dialog.component';
import { OrdenDetailDialogComponent } from '../orden-detail-dialog/orden-detail-dialog.component';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-ordenes-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatTooltipModule,
    MatCardModule,
    MatSnackBarModule,
    MatMenuModule
  ],
  templateUrl: './ordenes-list.component.html',
  styleUrl: './ordenes-list.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush // OPTIMIZACIÓN
})
export class OrdenesListComponent implements OnInit {
  private readonly ordenService = inject(OrdenService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  // Usar signals para mejor rendimiento
  readonly ordenes = signal<OrdenResponse[]>([]);
  readonly ordenesFiltradas = signal<OrdenResponse[]>([]);
  readonly loading = signal(true);
  readonly searchTerm = signal('');
  readonly estadoFiltro = signal<string>('TODOS');
  
  readonly displayedColumns: string[] = [
    'codigo',
    'cliente',
    'items',
    'estado',
    'estadoPago',
    'fechaIngreso',
    'fechaEntrega',
    'total',
    'acciones'
  ];

  readonly estadosOrden = Object.values(EstadoOrden);
  readonly EstadoOrden = EstadoOrden;
  readonly EstadoPago = EstadoPago;

  ngOnInit(): void {
    this.cargarOrdenes();
  }

  cargarOrdenes(): void {
    this.loading.set(true);
    
    this.ordenService.obtenerTodas()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (data) => {
          const ordenesOrdenadas = this.ordenarPorFechaEntrega(data);
          this.ordenes.set(ordenesOrdenadas);
          this.aplicarFiltros();
        },
        error: (error) => {
          console.error('Error al cargar órdenes:', error);
          this.mostrarError('Error al cargar las órdenes');
        }
      });
  }

  private ordenarPorFechaEntrega(ordenes: OrdenResponse[]): OrdenResponse[] {
    return [...ordenes].sort((a, b) => 
      new Date(a.fechaEntregaEstimada).getTime() - new Date(b.fechaEntregaEstimada).getTime()
    );
  }

  buscar(termino: string): void {
    this.searchTerm.set(termino);
    this.aplicarFiltros();
  }

  filtrarPorEstado(estado: string): void {
    this.estadoFiltro.set(estado);
    this.aplicarFiltros();
  }

  aplicarFiltros(): void {
    let resultado = [...this.ordenes()];

    // Filtrar por término de búsqueda
    const termino = this.searchTerm().toLowerCase();
    if (termino) {
      resultado = resultado.filter(orden =>
        orden.codigo.toLowerCase().includes(termino) ||
        orden.clienteNombre.toLowerCase().includes(termino) ||
        orden.clienteTelefono.includes(termino)
      );
    }

    // Filtrar por estado
    if (this.estadoFiltro() !== 'TODOS') {
      resultado = resultado.filter(orden => orden.estado === this.estadoFiltro());
    }

    this.ordenesFiltradas.set(resultado);
  }

  abrirFormularioNuevaOrden(): void {
    const dialogRef = this.dialog.open(OrdenFormDialogComponent, {
      width: '1000px',
      maxHeight: '90vh',
      disableClose: true,
      data: { mode: 'create' } // ✅ Pasar modo explícitamente
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.cargarOrdenes();
        this.mostrarExito('Orden creada exitosamente');
      }
    });
  }

  verDetalle(orden: OrdenResponse): void {
    const dialogRef = this.dialog.open(OrdenDetailDialogComponent, {
      width: '1000px',
      maxHeight: '90vh',
      data: { orden }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === 'updated') {
        this.cargarOrdenes();
      }
    });
  }

  // OPTIMIZADO: Ya NO hace petición adicional, pasa la orden directamente
  editarOrden(orden: OrdenResponse): void {
    const dialogRef = this.dialog.open(OrdenFormDialogComponent, {
      width: '1000px',
      maxHeight: '90vh',
      disableClose: true,
      data: { 
        mode: 'edit',
        orden: orden // Pasar la orden directamente sin nueva petición
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.cargarOrdenes();
        this.mostrarExito('Orden actualizada exitosamente');
      }
    });
  }

  cambiarEstado(orden: OrdenResponse, nuevoEstado: EstadoOrden): void {
    if (orden.estado === nuevoEstado) {
      this.mostrarInfo('La orden ya está en ese estado');
      return;
    }

    this.ordenService.cambiarEstado(orden.id, nuevoEstado).subscribe({
      next: () => {
        this.mostrarExito(`Estado cambiado a ${nuevoEstado}`);
        this.cargarOrdenes();
      },
      error: (error) => {
        console.error('Error al cambiar estado:', error);
        this.mostrarError('Error al cambiar el estado');
      }
    });
  }

  eliminarOrden(orden: OrdenResponse, event: Event): void {
    event.stopPropagation();

    const mensaje = `¿Eliminar la orden ${orden.codigo}?\n\n` +
                   `Cliente: ${orden.clienteNombre}\n` +
                   `Total: S/. ${orden.costoTotal.toFixed(2)}\n\n` +
                   `Esta acción no se puede deshacer.`;

    if (!confirm(mensaje)) return;

    this.ordenService.eliminar(orden.id).subscribe({
      next: () => {
        this.mostrarExito('Orden eliminada exitosamente');
        this.cargarOrdenes();
      },
      error: (error) => {
        console.error('Error al eliminar orden:', error);
        this.mostrarError('Error al eliminar la orden');
      }
    });
  }

  // Métodos de utilidad mejorados
  getEstadoIcon(estado: EstadoOrden): string {
    const iconos: Record<EstadoOrden, string> = {
      [EstadoOrden.PENDIENTE]: 'pending_actions',
      [EstadoOrden.EN_PROCESO]: 'engineering',
      [EstadoOrden.LISTO]: 'check_circle',
      [EstadoOrden.ENTREGADO]: 'task_alt'
    };
    return iconos[estado] || 'help';
  }

  getEstadoBadgeClass(estado: EstadoOrden): string {
    const clases: Record<EstadoOrden, string> = {
      [EstadoOrden.PENDIENTE]: 'badge-pending',
      [EstadoOrden.EN_PROCESO]: 'badge-process',
      [EstadoOrden.LISTO]: 'badge-ready',
      [EstadoOrden.ENTREGADO]: 'badge-delivered'
    };
    return clases[estado] || '';
  }

  getEstadoPagoBadgeClass(estadoPago: EstadoPago): string {
    return estadoPago === EstadoPago.PAGADO ? 'badge-paid' : 'badge-debt';
  }

  esOrdenAtrasada(orden: OrdenResponse): boolean {
    const hoy = new Date();
    const fechaEntrega = new Date(orden.fechaEntregaEstimada);
    return fechaEntrega < hoy && orden.estado !== EstadoOrden.ENTREGADO;
  }

  esOrdenHoy(orden: OrdenResponse): boolean {
    const hoy = new Date();
    const fechaEntrega = new Date(orden.fechaEntregaEstimada);
    return (
      fechaEntrega.getDate() === hoy.getDate() &&
      fechaEntrega.getMonth() === hoy.getMonth() &&
      fechaEntrega.getFullYear() === hoy.getFullYear()
    );
  }

  formatearFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatearFechaCorta(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  formatearHora(fecha: string): string {
    return new Date(fecha).toLocaleTimeString('es-PE', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // ✅ Mensajes centralizados
  private mostrarExito(mensaje: string): void {
    this.snackBar.open(mensaje, 'OK', { 
      duration: 3000,
      panelClass: ['snackbar-success']
    });
  }

  private mostrarError(mensaje: string): void {
    this.snackBar.open(mensaje, 'OK', { 
      duration: 3000,
      panelClass: ['snackbar-error']
    });
  }

  private mostrarInfo(mensaje: string): void {
    this.snackBar.open(mensaje, 'OK', { 
      duration: 3000,
      panelClass: ['snackbar-info']
    });
  }
}