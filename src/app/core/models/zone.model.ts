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
