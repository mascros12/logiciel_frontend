import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { TableModule } from 'primeng/table';
import { SkeletonModule } from 'primeng/skeleton';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { FormsModule } from '@angular/forms';
import { RichTextPipe } from '../../../core/pipes/rich-text.pipe';
import { ProductContentService, httpErrorText } from '../../../core/services/product-content.service';
import { HotelContentDetail } from '../../../core/models/product-content.model';
import {
  capacityLabel,
  categoryLabel,
  contentStatusLabel,
  coordinateText,
  localesLabel,
  missingFieldsLabel,
  provinceLabel,
  visibleEnrichmentStatus,
} from '../../../core/utils/product-content-labels';
import { ContentEditor } from '../content-editor/content-editor';
import { ContentEnrichAction } from '../content-enrich-action/content-enrich-action';
import { RoomContentSummary } from '../../../core/models/product-content.model';

@Component({
  selector: 'app-hotel-content-page',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    TableModule,
    SkeletonModule,
    SelectModule,
    TooltipModule,
    RichTextPipe,
    ContentEditor,
    ContentEnrichAction,
  ],
  templateUrl: './hotel-content-page.html',
  styleUrls: ['../content-shared.scss'],
})
export class HotelContentPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(ProductContentService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly hotel = signal<HotelContentDetail | null>(null);
  readonly roomFilter = signal('all');
  readonly roomFilters = [
    { label: 'Todas', value: 'all' },
    { label: 'Datos incompletos', value: 'incomplete' },
    { label: 'Sin capacidad', value: 'capacity_type' },
    { label: 'Sin clase', value: 'room_class' },
  ];

  ngOnInit(): void {
    this.route.paramMap.pipe(
      switchMap((params) => {
        const id = params.get('id');
        this.loading.set(true);
        this.error.set(null);
        this.hotel.set(null);
        if (!id) {
          this.error.set('Hotel no encontrado');
          return of<HotelContentDetail | null>(null);
        }
        return this.service.getHotel(id).pipe(
          catchError((err: unknown) => {
            this.error.set(httpErrorText(err));
            return of<HotelContentDetail | null>(null);
          }),
        );
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe((hotel) => {
      this.hotel.set(hotel);
      this.loading.set(false);
    });
  }

  province(value: string | null): string {
    return provinceLabel(value);
  }

  category(value: string | null): string {
    return categoryLabel('hotel', value);
  }

  coordinates(hotel: HotelContentDetail): string | null {
    return coordinateText(hotel.latitude, hotel.longitude);
  }

  capacity(value: HotelContentDetail['rooms'][number]['capacity_type']): string {
    return capacityLabel(value);
  }

  status(hasContent: boolean): string {
    return contentStatusLabel(hasContent);
  }

  languages(locales: string[]): string {
    return localesLabel(locales);
  }

  enrichmentStatus(item: HotelContentDetail): string | null {
    return visibleEnrichmentStatus(item);
  }

  missingTip(fields: string[]): string {
    return `Falta: ${missingFieldsLabel(fields)}`;
  }

  visibleRooms(rooms: RoomContentSummary[]): RoomContentSummary[] {
    const filter = this.roomFilter();
    if (filter === 'all') return rooms;
    if (filter === 'incomplete') return rooms.filter((room) => !room.catalog_complete);
    return rooms.filter((room) => room.missing_fields.includes(filter));
  }

  refresh(): void {
    const current = this.hotel();
    if (!current) return;
    this.service.getHotel(current.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe((fresh) => {
      if (!fresh) return;
      this.hotel.set({ ...current, ...fresh, content: current.content });
    });
  }
}
