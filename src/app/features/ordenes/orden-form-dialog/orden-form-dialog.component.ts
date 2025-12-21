// orden-form-dialog.component.ts
import { Component, OnInit, inject, signal, Inject, ChangeDetectorRef } from '@angular/core';
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
import { ClienteService } from '../../../core/services/cliente.service';
import { OrdenService } from '../../../core/services/orden.service';
import { ClienteResponse } from '../../../core/models/cliente.model';
import { EstadoOrden, EstadoPago, OrdenRequest, ItemRequest, OrdenResponse } from '../../../core/models/orden.model';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { MatChip } from "@angular/material/chips";

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
    MatChip
  ],
  templateUrl: './orden-form-dialog.component.html',
  styleUrl: './orden-form-dialog.component.css'
})
export class OrdenFormDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<OrdenFormDialogComponent>);
  private clienteService = inject(ClienteService);
  private ordenService = inject(OrdenService);
  private snackBar = inject(MatSnackBar);
  private cdr = inject(ChangeDetectorRef);

  clientes = signal<ClienteResponse[]>([]);
  loadingClientes = signal(true);
  guardando = signal(false);

  form!: FormGroup;
  saldoPendiente = signal<number>(0);
  readonly EstadoPago = EstadoPago;
  mode: 'create' | 'edit' = 'create';
  ordenId?: number;

  clienteControl = new FormControl<string | ClienteResponse>('');
  clientesFiltrados!: Observable<ClienteResponse[]>;
  clienteSeleccionado: ClienteResponse | null = null;

  fechaMinima = new Date();

  constructor(@Inject(MAT_DIALOG_DATA) public data?: { orden?: OrdenResponse }) {
    console.log('Constructor - Modo:', data?.orden ? 'EDITAR' : 'CREAR');
    if (data?.orden) {
      this.mode = 'edit';
      this.ordenId = data.orden.id;
      console.log('Items en constructor:', data.orden.items);
    }
  }

  ngOnInit() {
    console.log('ngOnInit');
    this.initForm();
    this.setupCalculoSaldo();
    this.setupAutocomplete();
    this.cargarClientes();
  }

  initForm() {
    //Solo inicializar con un item vacío si estamos en modo CREATE
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
    
    console.log('Form inicializado con', this.items.length, 'items');
  }

  setupAutocomplete() {
    this.clientesFiltrados = this.clienteControl.valueChanges.pipe(
      startWith(''),
      map(value => {
        const searchValue = typeof value === 'string' ? value : value?.nombreCompleto || '';
        return searchValue ? this._filtrarClientes(searchValue) : this.clientes().slice();
      })
    );
  }

  private _filtrarClientes(valor: string): ClienteResponse[] {
    const filterValue = valor.toLowerCase();
    return this.clientes().filter(cliente =>
      cliente.nombreCompleto.toLowerCase().includes(filterValue) ||
      cliente.telefono.includes(valor)
    );
  }

  displayCliente(cliente: ClienteResponse): string {
    return cliente ? `${cliente.nombreCompleto} - ${cliente.telefono}` : '';
  }

  onClienteSeleccionado(cliente: ClienteResponse) {
    this.clienteSeleccionado = cliente;
    this.form.patchValue({ clienteId: cliente.id });
    console.log('Cliente seleccionado:', cliente);
  }

  limpiarCliente() {
    this.clienteControl.setValue('');
    this.clienteSeleccionado = null;
    this.form.patchValue({ clienteId: null });
  }

  validarHora(control: any) {
    const valor = control.value;
    if (!valor) return null;
    
    const regex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!regex.test(valor)) {
      return { formatoInvalido: true };
    }
    
    return null;
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

  agregarItem() {
    this.items.push(this.crearItemFormGroup());
    // Forzar detección de cambios después de agregar
    this.cdr.detectChanges();
  }

  eliminarItem(index: number) {
    if (this.items.length > 1) {
      this.items.removeAt(index);
      // Forzar detección de cambios después de eliminar
      this.cdr.detectChanges();
    } else {
      this.snackBar.open('Debe haber al menos un ítem en la orden', 'OK', { duration: 3000 });
    }
  }

  cargarClientes() {
    console.log('Cargando clientes...');
    this.clienteService.obtenerTodos().subscribe({
      next: (data) => {
        console.log('Clientes cargados:', data.length);
        this.clientes.set(data);
        this.loadingClientes.set(false);
        this.clienteControl.updateValueAndValidity();
        
        // Si estamos en modo edición, cargar los datos de la orden
        if (this.mode === 'edit' && this.data?.orden) {
          console.log('Modo edición: cargando datos de orden...');
          // Sin setTimeout - cargar inmediatamente
          this.cargarDatosOrden(this.data.orden);
        }
      },
      error: (error) => {
        console.error('Error al cargar clientes:', error);
        this.loadingClientes.set(false);
        this.snackBar.open('Error al cargar clientes', 'OK', { duration: 3000 });
      }
    });
  }

  cargarDatosOrden(orden: OrdenResponse) {

    // Limpiar items existentes
    while (this.items.length > 0) {
      this.items.removeAt(0);
    }

    // Agregar items de la orden
    if (orden.items && orden.items.length > 0) {
      orden.items.forEach((item, index) => {
        console.log(`  Item ${index + 1}:`, item);
        this.items.push(this.fb.group({
          tipoArticulo: [item.tipoArticulo, Validators.required],
          servicios: [item.servicios, Validators.required],
          descripcionProblema: [item.descripcionProblema, Validators.required],
          detallesSolucion: [item.detallesSolucion || '']
        }));
      });
      console.log('Items agregados (cantidad actual:', this.items.length, ')');
      console.log('Valores:', this.items.value);
    } else {
      console.warn('No hay items en la orden');
    }

    // Configurar fecha y hora
    const fechaEntrega = new Date(orden.fechaEntregaEstimada);
    const hora = fechaEntrega.getHours().toString().padStart(2, '0');
    const minuto = fechaEntrega.getMinutes().toString().padStart(2, '0');

    // Actualizar formulario
    this.form.patchValue({
      clienteId: orden.clienteId,
      fechaEntrega: fechaEntrega,
      horaEntrega: `${hora}:${minuto}`,
      costoTotal: orden.costoTotal,
      tipoPago: orden.estadoPago,
      adelanto: orden.adelanto
    });

    // Configurar cliente seleccionado
    const clienteEncontrado = this.clientes().find(c => c.id === orden.clienteId);
    if (clienteEncontrado) {
      this.clienteControl.setValue(clienteEncontrado);
      this.clienteSeleccionado = clienteEncontrado;
    } else {

    }

    // Forzar actualización
    this.items.updateValueAndValidity();
    this.form.updateValueAndValidity();
    this.cdr.detectChanges();
    

  }

  setupCalculoSaldo() {
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

    this.form.get('costoTotal')?.valueChanges.subscribe((nuevoTotal) => {
      const tipoPago = this.form.get('tipoPago')?.value;
      if (tipoPago === EstadoPago.PAGADO) {
        this.form.get('adelanto')?.setValue(nuevoTotal);
      }
      this.calcularSaldo();
    });

    this.form.get('adelanto')?.valueChanges.subscribe(() => this.calcularSaldo());
  }

  calcularSaldo() {
    const costoTotal = this.form.get('costoTotal')?.value || 0;
    const adelanto = this.form.get('adelanto')?.value || 0;
    const saldo = costoTotal - adelanto;
    this.saldoPendiente.set(saldo > 0 ? saldo : 0);
  }

  onSubmit() {
    if (!this.clienteSeleccionado) {
      this.snackBar.open('Debe seleccionar un cliente válido', 'OK', { duration: 3000 });
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.snackBar.open('Por favor complete todos los campos obligatorios', 'OK', { duration: 3000 });
      return;
    }

    const formValue = this.form.getRawValue();
    const costoTotal = parseFloat(formValue.costoTotal);
    const adelanto = parseFloat(formValue.adelanto || 0);

    if (adelanto > costoTotal) {
      this.snackBar.open('El adelanto no puede ser mayor al costo total', 'OK', { duration: 3000 });
      return;
    }

    const fechaEntrega = new Date(formValue.fechaEntrega);
    const [hora, minuto] = formValue.horaEntrega.split(':');
    fechaEntrega.setHours(parseInt(hora), parseInt(minuto), 0, 0);

    const formatearFecha = (fecha: Date): string => {
      const year = fecha.getFullYear();
      const month = String(fecha.getMonth() + 1).padStart(2, '0');
      const day = String(fecha.getDate()).padStart(2, '0');
      const hours = String(fecha.getHours()).padStart(2, '0');
      const minutes = String(fecha.getMinutes()).padStart(2, '0');
      const seconds = String(fecha.getSeconds()).padStart(2, '0');
      
      return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
    };

    const request: OrdenRequest = {
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
      fechaIngreso: formatearFecha(new Date()),
      fechaEntregaEstimada: formatearFecha(fechaEntrega)
    };

    console.log(' Request:', JSON.stringify(request, null, 2));

    this.guardando.set(true);

    if (this.mode === 'create') {
      this.ordenService.crear(request).subscribe({
        next: (response) => {
          this.snackBar.open('Orden creada exitosamente', 'OK', { duration: 3000 });
          this.dialogRef.close(response);
        },
        error: (error) => {
          console.error(' Error:', error);
          this.guardando.set(false);
          this.snackBar.open(error.error?.message || 'Error al crear la orden', 'OK', { duration: 3000 });
        }
      });
    } else {
      this.ordenService.actualizar(this.ordenId!, request).subscribe({
        next: (response) => {
          this.snackBar.open('Orden actualizada exitosamente', 'OK', { duration: 3000 });
          this.dialogRef.close(response);
        },
        error: (error) => {
          console.error(' Error:', error);
          this.guardando.set(false);
          this.snackBar.open(error.error?.message || 'Error al actualizar la orden', 'OK', { duration: 3000 });
        }
      });
    }
  }

  onCancel() {
    this.dialogRef.close();
  }
}