import { Component, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { AppSettings } from '../../../core/models/app-settings.model';
import { AppSettingsService } from '../../../core/services/app-settings.service';

@Component({
  selector: 'app-general-settings',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonModule, InputNumberModule, ToastModule],
  providers: [MessageService],
  templateUrl: './general-settings.html',
  styleUrl: './general-settings.scss',
})
export class GeneralSettings implements OnInit {
  loading = signal(false);
  saving = signal(false);
  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private settingsService: AppSettingsService,
    private messageService: MessageService,
  ) {
    this.form = this.fb.group({
      default_quotation_commission: [
        1.92,
        [Validators.required, Validators.min(1)],
      ],
    });
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.settingsService.get().subscribe({
      next: (s: AppSettings) => {
        this.form.reset({
          default_quotation_commission: Number(s.default_quotation_commission),
        });
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'No se pudo cargar la configuración',
        });
      },
    });
  }

  submit(): void {
    if (this.form.invalid) return;
    this.saving.set(true);
    const commission = this.form.value.default_quotation_commission as number;
    this.settingsService
      .update({ default_quotation_commission: commission })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.messageService.add({
            severity: 'success',
            summary: 'Configuración guardada',
          });
        },
        error: (err: { error?: { detail?: string } }) => {
          this.saving.set(false);
          this.messageService.add({
            severity: 'error',
            summary:
              typeof err.error?.detail === 'string'
                ? err.error.detail
                : 'No se pudo guardar la configuración',
          });
        },
      });
  }
}
