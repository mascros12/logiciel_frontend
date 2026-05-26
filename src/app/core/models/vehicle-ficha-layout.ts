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
  | 'fecha_only';

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
  Interbus: 'empty',
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

/** ``proveedor - ruta`` para ``file_aa_name`` de Vuelo Interno. */
export function computeVueloInternoFileAaName(rawName: string, brand: string): string {
  const route = stripVueloInternoAvionPrefix(rawName);
  const prov = (brand ?? '').split('/', 1)[0]?.trim() ?? '';
  if (prov && route) return `${prov} - ${route}`;
  if (prov) return prov;
  return route;
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
]);

export function vehicleFichaAllowsSubtitle(
  category: string | null,
  name: string,
): boolean {
  if (category && NO_SUBTITLE_CATEGORIES.has(category)) return false;
  const layout = vehicleFichaServiceLayout(category, name);
  return layout !== 'fixed_transfer'
    && layout !== 'fixed_colectivo'
    && layout !== 'name_only'
    && layout !== 'retour';
}
