import { Component, input, computed } from '@angular/core';
import { AbstractControl } from '@angular/forms';
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

  visible = computed(() => controlShowError(this.control()));
  text = computed(() => controlErrorMessage(this.control(), this.label()) ?? '');
}
