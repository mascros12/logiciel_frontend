import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { LayoutDraftWrite, LayoutState, MediaAsset } from '../models/carnet-template.model';
import { apiUrl } from '../config/api.config';

@Injectable({ providedIn: 'root' })
export class CarnetTemplateService {
  private readonly url = apiUrl('/carnet-templates/layout');

  constructor(private http: HttpClient) {}

  load() {
    return this.http.get<LayoutState>(this.url);
  }

  saveDraft(body: LayoutDraftWrite) {
    return this.http.put<LayoutState>(`${this.url}/draft`, body);
  }

  publish() {
    return this.http.post<LayoutState>(`${this.url}/versions`, {});
  }

  upload(file: File) {
    const body = new FormData();
    body.append('file', file);
    return this.http.post<MediaAsset>(apiUrl('/carnet-templates/media'), body);
  }

  activate(versionId: string, lockVersion: number) {
    return this.http.post<LayoutState>(`${this.url}/active`, {
      version_id: versionId,
      lock_version: lockVersion,
    });
  }
}
