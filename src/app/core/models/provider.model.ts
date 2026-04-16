export interface VehicleOption {
    id: string;
    name: string;
    brand: string;
    seats: number;
    category: string | null;
  }
  
  export interface RoomOption {
    id: string;
    name: string;
    hotel_name: string;
  }
  
  export interface HotelOption {
    id: string;
    name: string;
    province: string;
    category?: 'high' | 'medium' | 'low' | string | null;
  }
  
  export interface ActivityOption {
    id: string;
    name: string;
    province: string;
    category: string | null;
  }
  
  export interface ProviderListResponse<T> {
    items: T[];
    total: number;
    page: number;
    page_size: number;
  }