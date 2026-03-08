export interface QuotationVehicle {
  id: string;
  vehicle_id: string | null;
  name: string;
  grade: string;
  net_price: number;
  rack_price: number;
  net_weekly_price: number;
  rack_weekly_price: number;
}

export interface QuotationRoom {
  id: string;
  room_id: string | null;
  name: string;
  grade: string;
  net_price: number;
  rack_price: number;
  additional_adults: number;
  additional_children: number;
  net_additional_adult: number;
  net_additional_child: number;
}

export interface QuotationActivity {
  id: string;
  activity_id: string | null;
  name: string;
  grade: string;
  adults: number;
  children: number;
  free: number;
  net_price: number;
  rack_price: number;
  recommendation: string | null;
}

export interface QuotationLine {
  id: string;
  date: string;
  vehicles: QuotationVehicle[];
  rooms: QuotationRoom[];
  activities: QuotationActivity[];
}

export interface QuotationVersion {
  id: string;
  version_number: number;
  notes: string | null;
  is_current: boolean;
  total: number;
  created_at: string;
}

export interface Quotation {
  id: string;
  name: string;
  from_date: string | null;
  to_date: string | null;
  arrival_date: string | null;
  departure_date: string | null;
  arrival_time: string | null;
  departure_time: string | null;
  flight_number_arrival: string | null;
  flight_number_departure: string | null;
  commission: number;
  total: number;
  shared: boolean;
  contact_id: string | null;
  created_by_id: string | null;
  created_at: string;
  updated_at: string;
  versions: QuotationVersion[];
}

export interface QuotationFull extends Quotation {
  current_version: QuotationVersion | null;
  lines: QuotationLine[];
}

export interface QuotationListResponse {
  items: Quotation[];
  total: number;
  page: number;
  page_size: number;
}

export interface QuotationCreate {
  name: string;
  from_date: string;
  to_date: string;
  notes?: string;
  commission?: number;
  contact_id?: string;
}

export interface AddVehicleRequest {
  vehicle_id: string;
  date: string;
}

export interface AddRoomRequest {
  room_id: string;
  date: string;
  additional_adults?: number;
  additional_children?: number;
}

export interface AddActivityRequest {
  activity_id: string;
  date: string;
  adults?: number;
  children?: number;
  free?: number;
  recommendation?: string;
}

export interface ServiceSummaryLine {
  name: string;
  qty: number;
  total: number;
}

export interface QuotationSummary {
  // Para versión v1 (cotización base)
  rooms: ServiceSummaryLine[];
  activities: ServiceSummaryLine[];
  vehicles: ServiceSummaryLine[];
  rooms_total: number;
  activities_total: number;
  vehicles_total: number;
  subtotal: number;
  commission: number;
  commission_rate: number;
  total: number;

  // Solo para versiones posteriores (equivalente a copied=True)
  is_version: boolean;
  base_total: number | null;
  // Originales
  original_rooms: ServiceSummaryLine[];
  original_activities: ServiceSummaryLine[];
  original_vehicles: ServiceSummaryLine[];
  // Eliminados
  deleted_rooms: ServiceSummaryLine[];
  deleted_activities: ServiceSummaryLine[];
  deleted_vehicles: ServiceSummaryLine[];
  deleted_subtotal: number;
  // Nuevos
  new_rooms: ServiceSummaryLine[];
  new_activities: ServiceSummaryLine[];
  new_vehicles: ServiceSummaryLine[];
  new_subtotal: number;
}