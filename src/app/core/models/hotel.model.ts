export interface RoomSeason {
  id: string;
  room_id: string;
  grade: 'high' | 'medium' | 'low';
  price: number;
  year: number;
}
  
  export interface Room {
    id: string;
    hotel_id: string;
    name: string;
    net_high_price: number | null;
    rack_high_price: number | null;
    net_medium_price: number | null;
    rack_medium_price: number | null;
    net_low_price: number | null;
    rack_low_price: number | null;
    net_additional_adult: number | null;
    rack_additional_adult: number | null;
    net_additional_child: number | null;
    rack_additional_child: number | null;
    seasons: RoomSeason[];
  }
  
  export interface Hotel {
    id: string;
    name: string;
    province: string | null;
    address: string | null;
    category: string | null;
    commission: number;
    rooms: Room[];
    created_at: string;
  }
  
  export interface HotelListResponse {
    items: Hotel[];
    total: number;
    page: number;
    page_size: number;
  }
  
  export interface HotelCreate {
    name: string;
    province?: string;
    address?: string;
    category?: string;
    commission?: number;
  }
  
  export interface RoomCreate {
    name: string;
    net_high_price?: number;
    rack_high_price?: number;
    net_medium_price?: number;
    rack_medium_price?: number;
    net_low_price?: number;
    rack_low_price?: number;
    net_additional_adult?: number;
    rack_additional_adult?: number;
    net_additional_child?: number;
    rack_additional_child?: number;
  }
  
  export interface HotelSeason {
  id: string;
  hotel_id: string;
  grade: 'high' | 'medium' | 'low';
  start_date: string;
  end_date: string;
}

export interface HotelSeasonCreate {
  hotel_id: string;
  grade: 'high' | 'medium' | 'low';
  start_date: string;
  end_date: string;
}

export interface RoomSeasonCreate {
  grade: 'high' | 'medium' | 'low';
  price: number;
  year: number;
}