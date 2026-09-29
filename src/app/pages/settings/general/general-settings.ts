import { Component, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { AppSettings } from '../../../core/models/app-settings.model';
import { BulkPreview } from '../../../core/models/product-content.model';
import { AppSettingsService } from '../../../core/services/app-settings.service';
import { ProductContentService } from '../../../core/services/product-content.service';

@Component({
  selector: 'app-general-settings',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    InputNumberModule,
    ToastModule,
    ConfirmDialogModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './general-settings.html',
  styleUrl: './general-settings.scss',
})
export class GeneralSettings implements OnInit {
  loading = signal(false);
  saving = signal(false);
  enrichmentLoading = signal(false);
  enrichmentRunning = signal(false);
  preview = signal<BulkPreview | null>(null);
  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private settingsService: AppSettingsService,
    private contentService: ProductContentService,
    private messageService: MessageService,
    private confirmation: ConfirmationService,
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
    this.loadPreview();
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

  loadPreview(): void {
    this.enrichmentLoading.set(true);
    this.contentService.previewEnrichment().subscribe({
      next: (preview) => {
        this.preview.set(preview);
        this.enrichmentLoading.set(false);
      },
      error: () => {
        this.enrichmentLoading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'No se pudo calcular el enriquecimiento',
        });
      },
    });
  }

  confirmEnrichment(): void {
    const total = this.preview()?.eligible.total ?? 0;
    if (!total) return;
    this.confirmation.confirm({
      header: 'Enriquecimiento general',
      message:
        `Se crearán ${total} tareas de enriquecimiento. ` +
        'Cada tarea puede consumir servicios externos.',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Ejecutar',
      rejectLabel: 'Cancelar',
      accept: () => this.executeEnrichment(),
    });
  }

  private executeEnrichment(): void {
    this.enrichmentRunning.set(true);
    this.contentService.runEnrichment().subscribe({
      next: (result) => {
        this.enrichmentRunning.set(false);
        const skipped =
          result.skipped_active +
          result.skipped_pending_review +
          result.skipped_already_enriched;
        this.messageService.add({
          severity: 'success',
          summary: `Se agregaron ${result.queued} productos a la cola.`,
          detail: skipped ? `Omitidos: ${skipped}.` : undefined,
        });
        this.loadPreview();
      },
      error: () => {
        this.enrichmentRunning.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'No se pudo encolar el enriquecimiento',
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
