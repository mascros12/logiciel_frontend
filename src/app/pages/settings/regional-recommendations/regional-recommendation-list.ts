import { Component, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import {
  RecommendationCategory,
  RegionalRecommendation,
  RegionalRecommendationOptions,
} from '../../../core/models/regional-recommendation.model';
import { RegionalRecommendationService } from '../../../core/services/regional-recommendation.service';

@Component({
  selector: 'app-regional-recommendation-list',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    FormsModule,
    TableModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    TextareaModule,
    SelectModule,
    ToggleSwitchModule,
    ToastModule,
  ],
  providers: [MessageService],
  templateUrl: './regional-recommendation-list.html',
  styleUrl: './regional-recommendation-list.scss',
})
export class RegionalRecommendationListPage implements OnInit {
  readonly rows = signal<RegionalRecommendation[]>([]);
  readonly options = signal<RegionalRecommendationOptions | null>(null);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly showDialog = signal(false);
  readonly editing = signal<RegionalRecommendation | null>(null);
  search = '';
  activeFilter: 'all' | 'yes' | 'no' = 'all';
  categoryFilter: '' | RecommendationCategory = '';
  zoneFilter = '';
  form: FormGroup;

  readonly categories = [
    { label: 'Actividad', value: 'activity' },
    { label: 'Restaurante', value: 'restaurant' },
  ];

  constructor(
    private fb: FormBuilder,
    private api: RegionalRecommendationService,
    private messages: MessageService,
  ) {
    this.form = this.fb.group({
      category: ['activity' as RecommendationCategory, Validators.required],
      zone_id: [null as string | null, Validators.required],
      activity_id: [null as string | null],
      name: ['', Validators.required],
      opening_hours: ['', Validators.required],
      phone: ['', Validators.required],
      latitude: [''],
      longitude: [''],
      url: [''],
      active: [true],
      activity_type: [''],
      duration_text: [''],
      difficulty_text: [''],
      description: [''],
    });
  }

  ngOnInit(): void {
    this.api.options().subscribe({
      next: (options) => this.options.set(options),
      error: () => this.messages.add({ severity: 'error', summary: 'No se pudieron cargar las zonas' }),
    });
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.api.list({
      active: this.activeFilter === 'all' ? null : this.activeFilter === 'yes',
      category: this.categoryFilter || null,
      zoneId: this.zoneFilter || null,
      q: this.search.trim(),
    }).subscribe({
      next: (res) => {
        this.rows.set(res.items);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.messages.add({ severity: 'error', summary: 'No se pudieron cargar las recomendaciones' });
      },
    });
  }

  openCreate(): void {
    this.editing.set(null);
    this.form.reset({
      category: 'activity',
      zone_id: null,
      activity_id: null,
      name: '',
      opening_hours: '',
      phone: '',
      latitude: '',
      longitude: '',
      url: '',
      active: true,
      activity_type: '',
      duration_text: '',
      difficulty_text: '',
      description: '',
    });
    this.showDialog.set(true);
  }

  openEdit(row: RegionalRecommendation): void {
    this.editing.set(row);
    this.form.reset({
      category: row.category,
      zone_id: row.zone_id,
      activity_id: row.activity_id,
      name: row.name,
      opening_hours: row.opening_hours,
      phone: row.phone,
      latitude: row.latitude ?? '',
      longitude: row.longitude ?? '',
      url: row.url ?? '',
      active: row.active,
      activity_type: row.activity_type ?? '',
      duration_text: row.duration_text ?? '',
      difficulty_text: row.difficulty_text ?? '',
      description: row.description ?? '',
    });
    this.showDialog.set(true);
  }

  copyActivity(): void {
    const activityId = this.form.value.activity_id as string | null;
    if (!activityId) return;
    this.api.defaults(activityId).subscribe({
      next: (row) => {
        this.form.patchValue({
          name: row.name,
          zone_id: row.zone_id ?? this.form.value.zone_id,
          phone: row.phone ?? this.form.value.phone,
          latitude: row.latitude ?? '',
          longitude: row.longitude ?? '',
          activity_type: row.activity_type ?? '',
        });
      },
      error: () => this.messages.add({
        severity: 'error',
        summary: 'No se pudieron copiar los datos públicos',
      }),
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    const restaurant = raw.category === 'restaurant';
    const latitude = String(raw.latitude ?? '').trim();
    const longitude = String(raw.longitude ?? '').trim();
    const body = {
      category: raw.category,
      zone_id: raw.zone_id,
      activity_id: restaurant ? null : raw.activity_id || null,
      clear_activity: restaurant || !raw.activity_id,
      name: String(raw.name).trim(),
      opening_hours: String(raw.opening_hours).trim(),
      phone: String(raw.phone).trim(),
      latitude: latitude || null,
      longitude: longitude || null,
      clear_coordinates: !latitude && !longitude,
      url: String(raw.url ?? '').trim(),
      active: raw.active !== false,
      activity_type: restaurant ? null : String(raw.activity_type ?? '').trim() || null,
      duration_text: restaurant ? null : String(raw.duration_text ?? '').trim() || null,
      difficulty_text: restaurant ? null : String(raw.difficulty_text ?? '').trim() || null,
      description: restaurant ? null : String(raw.description ?? '').trim() || null,
    };
    this.saving.set(true);
    const current = this.editing();
    const { clear_activity, clear_coordinates, ...created } = body;
    const request = current
      ? this.api.update(current.id, body)
      : this.api.create(created);
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.showDialog.set(false);
        this.messages.add({ severity: 'success', summary: 'Recomendación guardada' });
        this.load();
      },
      error: (error: { error?: { detail?: string } }) => {
        this.saving.set(false);
        const detail = error.error?.detail;
        this.messages.add({
          severity: 'error',
          summary: 'No se pudo guardar',
          detail: typeof detail === 'string' ? detail : 'Revise los datos.',
        });
      },
    });
  }

  deactivate(row: RegionalRecommendation): void {
    this.api.update(row.id, { active: false }).subscribe({
      next: () => {
        this.messages.add({ severity: 'success', summary: 'Recomendación desactivada' });
        this.load();
      },
      error: () => this.messages.add({ severity: 'error', summary: 'No se pudo desactivar' }),
    });
  }

  zoneOptions() {
    return (this.options()?.zones ?? []).map((zone) => ({ label: zone.name, value: zone.id }));
  }

  activityOptions() {
    return (this.options()?.activities ?? []).map((item) => ({
      label: item.name,
      value: item.id,
    }));
  }
}
