import { Component, computed, effect, input, signal } from '@angular/core';
import { AbstractControl } from '@angular/forms';
import { Observable, merge } from 'rxjs';
import { controlErrorMessage, controlShowError } from '../../../core/utils/form-validation.util';

@Component({
  selector: 'app-field-error',
  standalone: true,
  template: `
    @if (visible()) {
      <small class="field-error-msg" role="alert">{{ text() }}</small>
    }
  `,
  styles: [
    `
      .field-error-msg {
        display: block;
        color: var(--p-red-500, #ef4444);
        font-size: 0.75rem;
        line-height: 1.35;
        margin-top: 0.15rem;
      }
    `,
  ],
})
export class FieldErrorComponent {
  control = input<AbstractControl | null | undefined>(null);
  label = input('');

  /** El control de Angular no es una signal: hay que reaccionar a sus eventos. */
  private readonly revision = signal(0);

  constructor() {
    effect((onCleanup) => {
      const ctrl = this.control();
      if (!ctrl) return;
      const streams: Observable<unknown>[] = [ctrl.statusChanges, ctrl.valueChanges];
      if ('events' in ctrl && ctrl.events) {
        streams.push(ctrl.events as Observable<unknown>);
      }
      const sub = merge(...streams).subscribe(() => {
        this.revision.update((value) => value + 1);
      });
      onCleanup(() => sub.unsubscribe());
    });
  }

  visible = computed(() => {
    this.revision();
    return controlShowError(this.control());
  });

  text = computed(() => {
    this.revision();
    return controlErrorMessage(this.control(), this.label()) ?? '';
  });
}
