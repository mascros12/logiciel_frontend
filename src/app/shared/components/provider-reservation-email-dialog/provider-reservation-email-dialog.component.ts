import { Component, effect, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';

@Component({
  selector: 'app-provider-reservation-email-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, DialogModule, ButtonModule, InputTextModule],
  template: `
    <p-dialog
      [header]="header()"
      [visible]="visible()"
      (visibleChange)="visibleChange.emit($event)"
      [modal]="true"
      [style]="{ width: 'min(440px, 96vw)' }"
    >
      @if (entityName()) {
        <p class="entity-name">{{ entityName() }}</p>
      }
      <form [formGroup]="form" class="email-form">
        <label [attr.for]="inputId">Correo reservas</label>
        <input
          pInputText
          type="email"
          [id]="inputId"
          formControlName="reservation_email"
          class="w-full"
          placeholder="reservas@proveedor.com"
        />
        <small class="field-hint">Usado para enviar solicitudes desde la Ficha AA</small>
      </form>
      <ng-template pTemplate="footer">
        <p-button label="Cancelar" [text]="true" (onClick)="visibleChange.emit(false)" />
        <p-button
          label="Guardar"
          icon="pi pi-check"
          [loading]="saving()"
          (onClick)="submit()"
        />
      </ng-template>
    </p-dialog>
  `,
  styles: `
    .entity-name {
      margin: 0 0 1rem;
      font-weight: 600;
      color: #334155;
    }
    .email-form {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .email-form label {
      font-size: 0.875rem;
      font-weight: 600;
    }
    .field-hint {
      color: #64748b;
      font-size: 0.8rem;
    }
  `,
})
export class ProviderReservationEmailDialogComponent {
  private fb = inject(FormBuilder);

  readonly inputId = `provider-email-${Math.random().toString(36).slice(2, 9)}`;

  visible = input(false);
  header = input('Correo del proveedor');
  entityName = input('');
  initialEmail = input<string | null | undefined>('');
  saving = input(false);

  visibleChange = output<boolean>();
  saveEmail = output<string | null>();

  form = this.fb.group({
    reservation_email: [''],
  });

  constructor() {
    effect(() => {
      if (!this.visible()) return;
      this.form.patchValue({
        reservation_email: this.initialEmail() ?? '',
      });
    });
  }

  submit(): void {
    const raw = String(this.form.value.reservation_email ?? '').trim();
    this.saveEmail.emit(raw || null);
  }
}
