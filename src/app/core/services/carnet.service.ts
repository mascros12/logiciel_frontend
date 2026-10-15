import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { apiUrl } from '../config/api.config';
import {
  CarnetView,
  DraftWrite,
  PublicCarnet,
  PublicLinkView,
  PublicationView,
  RevisionItem,
  SourceStatusView,
  SyncApply,
  SyncPreview,
  SyncProposal,
} from '../models/carnet.model';

@Injectable({ providedIn: 'root' })
export class CarnetService {
  private readonly http = inject(HttpClient);

  findByFile(fileAaId: string) {
    return this.http.get<CarnetView>(apiUrl(`/carnets/file-aa/${fileAaId}`));
  }

  openFromFile(fileAaId: string) {
    return this.http.post<CarnetView>(apiUrl(`/carnets/file-aa/${fileAaId}`), {});
  }

  get(carnetId: string) {
    return this.http.get<CarnetView>(apiUrl(`/carnets/${carnetId}`));
  }

  save(carnetId: string, body: DraftWrite) {
    return this.http.put<CarnetView>(apiUrl(`/carnets/${carnetId}/draft`), body);
  }

  sourceStatus(carnetId: string) {
    return this.http.get<SourceStatusView>(apiUrl(`/carnets/${carnetId}/source-status`));
  }

  syncProposal(carnetId: string) {
    return this.http.get<SyncProposal>(apiUrl(`/carnets/${carnetId}/sync-proposal`));
  }

  previewSync(carnetId: string, body: SyncApply) {
    return this.http.post<SyncPreview>(apiUrl(`/carnets/${carnetId}/sync`), {
      ...body,
      dry_run: true,
    });
  }

  applySync(carnetId: string, body: SyncApply) {
    return this.http.post<CarnetView>(apiUrl(`/carnets/${carnetId}/sync`), {
      ...body,
      dry_run: false,
    });
  }

  publish(carnetId: string, lockVersion: number) {
    return this.http.post<CarnetView>(apiUrl(`/carnets/${carnetId}/publications`), {
      lock_version: lockVersion,
    });
  }

  revisions(carnetId: string) {
    return this.http.get<{ items: RevisionItem[] }>(apiUrl(`/carnets/${carnetId}/revisions`));
  }

  publicLink(carnetId: string) {
    return this.http.get<PublicLinkView>(apiUrl(`/carnets/${carnetId}/public-link`));
  }

  revokeLink(carnetId: string) {
    return this.http.post<PublicationView>(apiUrl(`/carnets/${carnetId}/public-link/revoke`), {});
  }

  rotateLink(carnetId: string) {
    return this.http.post<PublicLinkView>(apiUrl(`/carnets/${carnetId}/public-link/rotate`), {});
  }

  published(token: string) {
    return this.http.get<PublicCarnet>(
      apiUrl(`/public/carnets/${encodeURIComponent(token)}`),
    );
  }

  draftPdf(carnetId: string) {
    return this.http.get(apiUrl(`/carnets/${carnetId}/draft.pdf`), { responseType: 'blob' });
  }

  revisionPdf(carnetId: string, revisionNumber: number) {
    return this.http.get(
      apiUrl(`/carnets/${carnetId}/revisions/${revisionNumber}/document.pdf`),
      { responseType: 'blob' },
    );
  }

  publishedPdf(token: string) {
    return this.http.get(
      apiUrl(`/public/carnets/${encodeURIComponent(token)}/document.pdf`),
      { responseType: 'blob' },
    );
  }

  saveBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.rel = 'noopener noreferrer';
    link.click();
    URL.revokeObjectURL(url);
  }
}
