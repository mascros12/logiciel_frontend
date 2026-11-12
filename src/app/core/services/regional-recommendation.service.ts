import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import {
  RecommendationOptionActivity,
  RegionalRecommendation,
  RegionalRecommendationList,
  RegionalRecommendationOptions,
  RegionalRecommendationWrite,
} from '../models/regional-recommendation.model';
import { apiUrl } from '../config/api.config';

@Injectable({ providedIn: 'root' })
export class RegionalRecommendationService {
  private url = apiUrl('/regional-recommendations');

  constructor(private http: HttpClient) {}

  options() {
    return this.http.get<RegionalRecommendationOptions>(`${this.url}/options`);
  }

  defaults(activityId: string) {
    return this.http.get<RecommendationOptionActivity>(
      `${this.url}/activity-defaults/${activityId}`,
    );
  }

  get(id: string) {
    return this.http.get<RegionalRecommendation>(`${this.url}/${id}`);
  }

  list(filters: {
    active?: boolean | null;
    category?: string | null;
    zoneId?: string | null;
    q?: string;
  }) {
    let params = new HttpParams().set('page', 1).set('page_size', 200);
    if (filters.active != null) params = params.set('active', filters.active);
    if (filters.category) params = params.set('category', filters.category);
    if (filters.zoneId) params = params.set('zone_id', filters.zoneId);
    if (filters.q) params = params.set('q', filters.q);
    return this.http.get<RegionalRecommendationList>(`${this.url}/`, { params });
  }

  create(body: RegionalRecommendationWrite) {
    return this.http.post<RegionalRecommendation>(`${this.url}/`, body);
  }

  uploadImage(id: string, file: File) {
    const body = new FormData();
    body.append('file', file);
    return this.http.post<RegionalRecommendation>(`${this.url}/${id}/image`, body);
  }

  clearImage(id: string) {
    return this.http.delete<RegionalRecommendation>(`${this.url}/${id}/image`);
  }

  image(id: string) {
    return this.http.get(`${this.url}/${id}/image`, { responseType: 'blob' });
  }

  update(id: string, body: Partial<RegionalRecommendationWrite>) {
    return this.http.patch<RegionalRecommendation>(`${this.url}/${id}`, body);
  }
}
