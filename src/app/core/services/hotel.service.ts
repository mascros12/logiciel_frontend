import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import {
  Hotel, HotelListResponse, HotelCreate,
  Room, RoomCreate, RoomSeasonCreate,
  HotelSeason, HotelSeasonCreate,
} from '../models/hotel.model';
import { apiUrl } from '../config/api.config';

@Injectable({ providedIn: 'root' })
export class HotelService {
  private url = apiUrl('/hotels');

  constructor(private http: HttpClient) {}

  getAll(page = 1, pageSize = 100, search = '') {
    let params = new HttpParams().set('page', page).set('page_size', pageSize);
    if (search) params = params.set('search', search);
    return this.http.get<HotelListResponse>(this.url, { params });
  }

  getById(id: string) {
    return this.http.get<Hotel>(`${this.url}/${id}`);
  }

  create(body: HotelCreate) {
    return this.http.post<Hotel>(this.url, body);
  }

  update(id: string, body: Partial<HotelCreate>) {
    return this.http.patch<Hotel>(`${this.url}/${id}`, body);
  }

  delete(id: string) {
    return this.http.delete(`${this.url}/${id}`);
  }

  // Rooms
  addRoom(hotelId: string, body: RoomCreate) {
    return this.http.post<Room>(`${this.url}/${hotelId}/rooms`, body);
  }

  updateRoom(hotelId: string, roomId: string, body: Partial<RoomCreate>) {
    return this.http.patch<Room>(`${this.url}/${hotelId}/rooms/${roomId}`, body);
  }

  deleteRoom(hotelId: string, roomId: string) {
    return this.http.delete(`${this.url}/${hotelId}/rooms/${roomId}`);
  }

  // Hotel seasons (temporadas del hotel)
  getHotelSeasons(hotelId: string) {
    return this.http.get<HotelSeason[]>(`${this.url}/${hotelId}/seasons`);
  }

  addHotelSeason(hotelId: string, body: HotelSeasonCreate) {
    return this.http.post<HotelSeason>(`${this.url}/${hotelId}/seasons`, body);
  }

  deleteHotelSeason(hotelId: string, seasonId: string) {
    return this.http.delete(`${this.url}/${hotelId}/seasons/${seasonId}`);
  }

  // Room seasons (temporadas por habitación)
  addRoomSeason(hotelId: string, roomId: string, body: RoomSeasonCreate) {
    return this.http.post(`${this.url}/${hotelId}/rooms/${roomId}/seasons`, body);
  }

  deleteRoomSeason(hotelId: string, roomId: string, seasonId: string) {
    return this.http.delete(`${this.url}/${hotelId}/rooms/${roomId}/seasons/${seasonId}`);
  }
}