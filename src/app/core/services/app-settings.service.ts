import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs/operators';
import { AppSettings, AppSettingsUpdate } from '../models/app-settings.model';
import { apiUrl } from '../config/api.config';

const FALLBACK_QUOTATION_COMMISSION = 1.92;

@Injectable({ providedIn: 'root' })
export class AppSettingsService {
  private url = apiUrl('/settings');

  /** Último valor conocido (útil como fallback en formularios). */
  readonly settings = signal<AppSettings | null>(null);

  constructor(private http: HttpClient) {}

  get() {
    return this.http.get<AppSettings>(this.url).pipe(
      tap((s) => this.settings.set(s)),
    );
  }

  update(body: AppSettingsUpdate) {
    return this.http.patch<AppSettings>(this.url, body).pipe(
      tap((s) => this.settings.set(s)),
    );
  }

  defaultQuotationCommission(): number {
    return this.settings()?.default_quotation_commission ?? FALLBACK_QUOTATION_COMMISSION;
  }
}
