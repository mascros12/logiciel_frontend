import { CanDeactivateFn } from '@angular/router';

export const carnetUnsavedGuard: CanDeactivateFn<{ canDeactivate: () => boolean }> = (component) =>
  component.canDeactivate();
