import { AbstractControl, FormGroup } from '@angular/forms';
import { MessageService } from 'primeng/api';

/** Muestra error de campo tras envío o interacción. */
export function controlShowError(control: AbstractControl | null | undefined): boolean {
  if (!control) return false;
  return control.invalid && (control.touched || control.dirty);
}

/** Mensaje en español según errores del control. */
export function controlErrorMessage(
  control: AbstractControl | null | undefined,
  label: string,
): string | null {
  if (!control?.errors || !controlShowError(control)) return null;
  const e = control.errors;
  if (e['required']) return `${label} es obligatorio.`;
  if (e['email']) return `${label} no es un correo válido.`;
  if (e['min']) return `${label} debe ser al menos ${e['min'].min}.`;
  if (e['max']) return `${label} debe ser como máximo ${e['max'].max}.`;
  if (e['minlength']) {
    return `${label} debe tener al menos ${e['minlength'].requiredLength} caracteres.`;
  }
  if (typeof e['dateRange'] === 'string') return e['dateRange'];
  if (e['dateRangeEnd']) {
    return 'La fecha fin debe ser mayor o igual a la fecha inicio.';
  }
  if (e['dateRangeRoom']) {
    return 'La fecha fin debe ser mayor que la fecha inicio (noches hasta checkout).';
  }
  return 'Valor no válido.';
}

/** Marca el formulario y devuelve mensajes de campos inválidos. */
export function validateForm(form: FormGroup, labels: Record<string, string>): string[] {
  form.markAllAsTouched();
  const messages: string[] = [];
  for (const [key, label] of Object.entries(labels)) {
    const msg = controlErrorMessage(form.get(key), label);
    if (msg) messages.push(msg);
  }
  return messages;
}

export function warnInvalidForm(messageService: MessageService, messages: string[]): void {
  const unique = [...new Set(messages)];
  if (!unique.length) return;
  messageService.add({
    severity: 'warn',
    summary: 'Revise el formulario',
    detail:
      unique.length <= 3
        ? unique.join(' ')
        : `${unique.slice(0, 3).join(' ')} (+${unique.length - 3} más)`,
    life: 9000,
  });
}

/** Clase PrimeNG para selects/datepickers con error. */
export function fieldStyleClass(
  control: AbstractControl | null | undefined,
  base = 'w-full',
): string {
  return controlShowError(control) ? `${base} ng-invalid ng-dirty` : base;
}

/** Detalle de error FastAPI / HTTP. */
export function apiErrorSummary(err: { error?: { detail?: unknown } }, fallback: string): string {
  const d = err?.error?.detail;
  if (typeof d === 'string') return d;
  if (Array.isArray(d)) {
    return d
      .map((item) => {
        if (item && typeof item === 'object' && 'msg' in item) {
          return String((item as { msg: string }).msg);
        }
        return String(item);
      })
      .join(', ');
  }
  if (d && typeof d === 'object') return JSON.stringify(d);
  return fallback;
}
