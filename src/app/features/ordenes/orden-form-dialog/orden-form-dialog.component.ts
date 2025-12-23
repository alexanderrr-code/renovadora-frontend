// orden-form-dialog.component.ts
import { Component, OnInit, inject, signal, Inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatRadioModule } from '@angular/material/radio';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ClienteService } from '../../../core/services/cliente.service';
import { OrdenService } from '../../../core/services/orden.service';
import { ClienteResponse } from '../../../core/models/cliente.model';
import { EstadoOrden, EstadoPago, OrdenRequest, ItemRequest, OrdenResponse } from '../../../core/models/orden.model';
import { Observable } from 'rxjs';
import { map, startWith, finalize } from 'rxjs/operators';
import { MatChip } from "@angular/material/chips";

interface DialogData {
  mode: 'create' | 'edit';
  orden?: OrdenResponse;
}

@Component({
  selector: 'app-orden-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatRadioModule,
    MatCardModule,
    MatSnackBarModule,
    MatAutocompleteModule,
    MatChip,
    MatProgressBarModule
  ],
  templateUrl: './orden-form-dialog.component.html',
  styleUrl: './orden-form-dialog.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush // OPTIMIZACIÓN
})
export class OrdenFormDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<OrdenFormDialogComponent>);
  private readonly clienteService = inject(ClienteService);
  private readonly ordenService = inject(OrdenService);
  private readonly snackBar = inject(MatSnackBar);

  // Signals para reactividad optimizada
  readonly clientes = signal<ClienteResponse[]>([]);
  readonly cargandoDatos = signal(false); // NUEVO: Loading general
  readonly guardando = signal(false);
  readonly saldoPendiente = signal<number>(0);

  readonly EstadoPago = EstadoPago;
  readonly mode: 'create' | 'edit';
  readonly ordenId?: number;
  readonly fechaMinima = new Date();

  form!: FormGroup;
  clienteControl = new FormControl<string | ClienteResponse>('');
  clientesFiltrados!: Observable<ClienteResponse[]>;
  clienteSeleccionado: ClienteResponse | null = null;

  // Getter para el icono dinámico
  get iconoModal(): string {
    return this.mode === 'create' ? 'add_circle' : 'edit';
  }

  get tituloModal(): string {
    return this.mode === 'create' ? 'Nueva Orden de Trabajo' : 'Editar Orden de Trabajo';
  }

  constructor(@Inject(MAT_DIALOG_DATA) public data: DialogData) {
    this.mode = data.mode;
    this.ordenId = data.orden?.id;
  }

  ngOnInit(): void {
    this.initForm();
    this.setupCalculoSaldo();
    this.setupAutocomplete();
    this.cargarDatosIniciales();
  }

  private initForm(): void {
    // Inicializar sin items si es edición (se cargarán después)
    const itemsIniciales = this.mode === 'create' ? [this.crearItemFormGroup()] : [];
    
    this.form = this.fb.group({
      clienteId: [null, Validators.required],
      items: this.fb.array(itemsIniciales, Validators.required),
      fechaEntrega: [null, Validators.required],
      horaEntrega: ['18:00', [Validators.required, this.validarHora.bind(this)]],
      costoTotal: [null, [Validators.required, Validators.min(0.01)]],
      tipoPago: [EstadoPago.PAGADO, Validators.required],
      adelanto: [{ value: null, disabled: true }]
    });
  }

  private setupAutocomplete(): void {
    this.clientesFiltrados = this.clienteControl.valueChanges.pipe(
      startWith(''),
      map(value => {
        const searchValue = typeof value === 'string' ? value : value?.nombreCompleto || '';
        return searchValue ? this.filtrarClientes(searchValue) : this.clientes().slice();
      })
    );
  }

  private filtrarClientes(valor: string): ClienteResponse[] {
    const filterValue = valor.toLowerCase();
    return this.clientes().filter(cliente =>
      cliente.nombreCompleto.toLowerCase().includes(filterValue) ||
      cliente.telefono.includes(valor)
    );
  }

  // OPTIMIZADO: Carga datos en paralelo y los aplica inmediatamente
  private cargarDatosIniciales(): void {
    this.cargandoDatos.set(true);

    this.clienteService.obtenerTodos()
      .pipe(finalize(() => this.cargandoDatos.set(false)))
      .subscribe({
        next: (clientes) => {
          this.clientes.set(clientes);
          
          // Si es edición, cargar datos inmediatamente (sin setTimeout)
          if (this.mode === 'edit' && this.data.orden) {
            this.cargarDatosOrden(this.data.orden);
          }
        },
        error: (error) => {
          console.error('Error al cargar clientes:', error);
          this.mostrarError('Error al cargar clientes');
        }
      });
  }

  // OPTIMIZADO: Cargar datos de forma sincrónica
  private cargarDatosOrden(orden: OrdenResponse): void {
    // Limpiar items existentes
    this.items.clear();

    // Agregar items
    if (orden.items?.length) {
      orden.items.forEach(item => {
        this.items.push(this.fb.group({
          tipoArticulo: [item.tipoArticulo, Validators.required],
          servicios: [item.servicios, Validators.required],
          descripcionProblema: [item.descripcionProblema, Validators.required],
          detallesSolucion: [item.detallesSolucion || '']
        }));
      });
    }

    // Configurar fecha y hora
    const fechaEntrega = new Date(orden.fechaEntregaEstimada);
    const horaFormatted = this.formatearHora(fechaEntrega);

    // Actualizar formulario
    this.form.patchValue({
      clienteId: orden.clienteId,
      fechaEntrega: fechaEntrega,
      horaEntrega: horaFormatted,
      costoTotal: orden.costoTotal,
      tipoPago: orden.estadoPago,
      adelanto: orden.adelanto
    });

    // Configurar cliente seleccionado
    const clienteEncontrado = this.clientes().find(c => c.id === orden.clienteId);
    if (clienteEncontrado) {
      this.clienteControl.setValue(clienteEncontrado);
      this.clienteSeleccionado = clienteEncontrado;
    }

    // Forzar actualización
    this.form.updateValueAndValidity();
  }

  private formatearHora(fecha: Date): string {
    return fecha.getHours().toString().padStart(2, '0') + ':' + 
           fecha.getMinutes().toString().padStart(2, '0');
  }

  displayCliente(cliente: ClienteResponse): string {
    return cliente ? `${cliente.nombreCompleto} - ${cliente.telefono}` : '';
  }

  onClienteSeleccionado(cliente: ClienteResponse): void {
    this.clienteSeleccionado = cliente;
    this.form.patchValue({ clienteId: cliente.id });
  }

  limpiarCliente(): void {
    this.clienteControl.setValue('');
    this.clienteSeleccionado = null;
    this.form.patchValue({ clienteId: null });
  }

  validarHora(control: FormControl): { [key: string]: boolean } | null {
    const valor = control.value;
    if (!valor) return null;
    
    const regex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    return regex.test(valor) ? null : { formatoInvalido: true };
  }

  crearItemFormGroup(): FormGroup {
    return this.fb.group({
      tipoArticulo: ['', Validators.required],
      servicios: ['', Validators.required],
      descripcionProblema: ['', Validators.required],
      detallesSolucion: ['']
    });
  }

  get items(): FormArray {
    return this.form.get('items') as FormArray;
  }

  agregarItem(): void {
    this.items.push(this.crearItemFormGroup());
  }

  eliminarItem(index: number): void {
    if (this.items.length > 1) {
      this.items.removeAt(index);
    } else {
      this.mostrarInfo('Debe haber al menos un ítem en la orden');
    }
  }

  private setupCalculoSaldo(): void {
    // Listener para tipo de pago
    this.form.get('tipoPago')?.valueChanges.subscribe(tipo => {
      const adelantoControl = this.form.get('adelanto');
      const costoTotal = this.form.get('costoTotal')?.value || 0;
      
      if (tipo === EstadoPago.DEBE) {
        adelantoControl?.enable();
        adelantoControl?.setValue(0);
      } else {
        adelantoControl?.setValue(costoTotal);
        adelantoControl?.disable();
      }
      this.calcularSaldo();
    });

    // Listener para costo total
    this.form.get('costoTotal')?.valueChanges.subscribe((nuevoTotal) => {
      if (this.form.get('tipoPago')?.value === EstadoPago.PAGADO) {
        this.form.get('adelanto')?.setValue(nuevoTotal);
      }
      this.calcularSaldo();
    });

    // Listener para adelanto
    this.form.get('adelanto')?.valueChanges.subscribe(() => this.calcularSaldo());
  }

  private calcularSaldo(): void {
    const costoTotal = this.form.get('costoTotal')?.value || 0;
    const adelanto = this.form.get('adelanto')?.value || 0;
    this.saldoPendiente.set(Math.max(0, costoTotal - adelanto));
  }

  onSubmit(): void {
    // Validaciones
    if (!this.clienteSeleccionado) {
      this.mostrarError('Debe seleccionar un cliente válido');
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.mostrarError('Complete todos los campos obligatorios');
      return;
    }

    const formValue = this.form.getRawValue();
    const costoTotal = parseFloat(formValue.costoTotal);
    const adelanto = parseFloat(formValue.adelanto || 0);

    if (adelanto > costoTotal) {
      this.mostrarError('El adelanto no puede ser mayor al costo total');
      return;
    }

    // Construir request
    const request = this.construirRequest(formValue, costoTotal, adelanto);

    // Guardar
    this.guardando.set(true);
    const operacion = this.mode === 'create'
      ? this.ordenService.crear(request)
      : this.ordenService.actualizar(this.ordenId!, request);

    operacion
      .pipe(finalize(() => this.guardando.set(false)))
      .subscribe({
        next: (response) => this.dialogRef.close(response),
        error: (error) => {
          console.error('Error al guardar orden:', error);
          this.mostrarError(error.error?.message || 'Error al guardar la orden');
        }
      });
  }

  private construirRequest(formValue: any, costoTotal: number, adelanto: number): OrdenRequest {
    const fechaEntrega = new Date(formValue.fechaEntrega);
    const [hora, minuto] = formValue.horaEntrega.split(':');
    fechaEntrega.setHours(parseInt(hora), parseInt(minuto), 0, 0);

    return {
      clienteId: formValue.clienteId,
      items: formValue.items.map((item: any, index: number) => ({
        numeroItem: index + 1,
        tipoArticulo: item.tipoArticulo,
        servicios: item.servicios,
        descripcionProblema: item.descripcionProblema,
        detallesSolucion: item.detallesSolucion || ''
      } as ItemRequest)),
      estado: EstadoOrden.PENDIENTE,
      estadoPago: formValue.tipoPago,
      costoTotal: costoTotal,
      adelanto: adelanto,
      fechaIngreso: this.formatearFechaISO(new Date()),
      fechaEntregaEstimada: this.formatearFechaISO(fechaEntrega)
    };
  }

  private formatearFechaISO(fecha: Date): string {
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, '0');
    const day = String(fecha.getDate()).padStart(2, '0');
    const hours = String(fecha.getHours()).padStart(2, '0');
    const minutes = String(fecha.getMinutes()).padStart(2, '0');
    const seconds = String(fecha.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  // Mensajes centralizados
  private mostrarError(mensaje: string): void {
    this.snackBar.open(mensaje, 'OK', { duration: 3000 });
  }

  private mostrarInfo(mensaje: string): void {
    this.snackBar.open(mensaje, 'OK', { duration: 3000 });
  }
}