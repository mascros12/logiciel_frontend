import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Zone, ZoneCreate, ZoneListResponse, ZoneUpdate } from '../models/zone.model';
import { apiUrl } from '../config/api.config';

@Injectable({ providedIn: 'root' })
export class ZoneService {
  private url = apiUrl('/zones');

  constructor(private http: HttpClient) {}

  getAll(page = 1, pageSize = 1000) {
    const params = new HttpParams()
      .set('page', page)
      .set('page_size', pageSize);
    return this.http.get<ZoneListResponse>(this.url, { params });
  }

  create(body: ZoneCreate) {
    return this.http.post<Zone>(this.url, body);
  }

  update(id: string, body: ZoneUpdate) {
    return this.http.patch<Zone>(`${this.url}/${id}`, body);
  }

  delete(id: string) {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
