export interface ActivitySeason {
  id: string;
  activity_id: string;
  grade: 'high' | 'medium' | 'low';
  start_date: string;
  end_date: string;
  net_adult_price: number;
  net_child_price: number;
}

export interface Activity {
  id: string;
  name: string;
  name_es: string;
  province: string;
  address: string | null;
  category: string | null;
  commission: number;
  net_adult_price: number;
  rack_adult_price: number;
  net_child_price: number;
  rack_child_price: number;
  reservation_email?: string | null;
  seasons: ActivitySeason[];
  created_at: string;
}

export interface ActivityListResponse {
  items: Activity[];
  total: number;
  page: number;
  page_size: number;
}

export interface ActivityCreate {
  name: string;
  name_es: string;
  province: string;
  address?: string;
  category?: string;
  commission?: number;
  net_adult_price: number;
  rack_adult_price: number;
  net_child_price: number;
  rack_child_price: number;
  reservation_email?: string | null;
}

export interface ActivityUpdate extends Partial<ActivityCreate> {}