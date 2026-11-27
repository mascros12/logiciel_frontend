import { Component, DestroyRef, effect, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { ProductContentService, httpErrorText } from '../../../core/services/product-content.service';

@Component({
  selector: 'app-trajet-name-form',
  standalone: true,
  imports: [FormsModule, ButtonModule, InputTextModule, ToastModule],
  providers: [MessageService],
  templateUrl: './trajet-name-form.html',
  styleUrls: ['../content-shared.scss'],
})
export class TrajetNameForm {
  private readonly content = inject(ProductContentService);
  private readonly messages = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);
  readonly entityId = input.required<string>();
  readonly name = input<string | null>(null);
  readonly suggestion = input<string | null>(null);
  readonly saved = output<string | null>();

  readonly draft = signal('');
  readonly saving = signal(false);
  private loadedKey = '';

  constructor() {
    effect(() => {
      const key = `${this.entityId()}|${this.name() ?? ''}`;
      if (key === this.loadedKey) return;
      this.loadedKey = key;
      this.draft.set(this.name() ?? '');
    });
  }

  changed(): boolean {
    return this.draft().trim() !== (this.name() ?? '').trim();
  }

  useCalculation(): void {
    this.draft.set('');
  }

  save(): void {
    if (this.saving() || !this.changed()) return;
    const text = this.draft().trim();
    this.saving.set(true);
    this.content
      .saveVehicleTrajetName(this.entityId(), text || null)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (detail) => {
          this.saving.set(false);
          this.messages.add({ severity: 'success', summary: 'Nombre guardado' });
          this.saved.emit(detail.trajet_name);
        },
        error: (err: unknown) => {
          this.saving.set(false);
          this.messages.add({
            severity: 'error',
            summary: 'No se pudo guardar',
            detail: httpErrorText(err),
          });
        },
      });
  }
}
