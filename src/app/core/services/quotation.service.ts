import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import {
  Quotation, QuotationFull, QuotationListResponse, QuotationLine,
  QuotationCreate, QuotationUpdate, QuotationVersion,
  AddVehicleRequest, AddRoomRequest, AddActivityRequest,
  QuotationSummary,
  FileAAGenerateRequest,
  FileAAWithDetails,
  FileAADetailRow,
  FileAADetailPatch,
  FileAADetailSourceOption,
  FileAADetailCreateBody,
  FileAARoomCatalogOption,
  FileAAActivityCatalogOption,
  FileAAVehicleCatalogOption,
} from '../models/quotation.model';
import { apiUrl } from '../config/api.config';

@Injectable({ providedIn: 'root' })
export class QuotationService {
  private url = apiUrl('/quotations');

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

  /**
   * Reordena el contenido de los días: mismo conjunto de fechas calendario, distinta asignación por línea.
   * Debe incluir todos los ids de línea de la versión, sin duplicados.
   */
  reorderVersionLines(quotationId: string, versionId: string, body: { line_ids_in_order: string[] }) {
    return this.http.post<{ ok: boolean; lines: number }>(
      `${this.url}/${quotationId}/versions/${versionId}/reorder-lines`,
      body
    );
  }

  /**
   * Inserta días vacíos al inicio (after_line_id null) o después de la línea indicada; desplaza fechas posteriores.
   */
  insertLineDays(
    quotationId: string,
    versionId: string,
    body: { after_line_id: string | null; count: number }
  ) {
    return this.http.post<{ ok: boolean; inserted: number }>(
      `${this.url}/${quotationId}/versions/${versionId}/insert-line-days`,
      body
    );
  }

  /** Quita líneas-día (soft delete) y compacta fechas del resto del itinerario. */
  removeVersionLines(quotationId: string, versionId: string, body: { line_ids: string[] }) {
    return this.http.post<{ ok: boolean; removed: number }>(
      `${this.url}/${quotationId}/versions/${versionId}/remove-line-days`,
      body
    );
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

  generateFileAA(quotationId: string, body: FileAAGenerateRequest) {
    return this.http.post<FileAAWithDetails>(`${this.url}/${quotationId}/file-aa`, body);
  }

  /** Última Ficha AA de la cotización (404 si no existe). */
  getLatestFileAA(quotationId: string) {
    return this.http.get<FileAAWithDetails>(`${this.url}/${quotationId}/file-aa/latest`);
  }

  patchFileAADetail(detailId: string, body: FileAADetailPatch) {
    return this.http.patch<FileAADetailRow>(`${this.url}/details/${detailId}`, body);
  }

  /** Servicios del itinerario actual por categoría (hotel, actividad, vehículo). */
  getFichaDetailSourceOptions(quotationId: string, category: 'room' | 'activity' | 'vehicle') {
    const params = new HttpParams().set('category', category);
    return this.http.get<FileAADetailSourceOption[]>(
      `${this.url}/${quotationId}/file-aa/detail-source-options`,
      { params },
    );
  }

  /** Catálogo completo de habitaciones (tablas Hotel + Room) para Ficha AA. */
  getFichaRoomCatalog() {
    return this.http.get<FileAARoomCatalogOption[]>(`${this.url}/file-aa/room-catalog`);
  }

  getFichaActivityCatalog() {
    return this.http.get<FileAAActivityCatalogOption[]>(`${this.url}/file-aa/activity-catalog`);
  }

  getFichaVehicleCatalog() {
    return this.http.get<FileAAVehicleCatalogOption[]>(`${this.url}/file-aa/vehicle-catalog`);
  }

  createFileAADetailRow(fileId: string, body: FileAADetailCreateBody) {
    return this.http.post<FileAADetailRow>(`${this.url}/file-aa/${fileId}/details`, body);
  }

  deleteFileAADetail(detailId: string) {
    return this.http.delete<void>(`${this.url}/details/${detailId}`);
  }

  updateFileAA(fileId: string, body: { header_color?: string }) {
    return this.http.patch<FileAAWithDetails>(`${this.url}/file-aa/${fileId}`, body);
  }

  /** Documento Word con resumen y tabla de la Ficha AA (blob). */
  downloadFichaAAWord(fileId: string) {
    return this.http.get(`${this.url}/file-aa/${fileId}/word`, {
      responseType: 'blob',
    });
  }

  /** PDF con resumen y tabla de la Ficha AA (blob). */
  downloadFichaAAPdf(fileId: string) {
    return this.http.get(`${this.url}/file-aa/${fileId}/pdf`, {
      responseType: 'blob',
    });
  }

  /** Envía correo de solicitud al proveedor para una fila de la Ficha AA (vehículo: adjuntos + plantilla corta). */
  sendFileAADetailReservationEmail(fileId: string, detailId: string) {
    return this.http.post<{ message: string }>(
      `${this.url}/file-aa/${fileId}/send/${detailId}`,
      {},
    );
  }

  /** Vista previa del PDF que se adjuntará al enviar correo de una fila de Ficha AA. */
  previewFileAADetailReservationPdf(fileId: string, detailId: string) {
    return this.http.get(`${this.url}/file-aa/${fileId}/send/${detailId}/preview-pdf`, {
      responseType: 'blob',
    });
  }

  getSummary(quotationId: string, versionId: string) {
    return this.http.get<QuotationSummary>(
      `${this.url}/${quotationId}/versions/${versionId}/summary`
    );
  }

  deleteVehicle(id: string) {
    return this.http.delete(apiUrl(`/quotations/vehicles/${id}`));
  }
  
  deleteRoom(id: string) {
    return this.http.delete(apiUrl(`/quotations/rooms/${id}`));
  }
  
  deleteActivity(id: string) {
    return this.http.delete(apiUrl(`/quotations/activities/${id}`));
  }
}