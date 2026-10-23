export type RecommendationCategory = 'activity' | 'restaurant';

export interface RegionalRecommendation {
  id: string;
  category: RecommendationCategory;
  zone_id: string;
  zone_name: string;
  activity_id: string | null;
  activity_name: string | null;
  name: string;
  opening_hours: string;
  phone: string;
  latitude: string | null;
  longitude: string | null;
  url: string;
  active: boolean;
  activity_type: string | null;
  duration_text: string | null;
  difficulty_text: string | null;
  description: string | null;
}

export interface RegionalRecommendationList {
  items: RegionalRecommendation[];
  total: number;
  page: number;
  page_size: number;
}

export interface RecommendationOptionZone {
  id: string;
  name: string;
}

export interface RecommendationOptionActivity {
  id: string;
  name: string;
  zone_id: string | null;
  phone: string | null;
  latitude: string | null;
  longitude: string | null;
  activity_type: string | null;
}

export interface RegionalRecommendationOptions {
  zones: RecommendationOptionZone[];
  activities: RecommendationOptionActivity[];
}

export interface RegionalRecommendationWrite {
  category: RecommendationCategory;
  zone_id: string;
  activity_id?: string | null;
  name: string;
  opening_hours: string;
  phone: string;
  latitude?: string | null;
  longitude?: string | null;
  url?: string;
  active?: boolean;
  activity_type?: string | null;
  duration_text?: string | null;
  difficulty_text?: string | null;
  description?: string | null;
  clear_activity?: boolean;
  clear_coordinates?: boolean;
}
