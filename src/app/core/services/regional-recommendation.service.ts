import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { forkJoin, map, Observable, of, switchMap } from 'rxjs';
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
    page?: number;
    pageSize?: number;
  }) {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 0;
    let params = new HttpParams().set('page', page).set('page_size', pageSize);
    if (filters.active != null) params = params.set('active', filters.active);
    if (filters.category) params = params.set('category', filters.category);
    if (filters.zoneId) params = params.set('zone_id', filters.zoneId);
    if (filters.q) params = params.set('q', filters.q);
    return this.http.get<RegionalRecommendationList>(`${this.url}/`, { params });
  }

  /**
   * Catálogo completo. Con el API nuevo basta una respuesta.
   * Si el servidor todavía recorta a 200, se piden las páginas que falten.
   */
  listAll(filters: {
    active?: boolean | null;
    category?: string | null;
    zoneId?: string | null;
    q?: string;
  }): Observable<RegionalRecommendationList> {
    const pageSize = 200;
    return this.list({ ...filters, page: 1, pageSize: 0 }).pipe(
      switchMap((first) => {
        if (first.items.length >= first.total) return of(first);
        const pages = Math.max(1, Math.ceil(first.total / pageSize));
        const requests = Array.from({ length: pages }, (_, index) =>
          this.list({ ...filters, page: index + 1, pageSize }),
        );
        return forkJoin(requests).pipe(
          map((lists) => ({
            items: lists.flatMap((page) => page.items),
            total: first.total,
            page: 1,
            page_size: first.total,
          })),
        );
      }),
    );
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
