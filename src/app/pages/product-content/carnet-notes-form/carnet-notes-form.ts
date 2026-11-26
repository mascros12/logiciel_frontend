import { Component, DestroyRef, effect, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { ProductContentService, httpErrorText } from '../../../core/services/product-content.service';
import { applyRichMark } from '../../../core/utils/rich-text';
import { RichText } from '../../carnet/rich-text/rich-text';

@Component({
  selector: 'app-carnet-notes-form',
  standalone: true,
  imports: [FormsModule, ButtonModule, TextareaModule, ToastModule, RichText],
  providers: [MessageService],
  templateUrl: './carnet-notes-form.html',
  styleUrls: ['../content-shared.scss'],
})
export class CarnetNotesForm {
  private readonly content = inject(ProductContentService);
  private readonly messages = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);
  readonly entityType = input.required<'hotels' | 'activities'>();
  readonly entityId = input.required<string>();
  readonly notes = input<string | null>(null);
  readonly suggestion = input<string | null>(null);
  readonly saved = output<string | null>();

  readonly draft = signal('');
  readonly saving = signal(false);
  private loadedKey = '';

  constructor() {
    effect(() => {
      const key = `${this.entityId()}|${this.notes() ?? ''}|${this.suggestion() ?? ''}`;
      if (key === this.loadedKey) return;
      this.loadedKey = key;
      this.draft.set(this.notes() ?? this.suggestion() ?? '');
    });
  }

  baseline(): string {
    return this.notes() ?? this.suggestion() ?? '';
  }

  changed(): boolean {
    return this.draft() !== this.baseline();
  }

  format(
    area: HTMLTextAreaElement,
    kind: 'bold' | 'underline' | 'red' | 'purple',
  ): void {
    const next = applyRichMark(
      area.value,
      area.selectionStart ?? area.value.length,
      area.selectionEnd ?? area.value.length,
      kind,
    );
    this.draft.set(next.value);
    queueMicrotask(() => {
      area.focus();
      area.setSelectionRange(next.caret, next.caret);
    });
  }

  recalculate(): void {
    this.draft.set(this.suggestion() ?? '');
  }

  save(): void {
    if (this.saving() || !this.changed()) return;
    const suggestion = (this.suggestion() ?? '').trim();
    const text = this.draft().trim();
    const automatic = this.entityType() === 'activities' && text === suggestion;
    this.saving.set(true);
    this.content
      .saveCarnetNotes(this.entityType(), this.entityId(), automatic ? null : text || null)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (detail) => {
          this.saving.set(false);
          this.messages.add({ severity: 'success', summary: 'Notas guardadas' });
          this.saved.emit(detail.carnet_notes);
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
