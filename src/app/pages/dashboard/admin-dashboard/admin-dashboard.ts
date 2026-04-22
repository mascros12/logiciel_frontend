import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';

import {
  Quotation,
  QuotationSummary,
  ServiceSummaryLine,
} from '../../../core/models/quotation.model';
import { QuotationService } from '../../../core/services/quotation.service';
import { AuthService } from '../../../core/auth/auth.service';

interface TopItem extends ServiceSummaryLine {
  kind: 'hotel' | 'activity' | 'vehicle';
}

interface CalendarDay {
  date: string;
  label: string;
  count: number;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, CardModule, TableModule, ButtonModule, SkeletonModule],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.scss',
})
export class AdminDashboard implements OnInit {
  loading = signal(true);
  loadingTop = signal(true);

  recentQuotations = signal<Quotation[]>([]);
  topItems = signal<TopItem[]>([]);
  calendarDays = signal<CalendarDay[]>([]);

  readonly recentLimit = 8;
  readonly topLimit = 10;

  constructor(
    private quotationService: QuotationService,
    private auth: AuthService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.loadDashboard();
  }

  get userName(): string {
    return this.auth.currentUser()?.full_name ?? 'Usuario';
  }

  goToQuotations() {
    this.router.navigate(['/cotizaciones']);
  }

  openQuotation(q: Quotation) {
    this.router.navigate(['/cotizaciones', q.id]);
  }

  private loadDashboard() {
    this.loading.set(true);
    this.loadingTop.set(true);

    this.quotationService.getAll(1, this.recentLimit).subscribe({
      next: async (res) => {
        const items = (res.items ?? []).sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );

        this.recentQuotations.set(items);
        this.buildCalendarFromQuotations(items);
        await this.buildTopFromQuotations(items);

        this.loading.set(false);
        this.loadingTop.set(false);
      },
      error: () => {
        this.recentQuotations.set([]);
        this.topItems.set([]);
        this.calendarDays.set([]);
        this.loading.set(false);
        this.loadingTop.set(false);
      },
    });
  }

  private async buildTopFromQuotations(quotations: Quotation[]) {
    const roomMap = new Map<string, ServiceSummaryLine>();
    const activityMap = new Map<string, ServiceSummaryLine>();
    const vehicleMap = new Map<string, ServiceSummaryLine>();

    for (const q of quotations.slice(0, this.recentLimit)) {
      const current = q.versions.find(v => v.is_current) ?? q.versions[0];
      if (!current) continue;

      try {
        const summary = await firstValueFrom(
          this.quotationService.getSummary(q.id, current.id),
        );
        this.accumulateSummary(summary, roomMap, activityMap, vehicleMap);
      } catch {
        // omitimos cotizaciones con summary no disponible
      }
    }

    const toTop = (
      map: Map<string, ServiceSummaryLine>,
      kind: TopItem['kind'],
    ): TopItem[] =>
      Array.from(map.values())
        .sort((a, b) => b.total - a.total)
        .slice(0, this.topLimit)
        .map(x => ({ ...x, kind }));

    this.topItems.set([
      ...toTop(roomMap, 'hotel'),
      ...toTop(activityMap, 'activity'),
      ...toTop(vehicleMap, 'vehicle'),
    ]);
  }

  private accumulateSummary(
    summary: QuotationSummary,
    roomMap: Map<string, ServiceSummaryLine>,
    activityMap: Map<string, ServiceSummaryLine>,
    vehicleMap: Map<string, ServiceSummaryLine>,
  ) {
    const addLines = (lines: ServiceSummaryLine[] | undefined, target: Map<string, ServiceSummaryLine>) => {
      for (const line of lines ?? []) {
        if (!line?.name) continue;
        const existing = target.get(line.name);
        if (existing) {
          existing.qty += line.qty ?? 0;
          existing.total += line.total ?? 0;
        } else {
          target.set(line.name, { ...line });
        }
      }
    };

    addLines(summary.rooms, roomMap);
    addLines(summary.activities, activityMap);
    addLines(summary.vehicles, vehicleMap);
  }

  private buildCalendarFromQuotations(quotations: Quotation[]) {
    const today = new Date();
    const horizon = 42;
    const counts = new Map<string, number>();

    for (const q of quotations) {
      if (!q.from_date) continue;
      const d = new Date(q.from_date);
      const delta = (d.getTime() - today.getTime()) / 86400000;
      if (delta < 0 || delta > horizon) continue;
      const key = d.toISOString().split('T')[0];
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    const days: CalendarDay[] = [];
    for (let i = 0; i < horizon; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const key = d.toISOString().split('T')[0];
      days.push({
        date: key,
        label: String(d.getDate()),
        count: counts.get(key) ?? 0,
      });
    }
    this.calendarDays.set(days);
  }
}

