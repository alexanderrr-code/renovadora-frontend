/*ordenes-list.component.ts*/
import { Component, OnInit, inject, signal } from '@angular/core';
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
  styleUrl: './ordenes-list.component.css'
})
export class OrdenesListComponent implements OnInit {
  private ordenService = inject(OrdenService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  ordenes = signal<OrdenResponse[]>([]);
  ordenesFiltradas = signal<OrdenResponse[]>([]);
  loading = signal(true);
  
  searchTerm = signal('');
  estadoFiltro = signal<string>('TODOS');
  
  displayedColumns: string[] = [
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

  estadosOrden = Object.values(EstadoOrden);
  
  readonly EstadoOrden = EstadoOrden;
  readonly EstadoPago = EstadoPago;

  ngOnInit() {
    this.cargarOrdenes();
  }

  cargarOrdenes() {
    this.loading.set(true);
    this.ordenService.obtenerTodas().subscribe({
      next: (data) => {
        console.log('Órdenes cargadas:', data);
        const ordenesOrdenadas = data.sort((a, b) => 
          new Date(a.fechaEntregaEstimada).getTime() - new Date(b.fechaEntregaEstimada).getTime()
        );
        this.ordenes.set(ordenesOrdenadas);
        this.aplicarFiltros();
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error al cargar órdenes:', error);
        this.loading.set(false);
      }
    });
  }

  buscar(termino: string) {
    this.searchTerm.set(termino);
    this.aplicarFiltros();
  }

  filtrarPorEstado(estado: string) {
    this.estadoFiltro.set(estado);
    this.aplicarFiltros();
  }

  aplicarFiltros() {
    let resultado = [...this.ordenes()];

    const termino = this.searchTerm().toLowerCase();
    if (termino) {
      resultado = resultado.filter(orden =>
        orden.codigo.toLowerCase().includes(termino) ||
        orden.clienteNombre.toLowerCase().includes(termino) ||
        orden.clienteTelefono.includes(termino)
      );
    }

    if (this.estadoFiltro() !== 'TODOS') {
      resultado = resultado.filter(orden => 
        orden.estado === this.estadoFiltro()
      );
    }

    this.ordenesFiltradas.set(resultado);
  }

  abrirFormularioNuevaOrden() {
    const dialogRef = this.dialog.open(OrdenFormDialogComponent, {
      width: '1000px',
      maxHeight: '90vh',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        console.log('Nueva orden creada, recargando lista...');
        this.cargarOrdenes();
      }
    });
  }

  verDetalle(orden: OrdenResponse) {
    const dialogRef = this.dialog.open(OrdenDetailDialogComponent, {
      width: '1000px',
      maxHeight: '90vh',
      data: { orden }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === 'updated') {
        console.log('✅ Orden actualizada desde detalle, recargando lista...');
        this.cargarOrdenes();
      }
    });
  }

  editarOrden(orden: OrdenResponse) {

    this.ordenService.obtenerPorId(orden.id).subscribe({
      next: (ordenCompleta) => {
        console.log('📦 Orden completa obtenida para editar:', ordenCompleta);
        console.log('📊 Items en la orden:', ordenCompleta.items?.length || 0);
        
        const dialogRef = this.dialog.open(OrdenFormDialogComponent, {
          width: '1000px',
          maxHeight: '90vh',
          disableClose: true,
          data: { orden: ordenCompleta }
        });

        dialogRef.afterClosed().subscribe(result => {
          if (result) {
            console.log('✅ Orden editada, recargando lista...');
            this.cargarOrdenes();
          }
        });
      },
      error: (error) => {
        console.error('❌ Error al obtener orden completa:', error);
        this.snackBar.open('Error al cargar los datos de la orden', 'OK', { duration: 3000 });
      }
    });
  }

  cambiarEstado(orden: OrdenResponse, nuevoEstado: EstadoOrden) {
    if (orden.estado === nuevoEstado) {
      this.snackBar.open('La orden ya está en ese estado', 'OK', { duration: 3000 });
      return;
    }

    this.ordenService.cambiarEstado(orden.id, nuevoEstado).subscribe({
      next: (ordenActualizada) => {
        this.snackBar.open(`Estado cambiado a ${nuevoEstado}`, 'OK', { duration: 3000 });
        this.cargarOrdenes();
      },
      error: (error) => {
        console.error('Error al cambiar estado:', error);
        this.snackBar.open('Error al cambiar el estado', 'OK', { duration: 3000 });
      }
    });
  }

  eliminarOrden(orden: OrdenResponse, event: Event) {
    event.stopPropagation();

    const confirmar = confirm(
      `¿Estás seguro de eliminar la orden ${orden.codigo}?\n\n` +
      `Cliente: ${orden.clienteNombre}\n` +
      `Total: S/. ${orden.costoTotal.toFixed(2)}\n\n` +
      `Esta acción no se puede deshacer.`
    );

    if (!confirmar) return;

    this.ordenService.eliminar(orden.id).subscribe({
      next: () => {
        this.snackBar.open('Orden eliminada exitosamente', 'OK', { duration: 3000 });
        this.cargarOrdenes();
      },
      error: (error) => {
        console.error('Error al eliminar orden:', error);
        this.snackBar.open('Error al eliminar la orden', 'OK', { duration: 3000 });
      }
    });
  }

  getEstadoIcon(estado: EstadoOrden): string {
    switch (estado) {
      case EstadoOrden.PENDIENTE: return 'pending_actions';
      case EstadoOrden.EN_PROCESO: return 'engineering';
      case EstadoOrden.LISTO: return 'check_circle';
      case EstadoOrden.ENTREGADO: return 'task_alt';
      default: return 'help';
    }
  }

  getEstadoBadgeClass(estado: EstadoOrden): string {
    switch (estado) {
      case EstadoOrden.PENDIENTE: return 'badge-pending';
      case EstadoOrden.EN_PROCESO: return 'badge-process';
      case EstadoOrden.LISTO: return 'badge-ready';
      case EstadoOrden.ENTREGADO: return 'badge-delivered';
      default: return '';
    }
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
    const date = new Date(fecha);
    return date.toLocaleDateString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
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
}