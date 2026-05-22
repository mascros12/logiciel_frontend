/** Valor por defecto al crear un vehículo. */
export const DEFAULT_VEHICLE_CATEGORY = 'Vehiculo de Alquiler';

/** Categorías de servicio / tipo de transporte (catálogo vehículos). */
export const VEHICLE_CATEGORY_OPTIONS: readonly { label: string; value: string }[] = [

  { label: 'Bote Publico', value: 'Bote Publico' },
  { label: 'Devolucion de Vehiculo (no sj-aeropuerto)', value: 'Devolucion de Vehiculo' },
  { label: 'Gira', value: 'Gira' },
  { label: 'Interbus', value: 'Interbus' },
  { label: 'Taxi Maritimo', value: 'Taxi Maritimo' },
  { label: 'Taxi Maritimo Privado', value: 'Taxi Maritimo Privado' },
  { label: 'Transfer Aeropuerto/Hotel', value: 'Transfer Aeropuerto/Hotel' },
  { label: 'Transfer Colectivo Privado Tortuguero', value: 'Transfer Colectivo Privado Tortuguero' },
  { label: 'Transfer del Hotel - Actividad - Hotel', value: 'Transfer del Hotel - Actividad - Hotel' },
  { label: 'Transfer de un Vehiculo Hacia X Zona', value: 'Transfer de un Vehiculo Hacia X Zona' },
  { label: 'Transfer Zona a Zona', value: 'Transfer Zona a Zona' },
  { label: 'Transfer Privado Zona a Zona', value: 'Transfer Privado Zona a Zona' },
  { label: 'Vehiculo de Alquiler', value: 'Vehiculo de Alquiler' },
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
    ficha_aa_subtitle?: string | null;
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
    ficha_aa_subtitle?: string | null;
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