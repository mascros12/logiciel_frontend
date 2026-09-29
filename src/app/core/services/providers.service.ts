import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Provider, ProvidersResponse, ProviderWrite } from '../models/providers.model';
import { apiUrl } from '../config/api.config';

@Injectable({ providedIn: 'root' })
export class ProvidersService {
  private url = apiUrl('/providers');

  constructor(private http: HttpClient) {}

  getAll(page = 1, pageSize = 1000) {
    const params = new HttpParams()
      .set('page', page)
      .set('page_size', pageSize);
    return this.http.get<ProvidersResponse>(this.url, { params });
  }

  create(body: ProviderWrite) {
    return this.http.post<Provider>(this.url, body);
  }

  update(id: string, body: ProviderWrite) {
    return this.http.patch<Provider>(`${this.url}/${id}`, body);
  }

  delete(id: string) {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
