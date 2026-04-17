import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import {
  VehicleOption, HotelOption, ActivityOption,
  ProviderListResponse, RoomOption
} from '../models/provider.model';
import { apiUrl } from '../config/api.config';

@Injectable({ providedIn: 'root' })
export class ProviderService {
  constructor(private http: HttpClient) {}

  getVehicles(search = '') {
    const params = new HttpParams().set('page_size', 100);
    return this.http.get<ProviderListResponse<VehicleOption>>(
      apiUrl('/vehicles'), { params }
    );
  }

  getHotels(search = '') {
    const params = new HttpParams().set('page_size', 100);
    return this.http.get<ProviderListResponse<HotelOption>>(
      apiUrl('/hotels'), { params }
    );
  }

  /**
   * El API devuelve un array directo (list[RoomResponse]), no un objeto paginado.
   */
  getRoomsByHotel(hotelId: string) {
    return this.http.get<RoomOption[]>(
      apiUrl(`/hotels/${hotelId}/rooms`)
    );
  }

  getActivities(search = '') {
    const params = new HttpParams().set('page_size', 100);
    return this.http.get<ProviderListResponse<ActivityOption>>(
      apiUrl('/activities'), { params }
    );
  }
}