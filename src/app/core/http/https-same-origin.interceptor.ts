import { HttpInterceptorFn } from '@angular/common/http';

/**
 * Último recurso contra Mixed Content: si la app está en HTTPS y una petición
 * apunta a `http://` del **mismo host**, reescribe a la ruta relativa para que
 * el navegador use HTTPS (mismo origen que la página).
 *
 * Cubre bundles viejos, cachés CDN o `apiUrl` absoluto en `http` por error.
 */
export const httpsSameOriginInterceptor: HttpInterceptorFn = (req, next) => {
  const url = req.url;
  if (!url.startsWith('http://')) {
    return next(req);
  }
  if (typeof globalThis === 'undefined' || !('location' in globalThis)) {
    return next(req);
  }
  const loc = (globalThis as unknown as { location: Location }).location;
  if (loc.protocol !== 'https:') {
    return next(req);
  }
  try {
    const u = new URL(url);
    if (u.hostname !== loc.hostname) {
      return next(req);
    }
    const path = `${u.pathname || '/'}${u.search}${u.hash}` || '/';
    return next(req.clone({ url: path }));
  } catch {
    return next(req);
  }
};
