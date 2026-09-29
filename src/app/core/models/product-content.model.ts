/** DTOs de `/product-content`. No incluyen precios ni correos de reserva. */

export type ContentLocaleCode = 'es' | 'fr';

export type CapacityType =
  | 'single'
  | 'double'
  | 'triple'
  | 'quadruple'
  | 'quintuple'
  | 'mixed';

export type ProductEntityPath = 'hotels' | 'rooms' | 'activities' | 'vehicles';

export type EnrichmentStatus =
  | 'queued'
  | 'running'
  | 'pending_review'
  | 'accepted'
  | 'rejected'
  | 'superseded'
  | 'failed';

export interface ContentLocale {
  description: string | null;
  short_description: string | null;
  selling_points: string[];
  recommendation: string | null;
}

export interface ProductContentView {
  id: string;
  attributes: Record<string, string | boolean>;
  es: ContentLocale | null;
  fr: ContentLocale | null;
}

export interface EnrichmentRunSummary {
  id: string;
  status: EnrichmentStatus;
  confidence: string | number | null;
  created_at: string;
  reviewed_at: string | null;
}

export interface ContentListFlags {
  has_content: boolean;
  locales: ContentLocaleCode[];
  pending_review: boolean;
  catalog_complete: boolean;
  missing_fields: string[];
  enrichment_status: EnrichmentStatus | null;
}

export interface HotelContentListItem extends ContentListFlags {
  id: string;
  name: string;
  province: string | null;
  category: string | null;
}

export interface ActivityContentListItem extends ContentListFlags {
  id: string;
  name: string;
  name_es: string;
  province: string | null;
  category: string | null;
}

export interface VehicleContentListItem extends ContentListFlags {
  id: string;
  name: string;
  brand: string;
  seats: number;
  category: string | null;
}

export interface ContentListResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export type HotelContentListResponse = ContentListResponse<HotelContentListItem>;
export type ActivityContentListResponse = ContentListResponse<ActivityContentListItem>;
export type VehicleContentListResponse = ContentListResponse<VehicleContentListItem>;

export interface RoomContentSummary {
  room_id: string;
  name: string;
  capacity_type: CapacityType | null;
  room_class: string | null;
  has_content: boolean;
  locales: ContentLocaleCode[];
  catalog_complete: boolean;
  missing_fields: string[];
}

export interface HotelContentDetail {
  id: string;
  name: string;
  province: string | null;
  category: string | null;
  address: string | null;
  longitude: string | null;
  latitude: string | null;
  content: ProductContentView | null;
  pending_run: EnrichmentRunSummary | null;
  latest_run: EnrichmentRunSummary | null;
  active_run: EnrichmentRunSummary | null;
  catalog_complete: boolean;
  missing_fields: string[];
  rooms: RoomContentSummary[];
}

export interface RoomContentDetail {
  id: string;
  name: string;
  hotel_id: string;
  hotel_name: string;
  capacity_type: CapacityType | null;
  room_class: string | null;
  content: ProductContentView | null;
  pending_run: EnrichmentRunSummary | null;
  latest_run: EnrichmentRunSummary | null;
  active_run: EnrichmentRunSummary | null;
  catalog_complete: boolean;
  missing_fields: string[];
}

export interface RoomClassificationView {
  id: string;
  name: string;
  hotel_id: string;
  hotel_name: string;
  capacity_type: CapacityType | null;
  room_class: string | null;
}

export interface ActivityContentDetail {
  id: string;
  name: string;
  name_es: string;
  province: string | null;
  category: string | null;
  address: string | null;
  longitude: string | null;
  latitude: string | null;
  content: ProductContentView | null;
  pending_run: EnrichmentRunSummary | null;
  latest_run: EnrichmentRunSummary | null;
  active_run: EnrichmentRunSummary | null;
  catalog_complete: boolean;
  missing_fields: string[];
}

export interface VehicleContentDetail {
  id: string;
  name: string;
  brand: string;
  seats: number;
  bag: number;
  carryon_bag: number;
  category: string | null;
  content: ProductContentView | null;
  pending_run: EnrichmentRunSummary | null;
  latest_run: EnrichmentRunSummary | null;
  active_run: EnrichmentRunSummary | null;
  catalog_complete: boolean;
  missing_fields: string[];
}

export interface BulkTypeCounts {
  hotels: number;
  rooms: number;
  activities: number;
  vehicles: number;
  total: number;
}

export interface BulkPreview {
  mode: 'missing';
  eligible: BulkTypeCounts;
}

export interface BulkEnqueueResponse {
  mode: 'missing';
  eligible: number;
  queued: number;
  skipped_active: number;
  skipped_pending_review: number;
  skipped_already_enriched: number;
  queued_by_type: BulkTypeCounts;
}

export interface ContentLocaleWrite {
  description?: string;
  short_description?: string;
  selling_points?: string[];
  recommendation?: string;
}

export interface ProductContentWrite {
  es?: ContentLocaleWrite;
  fr?: ContentLocaleWrite;
  attributes_set?: Record<string, string | boolean>;
  attributes_unset?: string[];
}

export interface RoomClassificationWrite {
  capacity_type?: CapacityType | null;
  room_class?: string | null;
}
