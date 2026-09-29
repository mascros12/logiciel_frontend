import { Component, inject, input, output, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { ProductContentService, httpErrorText } from '../../../core/services/product-content.service';
import { ProductEntityPath } from '../../../core/models/product-content.model';
import { enrichmentStatusLabel } from '../../../core/utils/product-content-labels';

@Component({
  selector: 'app-content-enrich-action',
  standalone: true,
  imports: [ButtonModule, ToastModule],
  providers: [MessageService],
  templateUrl: './content-enrich-action.html',
  styleUrl: './content-enrich-action.scss',
})
export class ContentEnrichAction {
  private readonly service = inject(ProductContentService);
  private readonly messages = inject(MessageService);

  readonly entityType = input.required<ProductEntityPath>();
  readonly entityId = input.required<string>();
  readonly status = input<string | null>(null);
  readonly refresh = output<void>();
  readonly busy = signal(false);

  label(): string {
    return enrichmentStatusLabel(this.status());
  }

  active(): boolean {
    const status = this.status();
    return status === 'queued' || status === 'running';
  }

  enrich(): void {
    if (this.active() || this.busy()) return;
    this.busy.set(true);
    this.service.requestEnrichment(this.entityType(), this.entityId()).subscribe({
      next: () => {
        this.busy.set(false);
        this.messages.add({ severity: 'success', summary: 'Enriquecimiento en cola' });
        this.refresh.emit();
      },
      error: (err: unknown) => {
        this.busy.set(false);
        this.messages.add({
          severity: 'error',
          summary: 'No se pudo encolar',
          detail: httpErrorText(err),
        });
      },
    });
  }
}
