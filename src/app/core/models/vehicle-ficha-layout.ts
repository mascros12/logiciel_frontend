/** Layouts de Service/Fechas en Ficha AA por categoría de vehículo (alineado con backend). */

export type VehicleFichaServiceLayout =
  | 'rental'
  | 'retour'
  | 'name_only'
  | 'brand_subtitle'
  | 'interbus'
  | 'name_subtitle'
  | 'fixed_transfer'
  | 'fixed_colectivo'
  | 'transfer_comma'
  | 'transfer_privee_comma'
  | 'vuelo_comma';

export type VehicleFichaDatesLayout =
  | 'rental_full'
  | 'retour'
  | 'empty'
  | 'fecha_hora'
  | 'ida_vuelta'
  | 'recogida_devolucion'
  | 'fecha_only'
  | 'interbus';

const SERVICE_BY_CATEGORY: Record<string, VehicleFichaServiceLayout> = {
  'Bote Publico': 'brand_subtitle',
  'Devolucion de Vehiculo': 'retour',
  Gira: 'name_only',
  Interbus: 'interbus',
  'Taxi Maritimo': 'name_subtitle',
  'Taxi Maritimo Privado': 'name_subtitle',
  'Transfer Aeropuerto/Hotel': 'fixed_transfer',
  'Transfer Colectivo Privado Tortuguero': 'fixed_colectivo',
  'Transfer del Hotel - Actividad - Hotel': 'rental',
  'Transfer de un Vehiculo Hacia X Zona': 'retour',
  'Transfer Zona a Zona': 'transfer_comma',
  'Transfer Privado Zona a Zona': 'transfer_privee_comma',
  'Vehiculo de Alquiler': 'rental',
  'Vuelo Interno': 'vuelo_comma',
};

const DATES_BY_CATEGORY: Record<string, VehicleFichaDatesLayout> = {
  'Bote Publico': 'fecha_hora',
  'Devolucion de Vehiculo': 'retour',
  Gira: 'recogida_devolucion',
  Interbus: 'interbus',
  'Taxi Maritimo': 'ida_vuelta',
  'Taxi Maritimo Privado': 'ida_vuelta',
  'Transfer Aeropuerto/Hotel': 'fecha_only',
  'Transfer Colectivo Privado Tortuguero': 'ida_vuelta',
  'Transfer del Hotel - Actividad - Hotel': 'rental_full',
  'Transfer de un Vehiculo Hacia X Zona': 'retour',
  'Transfer Zona a Zona': 'fecha_only',
  'Transfer Privado Zona a Zona': 'fecha_only',
  'Vehiculo de Alquiler': 'rental_full',
  'Vuelo Interno': 'fecha_hora',
};

export function vehicleCategoryFromExtras(
  extras: Record<string, unknown> | null | undefined,
): string | null {
  if (!extras || typeof extras !== 'object' || Array.isArray(extras)) return null;
  const raw = String(extras['vehicle_category'] ?? '').trim();
  return raw || null;
}

function nameLooksRetour(name: string): boolean {
  return /retour/i.test(name);
}

function nameLooksTaxi(name: string): boolean {
  return /taxi/i.test(name);
}

function nameLooksTransfert(name: string): boolean {
  return /transfert/i.test(name);
}

export function vehicleFichaServiceLayout(
  category: string | null,
  name: string,
): VehicleFichaServiceLayout {
  if (category && SERVICE_BY_CATEGORY[category]) {
    return SERVICE_BY_CATEGORY[category];
  }
  if (nameLooksTransfert(name)) return 'fixed_transfer';
  if (nameLooksRetour(name) || nameLooksTaxi(name)) return 'retour';
  return 'rental';
}

export function vehicleFichaDatesLayout(
  category: string | null,
  name: string,
): VehicleFichaDatesLayout {
  if (category && DATES_BY_CATEGORY[category]) {
    return DATES_BY_CATEGORY[category];
  }
  if (nameLooksRetour(name) || nameLooksTaxi(name)) return 'retour';
  return 'rental_full';
}

export function vehicleBrandFromExtras(
  extras: Record<string, unknown> | null | undefined,
): string {
  if (!extras || typeof extras !== 'object' || Array.isArray(extras)) return '';
  return String(extras['vehicle_brand'] ?? '').trim();
}

/** Quita «Avion » / «avion » al inicio del nombre de ruta (Vuelo Interno). */
export function stripVueloInternoAvionPrefix(rawName: string): string {
  return (rawName ?? '').trim().replace(/^avion\s+/i, '').trim();
}

/** Ruta visible en Ficha AA: nombre sin prefijo Avion. */
export function vueloInternoRouteFromName(rawName: string): string {
  return stripVueloInternoAvionPrefix(rawName);
}

/** ``proveedor ruta`` para ``file_aa_name`` de Vuelo Interno. */
export function computeVueloInternoFileAaName(rawName: string, brand: string): string {
  const route = stripVueloInternoAvionPrefix(rawName);
  const prov = (brand ?? '').split('/', 1)[0]?.trim() ?? '';
  if (prov && route) return `${prov} ${route}`;
  if (prov) return prov;
  return route;
}

