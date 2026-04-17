import { environment } from '../../../environments/environment';

/** URL base única del backend para toda la app. */
export const API_BASE_URL = environment.apiUrl;

/** Construye una URL absoluta de API a partir de una ruta relativa. */
export function apiUrl(path: string): string {
  if (!path) return API_BASE_URL;
  return `${API_BASE_URL}/${path.replace(/^\/+/, '')}`;
}
