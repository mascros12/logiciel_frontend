import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { SkeletonModule } from 'primeng/skeleton';
import { RichTextPipe } from '../../../core/pipes/rich-text.pipe';
import { ProductContentService, httpErrorText } from '../../../core/services/product-content.service';
import {
  ActivityContentDetail,
  VehicleContentDetail,
} from '../../../core/models/product-content.model';
import {
  categoryLabel,
  coordinateText,
  provinceLabel,
} from '../../../core/utils/product-content-labels';
import { ContentEditor } from '../content-editor/content-editor';

type CatalogKind = 'activities' | 'vehicles';

@Component({
  selector: 'app-catalog-content-page',
  standalone: true,
  imports: [RouterLink, SkeletonModule, RichTextPipe, ContentEditor],
  templateUrl: './catalog-content-page.html',
  styleUrls: ['../content-shared.scss'],
})
export class CatalogContentPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(ProductContentService);
  private readonly destroyRef = inject(DestroyRef);

  readonly kind = this.route.snapshot.data['kind'] as CatalogKind;
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly activity = signal<ActivityContentDetail | null>(null);
  readonly vehicle = signal<VehicleContentDetail | null>(null);

  readonly listLink = this.kind === 'activities' ? '/contenido/actividades' : '/contenido/vehiculos';
  readonly listLabel = this.kind === 'activities' ? 'Volver a actividades' : 'Volver a vehículos';

  ngOnInit(): void {
    if (this.kind === 'activities') {
      this.route.paramMap.pipe(
        switchMap((params) => this.loadActivity(params.get('id'))),
        takeUntilDestroyed(this.destroyRef),
      ).subscribe((detail) => {
        this.activity.set(detail);
        this.loading.set(false);
      });
      return;
    }
    this.route.paramMap.pipe(
      switchMap((params) => this.loadVehicle(params.get('id'))),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe((detail) => {
      this.vehicle.set(detail);
      this.loading.set(false);
    });
  }

  private loadActivity(id: string | null) {
    this.loading.set(true);
    this.error.set(null);
    this.activity.set(null);
    if (!id) {
      this.error.set('Actividad no encontrada');
      return of<ActivityContentDetail | null>(null);
    }
    return this.service.getActivity(id).pipe(
      catchError((err: unknown) => {
        this.error.set(httpErrorText(err));
        return of<ActivityContentDetail | null>(null);
      }),
    );
  }

  private loadVehicle(id: string | null) {
    this.loading.set(true);
    this.error.set(null);
    this.vehicle.set(null);
    if (!id) {
      this.error.set('Vehículo no encontrado');
      return of<VehicleContentDetail | null>(null);
    }
    return this.service.getVehicle(id).pipe(
      catchError((err: unknown) => {
        this.error.set(httpErrorText(err));
        return of<VehicleContentDetail | null>(null);
      }),
    );
  }

  province(value: string | null): string {
    return provinceLabel(value);
  }

  category(kind: 'activity' | 'vehicle', value: string | null): string {
    return categoryLabel(kind, value);
  }

  coordinates(latitude: string | null, longitude: string | null): string | null {
    return coordinateText(latitude, longitude);
  }
}
