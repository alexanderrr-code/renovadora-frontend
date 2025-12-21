// cliente-form-dialog.component.ts
import { Component, OnInit, inject, signal, Inject } from '@angular/core';

import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ClienteService } from '../../../core/services/cliente.service';
import { ClienteResponse } from '../../../core/models/cliente.model';

@Component({
  selector: 'app-cliente-form-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSnackBarModule
],
  templateUrl: './cliente-form-dialog.component.html',
  styleUrl: './cliente-form-dialog.component.css'
})
export class ClienteFormDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<ClienteFormDialogComponent>);
  private clienteService = inject(ClienteService);
  private snackBar = inject(MatSnackBar);

  form!: FormGroup;
  guardando = signal(false);
  mode: 'create' | 'edit' = 'create';
  clienteId?: number;

  constructor(@Inject(MAT_DIALOG_DATA) public data?: { cliente?: ClienteResponse }) {
    if (data?.cliente) {
      this.mode = 'edit';
      this.clienteId = data.cliente.id;
    }
  }

  ngOnInit() {
    this.initForm();
    
    if (this.mode === 'edit' && this.data?.cliente) {
      this.cargarDatosCliente(this.data.cliente);
    }
  }

  initForm() {
    this.form = this.fb.group({
      nombreCompleto: ['', [Validators.required, Validators.maxLength(100)]],
      telefono: ['', [Validators.required, Validators.maxLength(20)]],
      email: ['', [Validators.email, Validators.maxLength(100)]],
      direccion: ['', Validators.maxLength(200)],
      notas: ['']
    });
  }

  cargarDatosCliente(cliente: ClienteResponse) {
    this.form.patchValue({
      nombreCompleto: cliente.nombreCompleto,
      telefono: cliente.telefono,
      email: cliente.email || '',
      direccion: cliente.direccion || '',
      notas: cliente.notas || ''
    });
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.snackBar.open('Por favor complete todos los campos obligatorios', 'OK', { 
        duration: 3000 
      });
      return;
    }

    const formValue = this.form.value;
    this.guardando.set(true);

    if (this.mode === 'create') {
      this.clienteService.crear(formValue).subscribe({
        next: (response) => {
          this.snackBar.open('Cliente creado exitosamente', 'OK', { duration: 3000 });
          this.dialogRef.close(response);
        },
        error: (error) => {
          console.error('Error al crear cliente:', error);
          this.guardando.set(false);
          this.snackBar.open(
            error.error?.message || 'Error al crear el cliente', 
            'OK', 
            { duration: 3000 }
          );
        }
      });
    } else {
      this.clienteService.actualizar(this.clienteId!, formValue).subscribe({
        next: (response) => {
          this.snackBar.open('Cliente actualizado exitosamente', 'OK', { duration: 3000 });
          this.dialogRef.close(response);
        },
        error: (error) => {
          console.error('Error al actualizar cliente:', error);
          this.guardando.set(false);
          this.snackBar.open(
            error.error?.message || 'Error al actualizar el cliente', 
            'OK', 
            { duration: 3000 }
          );
        }
      });
    }
  }

  onCancel() {
    this.dialogRef.close();
  }
}
