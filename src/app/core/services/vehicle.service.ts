import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import {
  Vehicle, VehicleListResponse, VehicleCreate, VehicleSeasonCreate
} from '../models/vehicle.model';
import { apiUrl } from '../config/api.config';

@Injectable({ providedIn: 'root' })
export class VehicleService {
  private url = apiUrl('/vehicles');

  constructor(private http: HttpClient) {}

  getAll(page = 1, pageSize = 100, search = '') {
    let params = new HttpParams().set('page', page).set('page_size', pageSize);
    if (search) params = params.set('search', search);
    return this.http.get<VehicleListResponse>(this.url, { params });
  }

  getById(id: string) {
    return this.http.get<Vehicle>(`${this.url}/${id}`);
  }

  create(body: VehicleCreate) {
    return this.http.post<Vehicle>(this.url, body);
  }

  update(id: string, body: Partial<VehicleCreate>) {
    return this.http.patch<Vehicle>(`${this.url}/${id}`, body);
  }

  delete(id: string) {
    return this.http.delete(`${this.url}/${id}`);
  }

  addSeason(vehicleId: string, body: VehicleSeasonCreate) {
    return this.http.post(`${this.url}/${vehicleId}/seasons`, body);
  }

  deleteSeason(vehicleId: string, seasonId: string) {
    return this.http.delete(`${this.url}/${vehicleId}/seasons/${seasonId}`);
  }
}