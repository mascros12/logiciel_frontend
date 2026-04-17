/**
 * Build de producción: misma origen que el sitio; Nginx reenvía `/api/v1` al backend.
 * Sustituido en build vía `fileReplacements` en `angular.json`.
 */
export const environment = {
  production: true,
  apiUrl: '/api/v1',
};
