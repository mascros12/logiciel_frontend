import { Component, DestroyRef, computed, effect, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import {
  CatalogContactWrite,
} from '../../../core/models/product-content.model';
import { ProductContentService, httpErrorText } from '../../../core/services/product-content.service';
import { ZoneService } from '../../../core/services/zone.service';

interface ContactDraft {
  phone: string;
  email: string;
  zone_id: string | null;
  latitude: string;
  longitude: string;
}

export interface CatalogContactSaved {
  phone: string | null;
  email: string | null;
  zone_id: string | null;
  zone_name: string | null;
  latitude: string | null;
  longitude: string | null;
}

@Component({
  selector: 'app-catalog-contact-form',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonModule, InputTextModule, SelectModule, ToastModule],
  providers: [MessageService],
  templateUrl: './catalog-contact-form.html',
  styleUrls: ['../content-shared.scss'],
})
export class CatalogContactForm {
  private readonly content = inject(ProductContentService);
  private readonly zonesApi = inject(ZoneService);
  private readonly messages = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);

  readonly entityType = input.required<'hotels' | 'activities'>();
  readonly entityId = input.required<string>();
  readonly phone = input<string | null>(null);
  readonly email = input<string | null>(null);
  readonly zoneId = input<string | null>(null);
  readonly zoneName = input<string | null>(null);
  readonly latitude = input<string | null>(null);
  readonly longitude = input<string | null>(null);
  readonly saved = output<CatalogContactSaved>();

  readonly saving = signal(false);
  readonly zones = signal<{ label: string; value: string }[]>([]);

  readonly zoneOptions = computed(() => {
    const options = [...this.zones()];
    const current = this.zoneId();
    if (current && !options.some((option) => option.value === current)) {
      options.unshift({ label: this.zoneName() || 'Zona actual', value: current });
    }
    return options;
  });

  readonly form = this.fb.nonNullable.group({
    phone: '',
    email: '',
    zone_id: this.fb.control<string | null>(null),
    latitude: '',
    longitude: '',
  });

  private baseline: ContactDraft = {
    phone: '',
    email: '',
    zone_id: null,
    latitude: '',
    longitude: '',
  };

  constructor() {
    this.zonesApi.getAll().pipe(takeUntilDestroyed()).subscribe({
      next: (page) => {
        this.zones.set(page.items.map((zone) => ({ label: zone.name, value: zone.id })));
      },
      error: (err: unknown) => {
        this.messages.add({
          severity: 'error',
          summary: 'No se pudieron cargar las zonas',
          detail: httpErrorText(err),
        });
      },
    });

    effect(() => {
      const next: ContactDraft = {
        phone: this.phone() ?? '',
        email: this.email() ?? '',
        zone_id: this.zoneId(),
        latitude: this.latitude() ?? '',
        longitude: this.longitude() ?? '',
      };
      this.form.setValue(next);
      this.baseline = { ...next };
    });
  }

  hasChanges(): boolean {
    return contactWrite(this.baseline, this.form.getRawValue()) !== null;
  }

  save(): void {
    const body = contactWrite(this.baseline, this.form.getRawValue());
    if (!body || this.saving()) return;
    this.saving.set(true);
    this.content.saveCatalogContact(this.entityType(), this.entityId(), body)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (detail) => {
          this.saving.set(false);
          this.saved.emit({
            phone: detail.phone,
            email: detail.email,
            zone_id: detail.zone_id,
            zone_name: detail.zone_name,
            latitude: detail.latitude,
            longitude: detail.longitude,
          });
          this.messages.add({ severity: 'success', summary: 'Datos de contacto guardados' });
        },
        error: (err: unknown) => {
          this.saving.set(false);
          this.messages.add({
            severity: 'error',
            summary: 'No se pudo guardar',
            detail: httpErrorText(err),
          });
        },
      });
  }
}

function contactWrite(before: ContactDraft, after: ContactDraft): CatalogContactWrite | null {
  const body: CatalogContactWrite = {};
  const phone = after.phone.trim();
  if (phone !== before.phone.trim()) body.phone = phone || null;
  const email = after.email.trim();
  if (email !== before.email.trim()) body.email = email || null;
  if ((after.zone_id || null) !== (before.zone_id || null)) body.zone_id = after.zone_id || null;
  const latitude = after.latitude.trim();
  const longitude = after.longitude.trim();
  if (latitude !== before.latitude.trim() || longitude !== before.longitude.trim()) {
    body.latitude = latitude || null;
    body.longitude = longitude || null;
  }
  return Object.keys(body).length > 0 ? body : null;
}
