import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import {
  TravelRoute,
  TravelRouteList,
  TravelRouteOptions,
  TravelRouteWrite,
} from '../models/travel-route.model';
import { apiUrl } from '../config/api.config';

@Injectable({ providedIn: 'root' })
export class TravelRouteService {
  private url = apiUrl('/travel-routes');

  constructor(private http: HttpClient) {}

  options() {
    return this.http.get<TravelRouteOptions>(`${this.url}/options`);
  }

  list(active?: boolean | null, mode?: string | null, q?: string) {
    let params = new HttpParams().set('page', 1).set('page_size', 200);
    if (active != null) params = params.set('active', active);
    if (mode) params = params.set('mode', mode);
    if (q) params = params.set('q', q);
    return this.http.get<TravelRouteList>(this.url, { params });
  }

  create(body: TravelRouteWrite) {
    return this.http.post<TravelRoute>(this.url, body);
  }

  update(id: string, body: Partial<TravelRouteWrite>) {
    return this.http.patch<TravelRoute>(`${this.url}/${id}`, body);
  }
}
