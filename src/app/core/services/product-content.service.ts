import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { apiUrl } from '../config/api.config';
import {
  ActivityContentDetail,
  ActivityContentListResponse,
  BulkEnqueueResponse,
  BulkPreview,
  HotelContentDetail,
  HotelContentListResponse,
  ProductContentView,
  ProductContentWrite,
  ProductEntityPath,
  RoomClassificationView,
  RoomClassificationWrite,
  RoomContentDetail,
  VehicleContentDetail,
  VehicleContentListResponse,
} from '../models/product-content.model';

@Injectable({ providedIn: 'root' })
export class ProductContentService {
  private readonly http = inject(HttpClient);
  private readonly url = apiUrl('/product-content');

  listHotels(page: number, pageSize: number, q: string, catalogStatus: string | null, missingField: string | null) {
    return this.http.get<HotelContentListResponse>(`${this.url}/hotels`, {
      params: this.listParams(page, pageSize, q, catalogStatus, missingField),
    });
  }

  getHotel(id: string) {
    return this.http.get<HotelContentDetail>(`${this.url}/hotels/${id}`);
  }

  listActivities(page: number, pageSize: number, q: string, catalogStatus: string | null, missingField: string | null) {
    return this.http.get<ActivityContentListResponse>(`${this.url}/activities`, {
      params: this.listParams(page, pageSize, q, catalogStatus, missingField),
    });
  }

  getActivity(id: string) {
    return this.http.get<ActivityContentDetail>(`${this.url}/activities/${id}`);
  }

  listVehicles(page: number, pageSize: number, q: string, catalogStatus: string | null, missingField: string | null) {
    return this.http.get<VehicleContentListResponse>(`${this.url}/vehicles`, {
      params: this.listParams(page, pageSize, q, catalogStatus, missingField),
    });
  }

  getVehicle(id: string) {
    return this.http.get<VehicleContentDetail>(`${this.url}/vehicles/${id}`);
  }

  getRoom(id: string) {
    return this.http.get<RoomContentDetail>(`${this.url}/rooms/${id}`);
  }

  saveContent(entityType: ProductEntityPath, entityId: string, body: ProductContentWrite) {
    return this.http.put<ProductContentView>(`${this.url}/${entityType}/${entityId}`, body);
  }

  requestEnrichment(entityType: ProductEntityPath, entityId: string) {
    return this.http.post<{ id: string; status: string }>(
      `${this.url}/${entityType}/${entityId}/enrichment-runs`,
      {},
    );
  }

  previewEnrichment() {
    return this.http.get<BulkPreview>(`${this.url}/enrichment-runs/bulk-preview`);
  }

  runEnrichment() {
    return this.http.post<BulkEnqueueResponse>(`${this.url}/enrichment-runs/bulk`, {});
  }

  saveRoomClassification(roomId: string, body: RoomClassificationWrite) {
    return this.http.put<RoomClassificationView>(
      `${this.url}/rooms/${roomId}/classification`,
      body,
    );
  }

  private listParams(
    page: number,
    pageSize: number,
    q: string,
    catalogStatus: string | null,
    missingField: string | null,
  ): HttpParams {
    let params = new HttpParams().set('page', page).set('page_size', pageSize);
    const term = q.trim();
    if (term) params = params.set('q', term);
    if (catalogStatus && catalogStatus !== 'all') {
      params = params.set('catalog_status', catalogStatus);
    }
    if (missingField && missingField !== 'all') {
      params = params.set('missing_field', missingField);
    }
    return params;
  }
}

export function httpErrorText(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) return 'No hay conexión con el servidor.';
    const detail = error.error?.detail;
    if (typeof detail === 'string' && detail.trim()) return detail;
    if (Array.isArray(detail)) {
      const messages = detail
        .map((item) => {
          if (typeof item === 'string') return item;
          if (item && typeof item === 'object' && 'msg' in item) {
            return String((item as { msg: unknown }).msg);
          }
          return '';
        })
        .filter((message) => message.length > 0);
      if (messages.length > 0) return messages.join(' ');
    }
    if (error.status === 403) return 'No tienes permiso para esta acción.';
    if (error.status === 404) return 'No se encontró el producto.';
    if (error.status === 409) {
      return 'El contenido se actualizó al mismo tiempo. Intente de nuevo.';
    }
  }
  return 'No se pudo completar la operación.';
}
