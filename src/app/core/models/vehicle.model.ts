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