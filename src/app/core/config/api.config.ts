import { environment } from '../../../environments/environment';

/**
 * Si la app se sirve por HTTPS y la base de API está en http:// mismo host,
 * el navegador bloquea (Mixed Content). Se fuerza https en ese caso.
 */
function normalizeApiBaseUrl(url: string): string {
  if (!url || typeof globalThis === 'undefined' || !('location' in globalThis)) {
    return url;
  }
  const loc = (globalThis as unknown as { location?: Location }).location;
  if (!loc || loc.protocol !== 'https:') {
    return url;
  }
  if (!url.startsWith('http://')) {
    return url;
  }
  try {
    const u = new URL(url, loc.origin);
    if (u.hostname === loc.hostname) {
      u.protocol = 'https:';
      return u.toString().replace(/\/$/, '');
    }
  } catch {
    /* ignore */
  }
  return url;
}

/** URL base única del backend para toda la app. */
export const API_BASE_URL = normalizeApiBaseUrl(environment.apiUrl);

/** Construye la URL del API a partir de una ruta relativa al base. */
export function apiUrl(path: string): string {
  const base = API_BASE_URL.replace(/\/+$/, '');
  const rel = path.replace(/^\/+/, '');
  if (!rel) {
    return base;
  }
  if (base.startsWith('/')) {
    return `${base}/${rel}`;
  }
  return `${base}/${rel}`;
}