/** ``file_aa_name`` para Bote Publico: nombre del vehículo. */
export function computeBotePublicoFileAaName(rawName: string): string {
  return (rawName ?? '').trim();
}

/** Segmento antes del primer ``/`` (fallback de nombre en Transfer Zona a Zona). */
export function textBeforeFirstSlash(raw: string): string {
  const s = (raw ?? '').trim();
  if (!s) return '';
  const idx = s.indexOf('/');
  return idx >= 0 ? s.slice(0, idx).trim() : s;
}

/** ``file_aa_name`` del catálogo o segmento del ``name`` antes del primer ``/``. */
export function computeTransferZonaZonaFileAaName(rawName: string): string {
  return textBeforeFirstSlash(rawName);
}

/** Fallback ``file_aa_name`` para Vehiculo de Alquiler: marca antes del ``/``. */
export function computeRentalVehicleFileAaName(brand: string): string {
  return textBeforeFirstSlash(brand);
}

/** Etiqueta «Voiture de Location» para Vehiculo de Alquiler: antes del primer ``/`` y del primer ``(``. */
export function rentalVoitureLocationLabel(snapshotName: string): string {
  let s = textBeforeFirstSlash(snapshotName);
  const p = s.indexOf('(');
  if (p >= 0) {
    s = s.slice(0, p).trim();
  }
  return s;
}

/** Etiqueta Service en UI para Vehiculo de Alquiler: ``file_aa_name`` o marca. */
export function rentalVehicleServiceLabel(
  extras: Record<string, unknown> | null | undefined,
  _snapshotName: string,
): string {
  const pre =
    extras && typeof extras === 'object' && !Array.isArray(extras)
      ? String(extras['vehicle_file_aa_name'] ?? '').trim()
      : '';
  if (pre) return pre;
  const brand = vehicleBrandFromExtras(extras);
  return computeRentalVehicleFileAaName(brand);
}

/** Etiqueta Service en UI para Transfer Zona a Zona: ``file_aa_name`` o ``name``. */
export function transferZonaZonaServiceLabel(
  extras: Record<string, unknown> | null | undefined,
  snapshotName: string,
): string {
  const pre =
    extras && typeof extras === 'object' && !Array.isArray(extras)
      ? String(extras['vehicle_file_aa_name'] ?? '').trim()
      : '';
  if (pre) return pre;
  return computeTransferZonaZonaFileAaName(snapshotName);
}

/** Etiqueta Service en UI para Bote Publico. */
export function botePublicoServiceLabel(
  extras: Record<string, unknown> | null | undefined,
  snapshotName: string,
): string {
  const pre =
    extras && typeof extras === 'object' && !Array.isArray(extras)
      ? String(extras['vehicle_file_aa_name'] ?? '').trim()
      : '';
  if (pre) return pre;
  return computeBotePublicoFileAaName(snapshotName);
}

/** Etiqueta Service en UI: ``vehicle_file_aa_name`` o calculada al vuelo. */
export function vueloInternoServiceLabel(
  extras: Record<string, unknown> | null | undefined,
  snapshotName: string,
): string {
  const pre = extras && typeof extras === 'object' && !Array.isArray(extras)
    ? String(extras['vehicle_file_aa_name'] ?? '').trim()
    : '';
  if (pre) return pre;
  const brand = vehicleBrandFromExtras(extras);
  return computeVueloInternoFileAaName(snapshotName, brand);
}

const NO_SUBTITLE_CATEGORIES = new Set([
  'Vehiculo de Alquiler',
  'Transfer del Hotel - Actividad - Hotel',
  'Transfer de un Vehiculo Hacia X Zona',
  'Devolucion de Vehiculo',
  'Vuelo Interno',
]);

/** Vehículos cuya fila no aparece en tablas Ficha AA (fusionados al generar). */
export const FICHA_AA_MERGED_VEHICLE_CATEGORIES = new Set([
  'Transfer del Hotel - Actividad - Hotel',
  'Transfer de un Vehiculo Hacia X Zona',
  'Devolucion de Vehiculo',
]);

export function fichaAaDetailVisibleInTable(d: {
  category: string;
  observation_extras?: Record<string, unknown> | null;
}): boolean {
  if (d.category !== 'vehicle') return true;
  const cat = vehicleCategoryFromExtras(d.observation_extras);
  return !cat || !FICHA_AA_MERGED_VEHICLE_CATEGORIES.has(cat);
}

export function vehicleFichaAllowsSubtitle(
  category: string | null,
  name: string,
): boolean {
  if (category && NO_SUBTITLE_CATEGORIES.has(category)) return false;
  const layout = vehicleFichaServiceLayout(category, name);
  if (layout === 'interbus') return false;
  return layout !== 'fixed_transfer'
    && layout !== 'fixed_colectivo'
    && layout !== 'name_only'
    && layout !== 'retour';
}
