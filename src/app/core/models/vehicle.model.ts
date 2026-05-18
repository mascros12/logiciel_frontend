/** Valor por defecto al crear un vehículo. */
export const DEFAULT_VEHICLE_CATEGORY = 'Vehiculo de Alquiler';

/** Categorías de servicio / tipo de transporte (catálogo vehículos). */
export const VEHICLE_CATEGORY_OPTIONS: readonly { label: string; value: string }[] = [
  { label: 'Transporte del Aeropuerto', value: 'Transporte del Aeropuerto' },
  { label: 'Chofer', value: 'Chofer' },
  { label: 'Transporte del Hotel a Actividad', value: 'Transporte del Hotel a Actividad' },
  { label: 'Transporte entre Zonas', value: 'Transporte entre Zonas' },
  { label: 'Transporte Privado entre Zonas', value: 'Transporte Privado entre Zonas' },
  { label: 'Taxi Maritimo', value: 'Taxi Maritimo' },
  { label: 'Taxi Maritimo Privado', value: 'Taxi Maritimo Privado' },
  { label: 'Interbus', value: 'Interbus' },
  { label: 'Vehiculo de Alquiler', value: 'Vehiculo de Alquiler' },
  { label: 'Devolucion de Vehiculo', value: 'Devolucion de Vehiculo' },
  { label: 'Vuelo Interno', value: 'Vuelo Interno' },
];

export interface VehicleSeason {
    id: string;
    vehicle_id: string;
    grade: 'high' | 'medium' | 'low';
    start_date: string;
    end_date: string;
    net_daily_price: number;
    net_weekly_price: number;
  }
  
  export interface Vehicle {
    id: string;
    name: string;
    file_aa_name?: string | null;
    brand: string;
    seats: number;
    carryon_bag: number;
    bag: number;
    category: string | null;
    commission: number;
    net_daily_high: number;
    rack_daily_high: number;
    net_daily_medium: number;
    rack_daily_medium: number;
    net_daily_low: number;
    rack_daily_low: number;
    net_weekly_high: number;
    rack_weekly_high: number;
    net_weekly_medium: number;
    rack_weekly_medium: number;
    net_weekly_low: number;
    rack_weekly_low: number;
    reservation_email?: string | null;
    seasons: VehicleSeason[];
    created_at: string;
  }
  
  export interface VehicleListResponse {
    items: Vehicle[];
    total: number;
    page: number;
    page_size: number;
  }
  
  export interface VehicleCreate {
    name: string;
    file_aa_name?: string | null;
    brand: string;
    seats: number;
    carryon_bag: number;
    bag: number;
    category?: string;
    commission?: number;
    net_daily_high: number;
    rack_daily_high: number;
    net_daily_medium: number;
    rack_daily_medium: number;
    net_daily_low: number;
    rack_daily_low: number;
    net_weekly_high: number;
    rack_weekly_high: number;
    net_weekly_medium: number;
    rack_weekly_medium: number;
    net_weekly_low: number;
    rack_weekly_low: number;
    reservation_email?: string | null;
  }
  
  export interface VehicleSeasonCreate {
    grade: 'high' | 'medium' | 'low';
    start_date: string;
    end_date: string;
    net_daily_price: number;
    net_weekly_price: number;
  }