export type Province =
  | 'San Jose'
  | 'Alajuela'
  | 'Cartago'
  | 'Heredia'
  | 'Guanacaste'
  | 'Puntarenas'
  | 'Limon';

export interface Zone {
  id: string;
  name: string;
  province: Province;
  created_at: string;
  updated_at: string;
}

export interface ZoneCreate {
  name: string;
  province: Province;
}

export type ZoneUpdate = Partial<ZoneCreate>;

export interface ZoneListResponse {
  items: Zone[];
  total: number;
  page: number;
  page_size: number;
}

export const PROVINCE_LABELS: Record<Province, string> = {
  'San Jose': 'San José',
  Alajuela: 'Alajuela',
  Cartago: 'Cartago',
  Heredia: 'Heredia',
  Guanacaste: 'Guanacaste',
  Puntarenas: 'Puntarenas',
  Limon: 'Limón',
};

export function zoneOptionLabel(zone: Zone): string {
  return `${zone.name} · ${PROVINCE_LABELS[zone.province] ?? zone.province}`;
}
