import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { TableModule } from 'primeng/table';
import { SkeletonModule } from 'primeng/skeleton';
import { RichTextPipe } from '../../../core/pipes/rich-text.pipe';
import { ProductContentService, httpErrorText } from '../../../core/services/product-content.service';
import { HotelContentDetail } from '../../../core/models/product-content.model';
import {
  capacityLabel,
  categoryLabel,
  contentStatusLabel,
  coordinateText,
  localesLabel,
  provinceLabel,
} from '../../../core/utils/product-content-labels';
import { ContentEditor } from '../content-editor/content-editor';

@Component({
  selector: 'app-hotel-content-page',
  standalone: true,
  imports: [RouterLink, TableModule, SkeletonModule, RichTextPipe, ContentEditor],
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
}
