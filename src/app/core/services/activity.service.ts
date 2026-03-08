import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Activity, ActivityListResponse, ActivityCreate, ActivityUpdate } from '../models/activity.model';

@Injectable({ providedIn: 'root' })
export class ActivityService {
  private url = `${environment.apiUrl}/activities`;

  constructor(private http: HttpClient) {}

  getAll(page = 1, pageSize = 50, search = '') {
    let params = new HttpParams()
      .set('page', page)
      .set('page_size', pageSize);
    if (search) params = params.set('search', search);
    return this.http.get<ActivityListResponse>(this.url, { params });
  }

  getById(id: string) {
    return this.http.get<Activity>(`${this.url}/${id}`);
  }

  create(body: ActivityCreate) {
    return this.http.post<Activity>(this.url, body);
  }

  update(id: string, body: ActivityUpdate) {
    return this.http.patch<Activity>(`${this.url}/${id}`, body);
  }

  delete(id: string) {
    return this.http.delete(`${this.url}/${id}`);
  }
}