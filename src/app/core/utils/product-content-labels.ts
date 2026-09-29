import { CapacityType } from '../models/product-content.model';

export type AttributeKind = 'hotel' | 'activity' | 'vehicle' | 'none';

export interface AttributeField {
  key: string;
  label: string;
  options: { label: string; value: string }[];
}

const UNKNOWN = { label: 'Sin definir', value: 'unknown' };
const YES_NO = [
  UNKNOWN,
  { label: 'Sí', value: 'true' },
  { label: 'No', value: 'false' },
];
const LEVEL = [
  UNKNOWN,
  { label: 'Baja', value: 'low' },
  { label: 'Media', value: 'medium' },
  { label: 'Alta', value: 'high' },
];

export const ATTRIBUTE_FIELDS: Record<Exclude<AttributeKind, 'none'>, AttributeField[]> = {
  hotel: [
    { key: 'calmness', label: 'Tranquilidad', options: LEVEL },
    { key: 'pool', label: 'Piscina', options: YES_NO },
    { key: 'romantic', label: 'Romántico', options: YES_NO },
    { key: 'family_friendly', label: 'Apto para familias', options: YES_NO },
  ],
  activity: [
    {
      key: 'intensity',
      label: 'Intensidad',
      options: [
        UNKNOWN,
        { label: 'Tranquila', value: 'calm' },
        { label: 'Moderada', value: 'moderate' },
        { label: 'Aventura', value: 'adventure' },
      ],
    },
    { key: 'family_friendly', label: 'Apto para familias', options: YES_NO },
    { key: 'cultural', label: 'Cultural', options: YES_NO },
    { key: 'nature', label: 'Naturaleza', options: YES_NO },
  ],
  vehicle: [{ key: 'comfort', label: 'Comodidad', options: LEVEL }],
};

export const CAPACITY_OPTIONS: { label: string; value: CapacityType | 'unknown' }[] = [
  { label: 'Sin definir', value: 'unknown' },
  { label: 'Individual', value: 'single' },
  { label: 'Doble', value: 'double' },
  { label: 'Triple', value: 'triple' },
  { label: 'Cuádruple', value: 'quadruple' },
  { label: 'Quíntuple', value: 'quintuple' },
  { label: 'Mixta', value: 'mixed' },
];

const PROVINCES: Record<string, string> = {
  'San Jose': 'San José',
  san_jose: 'San José',
  Alajuela: 'Alajuela',
  alajuela: 'Alajuela',
  Cartago: 'Cartago',
  cartago: 'Cartago',
  Heredia: 'Heredia',
  heredia: 'Heredia',
  Guanacaste: 'Guanacaste',
  guanacaste: 'Guanacaste',
  Puntarenas: 'Puntarenas',
  puntarenas: 'Puntarenas',
  Limon: 'Limón',
  limon: 'Limón',
};

export function provinceLabel(value: string | null | undefined): string {
  if (!value) return 'Sin provincia';
  return PROVINCES[value] ?? value;
}

export function categoryLabel(
  kind: 'hotel' | 'activity' | 'vehicle',
  value: string | null | undefined,
): string {
  if (!value) return 'Sin categoría';
  if (kind === 'hotel') {
    if (value === 'high') return 'Gama alta';
    if (value === 'medium') return 'Gama media';
    if (value === 'low') return 'Gama baja';
  }
  return value;
}

export function capacityLabel(value: CapacityType | null | undefined): string {
  return CAPACITY_OPTIONS.find((option) => option.value === (value ?? 'unknown'))?.label
    ?? 'Sin definir';
}

export function contentStatusLabel(hasContent: boolean): string {
  return hasContent ? 'Con contenido' : 'Sin contenido';
}

export function localesLabel(locales: readonly string[]): string {
  const es = locales.includes('es');
  const fr = locales.includes('fr');
  if (es && fr) return 'Español y francés';
  if (es) return 'Español';
  if (fr) return 'Francés';
  return 'Sin idiomas';
}

export function coordinateText(
  latitude: string | null | undefined,
  longitude: string | null | undefined,
): string | null {
  if (!latitude || !longitude) return null;
  return `${latitude}, ${longitude}`;
}
