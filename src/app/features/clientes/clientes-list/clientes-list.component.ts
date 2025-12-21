/* clientes-list.component.ts */
import { Component, OnInit, inject, signal } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCardModule } from '@angular/material/card';
import { ClienteService } from '../../../core/services/cliente.service';
import { ClienteResponse } from '../../../core/models/cliente.model';
import { ClienteFormDialogComponent } from '../cliente-form-dialog/cliente-form-dialog.component';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Router } from '@angular/router';

@Component({
  selector: 'app-clientes-list',
  standalone: true,
  imports: [
    FormsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatTooltipModule,
    MatCardModule,
    MatSnackBarModule
],
  templateUrl: './clientes-list.component.html',
  styleUrl: './clientes-list.component.css'
})
export class ClientesListComponent implements OnInit {
  private clienteService = inject(ClienteService);
  private dialog = inject(MatDialog);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  clientes = signal<ClienteResponse[]>([]);
  clientesFiltrados = signal<ClienteResponse[]>([]);
  loading = signal(true);
  
  searchTerm = signal('');
  
  displayedColumns: string[] = [
    'nombreCompleto',
    'telefono',
    'email',
    'totalOrdenes',
    'ultimaVisita',
    'acciones'
  ];

  ngOnInit() {
    this.cargarClientes();
  }

  cargarClientes() {
    this.loading.set(true);
    this.clienteService.obtenerTodos().subscribe({
      next: (data) => {
        console.log('Clientes cargados:', data);
        this.clientes.set(data);
        this.aplicarFiltros();
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error al cargar clientes:', error);
        this.loading.set(false);
      }
    });
  }

  buscar(termino: string) {
    this.searchTerm.set(termino);
    this.aplicarFiltros();
  }

  aplicarFiltros() {
    let resultado = [...this.clientes()];

    const termino = this.searchTerm().toLowerCase();
    if (termino) {
      resultado = resultado.filter(cliente =>
        cliente.nombreCompleto.toLowerCase().includes(termino) ||
        cliente.telefono.includes(termino)
      );
    }

    this.clientesFiltrados.set(resultado);
  }

    eliminarCliente(cliente: ClienteResponse, event: Event) {
    event.stopPropagation();

    const confirmar = confirm(
      `¿Estás seguro de eliminar el cliente ${cliente.nombreCompleto}?\n\n` +
      `Teléfono: ${cliente.telefono}\n` +
      `Total Órdenes: ${cliente.totalOrdenes}\n\n` +
      `Esta acción no se puede deshacer.`
    );

    if (!confirmar) return;

    this.clienteService.eliminar(cliente.id).subscribe({
      next: () => {
        this.snackBar.open('Cliente eliminado exitosamente', 'OK', { duration: 3000 });
        this.cargarClientes();
      },
      error: (error) => {
        console.error('Error al eliminar cliente:', error);
        this.snackBar.open('Error al eliminar el cliente', 'OK', { duration: 3000 });
      }
    });
  }

  abrirFormularioNuevoCliente() {
    const dialogRef = this.dialog.open(ClienteFormDialogComponent, {
      width: '600px',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.cargarClientes();
      }
    });
  }

  editarCliente(cliente: ClienteResponse) {
    const dialogRef = this.dialog.open(ClienteFormDialogComponent, {
      width: '600px',
      disableClose: true,
      data: { cliente }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.cargarClientes();
      }
    });
  }

  verOrdenesCliente(cliente: ClienteResponse) {
    // Navegar a órdenes con filtro por cliente
    this.router.navigate(['/ordenes'], { 
      queryParams: { clienteId: cliente.id } 
    });
  }

  formatearFecha(fecha: string | null): string {
    if (!fecha) return 'Sin visitas';
    
    const date = new Date(fecha);
    return date.toLocaleDateString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }
}