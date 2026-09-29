import { Component, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { Subject, of } from 'rxjs';
import { catchError, debounceTime, finalize, map, switchMap } from 'rxjs/operators';
import { ProductContentService, httpErrorText } from '../../../core/services/product-content.service';
import {
  ActivityContentListItem,
  HotelContentListItem,
  VehicleContentListItem,
} from '../../../core/models/product-content.model';
import {
  categoryLabel,
  contentStatusLabel,
  enrichmentStatusLabel,
  localesLabel,
  missingFieldsLabel,
  provinceLabel,
} from '../../../core/utils/product-content-labels';

type ContentListKind = 'hotels' | 'activities' | 'vehicles';

interface ContentListEntry {
  id: string;
  name: string;
  has_content: boolean;
  locales: string[];
  pending_review: boolean;
  catalog_complete: boolean;
  missing_fields: string[];
  enrichment_status: string | null;
  province: string | null;
  category: string | null;
  name_es: string | null;
  brand: string | null;
  seats: number | null;
}

@Component({
  selector: 'app-content-list',
  standalone: true,
  imports: [FormsModule, RouterLink, TableModule, InputTextModule, SelectModule, TooltipModule],
  templateUrl: './content-list.html',
  styleUrl: './content-list.scss',
})
export class ContentList implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly service = inject(ProductContentService);
  private readonly search$ = new Subject<string>();
  private readonly load$ = new Subject<void>();
  private lastKey = '';

  readonly kind = this.route.snapshot.data['kind'] as ContentListKind;
  readonly rows = signal(this.readRows());
  readonly first = signal((this.readPage() - 1) * this.rows());
  readonly query = signal(this.route.snapshot.queryParamMap.get('q') ?? '');
  readonly queryDraft = signal(this.query());
  readonly catalogStatus = signal(this.route.snapshot.queryParamMap.get('catalog') ?? 'all');
  readonly missingField = signal(this.route.snapshot.queryParamMap.get('missing') ?? 'all');
  readonly catalogOptions = [
    { label: 'Todos', value: 'all' },
    { label: 'Datos completos', value: 'complete' },
    { label: 'Datos incompletos', value: 'incomplete' },
  ];
  readonly items = signal<ContentListEntry[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly rowOptions = [20, 50, 100];

  readonly heading = {
    hotels: 'Hoteles',
    activities: 'Actividades',
    vehicles: 'Vehículos',
  }[this.kind];

  readonly searchPlaceholder = {
    hotels: 'Buscar por nombre',
    activities: 'Buscar por nombre',
    vehicles: 'Buscar por nombre',
  }[this.kind];

  constructor() {
    this.search$.pipe(debounceTime(300), takeUntilDestroyed()).subscribe((value) => {
      this.query.set(value.trim());
      this.first.set(0);
      this.schedule();
    });

    this.load$.pipe(
      switchMap(() => {
        this.loading.set(true);
        this.error.set(null);
        return this.fetchPage().pipe(
          catchError((err: unknown) => {
            this.error.set(httpErrorText(err));
            this.items.set([]);
            this.total.set(0);
            return of(null);
          }),
          finalize(() => this.loading.set(false)),
        );
      }),
      takeUntilDestroyed(),
    ).subscribe((page) => {
      if (!page) return;
      this.items.set(page.items);
      this.total.set(page.total);
    });
  }

  ngOnInit(): void {
    this.schedule();
  }

  onQueryChange(value: string): void {
    this.queryDraft.set(value);
    this.search$.next(value);
  }

  onCatalogStatus(value: string): void {
    this.catalogStatus.set(value || 'all');
    if (value === 'complete') this.missingField.set('all');
    this.first.set(0);
    this.lastKey = '';
    this.schedule();
  }

  onMissingField(value: string): void {
    this.missingField.set(value || 'all');
    if (value && value !== 'all') this.catalogStatus.set('incomplete');
    this.first.set(0);
    this.lastKey = '';
    this.schedule();
  }

  missingOptions(): { label: string; value: string }[] {
    const specific = {
      hotels: [
        { label: 'Sin categoría', value: 'category' },
        { label: 'Sin provincia', value: 'province' },
      ],
      activities: [{ label: 'Sin categoría', value: 'category' }],
      vehicles: [{ label: 'Sin categoría', value: 'category' }],
    }[this.kind];
    return [{ label: 'Cualquier dato', value: 'all' }, ...specific];
  }

  onLazy(event: TableLazyLoadEvent): void {
    this.first.set(event.first ?? 0);
    this.rows.set(event.rows ?? 20);
    this.schedule();
  }

  retry(): void {
    this.lastKey = '';
    this.schedule();
  }

  detailLink(id: string): string[] {
    const section = {
      hotels: 'hoteles',
      activities: 'actividades',
      vehicles: 'vehiculos',
    }[this.kind];
    return ['/contenido', section, id];
  }

  province(value: string | null): string {
    return provinceLabel(value);
  }

  category(value: string | null): string {
    const kind = this.kind === 'hotels' ? 'hotel' : this.kind === 'activities' ? 'activity' : 'vehicle';
    return categoryLabel(kind, value);
  }

  status(row: ContentListEntry): string {
    return contentStatusLabel(row.has_content);
  }

  languages(row: ContentListEntry): string {
    return localesLabel(row.locales);
  }

  columnCount(): number {
    if (this.kind === 'hotels') return 7;
    return 8;
  }

  quality(row: ContentListEntry): string {
    return row.catalog_complete ? 'Datos completos' : 'Datos incompletos';
  }

  missingTip(row: ContentListEntry): string {
    return `Falta: ${missingFieldsLabel(row.missing_fields)}`;
  }

  enrichment(row: ContentListEntry): string {
    return enrichmentStatusLabel(row.enrichment_status);
  }

  private schedule(): void {
    const page = Math.floor(this.first() / this.rows()) + 1;
    const key = `${this.kind}|${this.query()}|${this.catalogStatus()}|${this.missingField()}|${page}|${this.rows()}`;
    this.syncUrl(page);
    if (key === this.lastKey) return;
    this.lastKey = key;
    this.load$.next();
  }

  private fetchPage() {
    const page = Math.floor(this.first() / this.rows()) + 1;
    const size = this.rows();
    const q = this.query();
    const catalog = this.catalogStatus();
    const missing = this.missingField();
    if (this.kind === 'hotels') {
      return this.service.listHotels(page, size, q, catalog, missing).pipe(
        map((res) => ({ items: res.items.map((item) => this.hotelEntry(item)), total: res.total })),
      );
    }
    if (this.kind === 'activities') {
      return this.service.listActivities(page, size, q, catalog, missing).pipe(
        map((res) => ({ items: res.items.map((item) => this.activityEntry(item)), total: res.total })),
      );
    }
    return this.service.listVehicles(page, size, q, catalog, missing).pipe(
      map((res) => ({ items: res.items.map((item) => this.vehicleEntry(item)), total: res.total })),
    );
  }

  private hotelEntry(item: HotelContentListItem): ContentListEntry {
    return {
      id: item.id,
      name: item.name,
      has_content: item.has_content,
      locales: item.locales,
      pending_review: item.pending_review,
      catalog_complete: item.catalog_complete,
      missing_fields: item.missing_fields,
      enrichment_status: item.enrichment_status,
      province: item.province,
      category: item.category,
      name_es: null,
      brand: null,
      seats: null,
    };
  }

  private activityEntry(item: ActivityContentListItem): ContentListEntry {
    return {
      id: item.id,
      name: item.name,
      has_content: item.has_content,
      locales: item.locales,
      pending_review: item.pending_review,
      catalog_complete: item.catalog_complete,
      missing_fields: item.missing_fields,
      enrichment_status: item.enrichment_status,
      province: item.province,
      category: item.category,
      name_es: item.name_es,
      brand: null,
      seats: null,
    };
  }

  private vehicleEntry(item: VehicleContentListItem): ContentListEntry {
    return {
      id: item.id,
      name: item.name,
      has_content: item.has_content,
      locales: item.locales,
      pending_review: item.pending_review,
      catalog_complete: item.catalog_complete,
      missing_fields: item.missing_fields,
      enrichment_status: item.enrichment_status,
      province: null,
      category: item.category,
      name_es: null,
      brand: item.brand,
      seats: item.seats,
    };
  }

  private syncUrl(page: number): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      replaceUrl: true,
      queryParams: {
        q: this.query() || null,
        catalog: this.catalogStatus() !== 'all' ? this.catalogStatus() : null,
        missing: this.missingField() !== 'all' ? this.missingField() : null,
        page: page > 1 ? page : null,
        rows: this.rows() !== 20 ? this.rows() : null,
      },
    });
  }

  private readRows(): number {
    const raw = Number(this.route.snapshot.queryParamMap.get('rows'));
    return raw === 50 || raw === 100 ? raw : 20;
  }

  private readPage(): number {
    const raw = Number(this.route.snapshot.queryParamMap.get('page'));
    return Number.isFinite(raw) && raw > 0 ? raw : 1;
  }
}
