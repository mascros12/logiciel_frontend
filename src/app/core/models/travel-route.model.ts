export type RouteMode = 'zone_to_zone' | 'place_to_place';
export type PlaceKind = 'hotel' | 'activity' | 'provider_branch';

export interface TravelRoute {
  id: string;
  mode: RouteMode;
  active: boolean;
  distance_km: string | number | null;
  duration_minutes: number | null;
  duration_label: string;
  distance_label: string;
  instructions: string;
  origin_zone_id: string;
  destination_zone_id: string;
  origin_zone_name: string;
  destination_zone_name: string;
  origin_kind: PlaceKind | null;
  origin_id: string | null;
  origin_name: string | null;
  destination_kind: PlaceKind | null;
  destination_id: string | null;
  destination_name: string | null;
}

export interface TravelRouteList {
  items: TravelRoute[];
  total: number;
  page: number;
  page_size: number;
}

export interface TravelRouteWrite {
  mode: RouteMode;
  active: boolean;
  distance_km: number | null;
  duration_minutes: number | null;
  instructions: string;
  origin_zone_id: string;
  destination_zone_id: string;
  origin_kind: PlaceKind | null;
  origin_id: string | null;
  destination_kind: PlaceKind | null;
  destination_id: string | null;
}

export interface RouteOptionZone {
  id: string;
  name: string;
}

export interface RouteOptionPlace {
  id: string;
  name: string;
  zone_id: string | null;
}

export interface TravelRouteOptions {
  zones: RouteOptionZone[];
  hotels: RouteOptionPlace[];
  activities: RouteOptionPlace[];
  branches: RouteOptionPlace[];
}
