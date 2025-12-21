// pago-form-dialog.component.ts
import { Component, OnInit, inject, signal, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { PagoService } from '../../../core/services/pago.service';
import { OrdenService } from '../../../core/services/orden.service';
import { OrdenResponse } from '../../../core/models/orden.model';

@Component({
  selector: 'app-pago-form-dialog',
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
    MatSnackBarModule
  ],
  templateUrl: './pago-form-dialog.component.html',
  styleUrl: './pago-form-dialog.component.css'
})
export class PagoFormDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<PagoFormDialogComponent>);
  private pagoService = inject(PagoService);
  private ordenService = inject(OrdenService);
  private snackBar = inject(MatSnackBar);

  form!: FormGroup;
  guardando = signal(false);
  orden: OrdenResponse;

  metodosPago = [
    'Efectivo',
    'Yape',
    'Plin',
    'Transferencia',
    'Tarjeta de Crédito',
    'Tarjeta de Débito'
  ];

  constructor(@Inject(MAT_DIALOG_DATA) public data: { orden: OrdenResponse }) {
    this.orden = data.orden;
  }

  ngOnInit() {
    this.initForm();
  }

  initForm() {
    this.form = this.fb.group({
      monto: [
        this.orden.saldoPendiente, 
        [
          Validators.required, 
          Validators.min(0.01),
          Validators.max(this.orden.saldoPendiente)
        ]
      ],
      metodoPago: ['Efectivo'],
      notas: ['']
    });
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.snackBar.open('Por favor complete todos los campos correctamente', 'OK', { 
        duration: 3000 
      });
      return;
    }

    const formValue = this.form.value;
    const request = {
      ordenId: this.orden.id,
      monto: parseFloat(formValue.monto),
      metodoPago: formValue.metodoPago,
      notas: formValue.notas
    };

    this.guardando.set(true);

    this.pagoService.registrar(request).subscribe({
      next: (pagoResponse) => {
        console.log('Pago registrado:', pagoResponse);
        

        this.ordenService.obtenerPorId(this.orden.id).subscribe({
          next: (ordenActualizada) => {
            console.log('Orden actualizada:', ordenActualizada);
            this.snackBar.open('Pago registrado exitosamente', 'OK', { duration: 3000 });

            this.dialogRef.close(ordenActualizada);
          },
          error: (error) => {
            console.error('Error al recargar orden:', error);
            this.guardando.set(false);

            this.snackBar.open('Pago registrado, pero no se pudo actualizar la vista', 'OK', { duration: 3000 });
            this.dialogRef.close('success');
          }
        });
      },
      error: (error) => {
        console.error('Error al registrar pago:', error);
        this.guardando.set(false);
        this.snackBar.open(
          error.error?.message || 'Error al registrar el pago', 
          'OK', 
          { duration: 3000 }
        );
      }
    });
  }

  onCancel() {
    this.dialogRef.close();
  }
}