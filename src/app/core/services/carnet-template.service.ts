import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { CarnetTemplate, CarnetTemplateUpdate } from '../models/carnet-template.model';
import { apiUrl } from '../config/api.config';

@Injectable({ providedIn: 'root' })
export class CarnetTemplateService {
  private readonly url = apiUrl('/carnet-templates');

  constructor(private http: HttpClient) {}

  list() {
    return this.http.get<CarnetTemplate[]>(`${this.url}/`);
  }

  update(key: string, body: CarnetTemplateUpdate) {
    return this.http.patch<CarnetTemplate>(`${this.url}/${key}`, body);
  }
}
