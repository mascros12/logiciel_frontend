import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import {
  VehicleOption, HotelOption, ActivityOption,
  ProviderListResponse, RoomOption
} from '../models/provider.model';

@Injectable({ providedIn: 'root' })
export class ProviderService {
  constructor(private http: HttpClient) {}

  getVehicles(search = '') {
    const params = new HttpParams().set('page_size', 100);
    return this.http.get<ProviderListResponse<VehicleOption>>(
      `${environment.apiUrl}/vehicles`, { params }
    );
  }

  getHotels(search = '') {
    const params = new HttpParams().set('page_size', 100);
    return this.http.get<ProviderListResponse<HotelOption>>(
      `${environment.apiUrl}/hotels`, { params }
    );
  }

  getRoomsByHotel(hotelId: string) {
    return this.http.get<ProviderListResponse<RoomOption>>(
      `${environment.apiUrl}/hotels/${hotelId}/rooms`
    );
  }

  getActivities(search = '') {
    const params = new HttpParams().set('page_size', 100);
    return this.http.get<ProviderListResponse<ActivityOption>>(
      `${environment.apiUrl}/activities`, { params }
    );
  }
}