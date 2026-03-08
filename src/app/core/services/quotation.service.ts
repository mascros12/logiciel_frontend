import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import {
  Quotation, QuotationFull, QuotationListResponse,
  QuotationCreate, QuotationVersion,
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

  create(body: QuotationCreate) {
    return this.http.post<Quotation>(this.url, body);
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
}