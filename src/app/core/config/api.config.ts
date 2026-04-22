import { environment } from '../../../environments/environment';

/**
 * Prefijo del API para las peticiones HttpClient.
 *
 * Si `environment.apiUrl` es una URL absoluta al **mismo host** que la página
 * (p. ej. `http://crvoyage.macroscopecr.com/api/v1` mientras la página es HTTPS),
 * el navegador bloquea (Mixed Content). En ese caso se usa solo la **ruta**
 * (`/api/v1`) para que el esquema sea siempre el de la página.
 */
function resolvedApiRoot(): string {
  const raw = (environment.apiUrl ?? '').trim();
  if (!raw) {
    return '/api/v1';
  }

  const hasLocation =
    typeof globalThis !== 'undefined' &&
    'location' in globalThis &&
    !!(globalThis as unknown as { location?: Location }).location;

  if (hasLocation) {
    const loc = (globalThis as unknown as { location: Location }).location;

    if (raw.startsWith('http://') || raw.startsWith('https://')) {
      try {
        const u = new URL(raw);
        // Solo forzar ruta relativa en páginas HTTPS para evitar Mixed Content.
        // En desarrollo (http://localhost:4200) debemos conservar el host:puerto del backend.
        if (loc.protocol === 'https:' && u.hostname === loc.hostname) {
          let p = (u.pathname || '/').replace(/\/+$/, '') || '';
          return p.startsWith('/') ? p : `/${p}`;
        }
      } catch {
        /* seguir */
      }
    }

    if (raw.startsWith('/')) {
      return raw.replace(/\/+$/, '') || '/';
    }

    if (loc.protocol === 'https:' && raw.startsWith('http://')) {
      return `https://${raw.slice('http://'.length)}`.replace(/\/+$/, '');
    }
  }

  if (raw.startsWith('/')) {
    return raw.replace(/\/+$/, '') || '/';
  }

  return raw.replace(/\/+$/, '');
}

/** Construye la URL del API (ruta relativa al mismo origen si aplica). */
export function apiUrl(resourcePath: string): string {
  const rel = resourcePath.replace(/^\/+/, '');
  const root = resolvedApiRoot();

  if (root.startsWith('http://') || root.startsWith('https://')) {
    const base = root;
    return rel ? `${base}/${rel}` : base;
  }

  const prefix = root.startsWith('/') ? root : `/${root}`;
  return rel ? `${prefix}/${rel}` : prefix;
}

/** Base del API (solo referencia; preferir `apiUrl()`). */
export const API_BASE_URL = environment.apiUrl;
