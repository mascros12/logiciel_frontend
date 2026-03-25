import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import {
  Quotation, QuotationFull, QuotationListResponse, QuotationLine,
  QuotationCreate, QuotationUpdate, QuotationVersion,
  AddVehicleRequest, AddRoomRequest, AddActivityRequest,
  QuotationSummary
} from '../models/quotation.model';

@Injectable({ providedIn: 'root' })
export class QuotationService {
  private url = `${environment.apiUrl}/quotations`;

  constructor(private http: HttpClient) {}

  getAll(page = 1, pageSize = 20) {
    const params = new HttpParams()
      .set('page', page)
      .set('page_size', pageSize);
    return this.http.get<QuotationListResponse>(this.url, { params });
  }

  getById(id: string) {
    return this.http.get<QuotationFull>(`${this.url}/${id}`);
  }

  getVersionLines(quotationId: string, versionId: string) {
    return this.http.get<QuotationLine[]>(
      `${this.url}/${quotationId}/versions/${versionId}/lines`
    );
  }

  syncCalendar(quotationId: string, versionId: string, body: { from_date: string; to_date: string }) {
    return this.http.post<{ ok: boolean; from_date: string; to_date: string }>(
      `${this.url}/${quotationId}/versions/${versionId}/sync-calendar`,
      body
    );
  }

  /** Desplaza todos los días de la agenda y las fechas del viaje según la nueva primera fecha. */
  shiftItineraryDates(quotationId: string, versionId: string, body: { new_first_date: string }) {
    return this.http.post<{
      ok: boolean;
      delta_days: number;
      old_first: string;
      new_first: string;
    }>(`${this.url}/${quotationId}/versions/${versionId}/shift-itinerary-dates`, body);
  }

  create(body: QuotationCreate) {
    return this.http.post<Quotation>(this.url, body);
  }

  update(id: string, body: QuotationUpdate) {
    return this.http.patch<Quotation>(`${this.url}/${id}`, body);
  }

  delete(id: string) {
    return this.http.delete(`${this.url}/${id}`);
  }

  createVersion(quotationId: string, notes?: string) {
    return this.http.post<QuotationVersion>(
      `${this.url}/${quotationId}/versions`, { notes }
    );
  }

  recalculate(quotationId: string, versionId: string) {
    return this.http.post<Quotation>(
      `${this.url}/${quotationId}/versions/${versionId}/recalculate`, {}
    );
  }

  addVehicle(quotationId: string, versionId: string, body: AddVehicleRequest) {
    return this.http.post(
      `${this.url}/${quotationId}/versions/${versionId}/vehicles`, body
    );
  }

  addRoom(quotationId: string, versionId: string, body: AddRoomRequest) {
    return this.http.post(
      `${this.url}/${quotationId}/versions/${versionId}/rooms`, body
    );
  }

  addActivity(quotationId: string, versionId: string, body: AddActivityRequest) {
    return this.http.post(
      `${this.url}/${quotationId}/versions/${versionId}/activities`, body
    );
  }

  generateFileAA(quotationId: string) {
    return this.http.post(`${this.url}/${quotationId}/file-aa`, {});
  }

  getSummary(quotationId: string, versionId: string) {
    return this.http.get<QuotationSummary>(
      `${this.url}/${quotationId}/versions/${versionId}/summary`
    );
  }

  deleteVehicle(id: string) {
    return this.http.delete(`${environment.apiUrl}/quotations/vehicles/${id}`);
  }
  
  deleteRoom(id: string) {
    return this.http.delete(`${environment.apiUrl}/quotations/rooms/${id}`);
  }
  
  deleteActivity(id: string) {
    return this.http.delete(`${environment.apiUrl}/quotations/activities/${id}`);
  }
}