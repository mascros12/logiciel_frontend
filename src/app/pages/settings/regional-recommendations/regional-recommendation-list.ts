import { Component, OnDestroy, OnInit, computed, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { MultiSelectModule } from 'primeng/multiselect';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import {
  RecommendationCategory,
  RecommendationOptionActivity,
  RegionalRecommendation,
  RegionalRecommendationOptions,
} from '../../../core/models/regional-recommendation.model';
import { RegionalRecommendationService } from '../../../core/services/regional-recommendation.service';
import { FieldErrorComponent } from '../../../shared/components/field-error/field-error.component';
import { coordinatePairValidator } from '../../../core/utils/coordinate.util';
import {
  apiErrorSummary,
  validateForm,
  warnInvalidForm,
} from '../../../core/utils/form-validation.util';

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
    MultiSelectModule,
    ToggleSwitchModule,
    ToastModule,
    FieldErrorComponent,
  ],
  providers: [MessageService],
  templateUrl: './regional-recommendation-list.html',
  styleUrl: './regional-recommendation-list.scss',
})
export class RegionalRecommendationListPage implements OnInit, OnDestroy {
  readonly rows = signal<RegionalRecommendation[]>([]);
  readonly imagePreview = signal<string | null>(null);
  private pendingImage: File | null = null;
  private imageObjectUrl: string | null = null;
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
    private route: ActivatedRoute,
    private router: Router,
  ) {
    this.form = this.fb.group({
      category: ['activity' as RecommendationCategory],
      zone_id: [null as string | null],
      activity_ids: [[] as string[]],
      name: ['', [requiredText, Validators.maxLength(200), plainText(200)]],
      opening_hours: ['', plainText(8000)],
      phone: ['', [Validators.maxLength(40), plainText(40)]],
      latitude: ['', freeCoordinate(-90, 90, 'Latitud')],
      longitude: ['', freeCoordinate(-180, 180, 'Longitud')],
      url: ['', httpUrl],
      active: [true],
      activity_type: ['', [Validators.maxLength(120), plainText(120)]],
      duration_text: ['', [Validators.maxLength(120), plainText(120)]],
      difficulty_text: ['', [Validators.maxLength(120), plainText(120)]],
      description: ['', plainText(8000)],
    }, { validators: coordinatePairValidator });
  }

  ngOnInit(): void {
    this.api.options().subscribe({
      next: (options) => this.options.set(options),
      error: () => this.messages.add({
        severity: 'error',
        summary: 'No se pudieron cargar las zonas ni las actividades',
      }),
    });
    this.load();
    const editId = this.route.snapshot.queryParamMap.get('editar');
    if (editId) this.openLinked(editId);
  }

  openLinked(id: string): void {
    this.api.get(id).subscribe({
      next: (row) => {
        this.openEdit(row);
        const draft = history.state?.carnetFields as Record<string, string> | undefined;
        if (draft) {
          const filled = Object.fromEntries(
            Object.entries(draft).filter(([, value]) => String(value ?? '').trim() !== ''),
          );
          this.form.patchValue(filled);
        }
        void this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { editar: null },
          queryParamsHandling: 'merge',
          replaceUrl: true,
        });
      },
      error: () => this.messages.add({
        severity: 'error',
        summary: 'No se encontró la recomendación en el catálogo',
      }),
    });
  }

  load(): void {
    this.loading.set(true);
    this.api.listAll({
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

  ngOnDestroy(): void {
    this.releaseImage();
  }

  openCreate(): void {
    this.editing.set(null);
    this.pendingImage = null;
    this.releaseImage();
    this.form.reset({
      category: 'activity',
      zone_id: null,
      activity_ids: [],
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
    this.pendingImage = null;
    this.releaseImage();
    if (row.image_id) this.loadImage(row.id);
    this.form.reset({
      category: row.category,
      zone_id: row.zone_id,
      activity_ids: row.activity_ids?.length
        ? row.activity_ids
        : row.activity_id
          ? [row.activity_id]
          : [],
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
    const activityId = (this.form.value.activity_ids as string[] | null)?.[0] ?? null;
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
    const messages = validateForm(this.form, {
      name: 'Nombre',
      description: 'Descripción',
      opening_hours: 'Horario',
      phone: 'Teléfono',
      latitude: 'Latitud',
      longitude: 'Longitud',
      url: 'Enlace',
      activity_type: 'Tipo',
      duration_text: 'Duración',
      difficulty_text: 'Dificultad',
    });
    if (this.form.hasError('coordinatePair')) {
      messages.push('Indique latitud y longitud, o deje ambas vacías.');
    }
    if (messages.length) {
      warnInvalidForm(this.messages, messages);
      return;
    }
    const raw = this.form.getRawValue();
    const restaurant = raw.category === 'restaurant';
    const activityIds = restaurant
      ? []
      : ((raw.activity_ids as string[] | null) ?? []).filter((id) => !!id);
    const latitude = String(raw.latitude ?? '').trim().replace(',', '.');
    const longitude = String(raw.longitude ?? '').trim().replace(',', '.');
    const name = String(raw.name ?? '').trim();
    const description = String(raw.description ?? '').trim() || null;
    const body = {
      category: raw.category || 'activity',
      zone_id: raw.zone_id || null,
      activity_id: activityIds[0] ?? null,
      activity_ids: activityIds,
      clear_activity: restaurant || activityIds.length === 0,
      name,
      opening_hours: String(raw.opening_hours ?? '').trim(),
      phone: String(raw.phone ?? '').trim(),
      latitude: latitude || null,
      longitude: longitude || null,
      clear_coordinates: !latitude && !longitude,
      url: String(raw.url ?? '').trim(),
      active: raw.active !== false,
      activity_type: restaurant ? null : String(raw.activity_type ?? '').trim() || null,
      duration_text: restaurant ? null : String(raw.duration_text ?? '').trim() || null,
      difficulty_text: restaurant ? null : String(raw.difficulty_text ?? '').trim() || null,
      description,
    };
    this.saving.set(true);
    const current = this.editing();
    const { clear_activity, clear_coordinates, ...created } = body;
    const request = current
      ? this.api.update(current.id, body)
      : this.api.create(created);
    request.subscribe({
      next: (saved) => {
        const file = this.pendingImage;
        const finish = () => {
          this.saving.set(false);
          this.pendingImage = null;
          this.showDialog.set(false);
          this.messages.add({ severity: 'success', summary: 'Recomendación guardada' });
          this.load();
        };
        if (!file) {
          finish();
          return;
        }
        this.api.uploadImage(saved.id, file).subscribe({
          next: () => finish(),
          error: (error: { error?: { detail?: unknown } }) => {
            this.saving.set(false);
            this.messages.add({
              severity: 'error',
              summary: 'La recomendación se guardó, pero la imagen no',
              detail: apiErrorSummary(error, 'Revise el archivo.'),
            });
            this.load();
          },
        });
      },
      error: (error: { error?: { detail?: unknown } }) => {
        this.saving.set(false);
        this.messages.add({
          severity: 'error',
          summary: 'No se pudo guardar',
          detail: apiErrorSummary(error, 'Revise los datos.'),
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

  readonly activityChoices = computed(() =>
    (this.options()?.activities ?? []).map((item) => {
      const label = activityChoiceLabel(item);
      return { label, search: foldSearch(label), value: item.id };
    }),
  );

  onImage(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    input.value = '';
    this.pendingImage = file;
    this.releaseImage();
    if (!file) return;
    this.imageObjectUrl = URL.createObjectURL(file);
    this.imagePreview.set(this.imageObjectUrl);
  }

  clearImage(): void {
    const current = this.editing();
    this.pendingImage = null;
    this.releaseImage();
    if (!current?.image_id) return;
    this.api.clearImage(current.id).subscribe({
      next: (row) => {
        this.editing.set(row);
        this.load();
      },
      error: () => this.messages.add({
        severity: 'error',
        summary: 'No se pudo quitar la imagen',
      }),
    });
  }

  private loadImage(id: string): void {
    this.api.image(id).subscribe({
      next: (blob) => {
        this.releaseImage();
        this.imageObjectUrl = URL.createObjectURL(blob);
        this.imagePreview.set(this.imageObjectUrl);
      },
    });
  }

  private releaseImage(): void {
    if (this.imageObjectUrl) URL.revokeObjectURL(this.imageObjectUrl);
    this.imageObjectUrl = null;
    this.imagePreview.set(null);
  }
}

function requiredText(control: AbstractControl): ValidationErrors | null {
  return String(control.value ?? '').trim() ? null : { required: true };
}

function plainText(max: number) {
  return (control: AbstractControl): ValidationErrors | null => {
    const text = String(control.value ?? '');
    if (/<\s*\/?\s*[a-zA-Z][^>]*>/.test(text)) {
      return { message: 'No se admite HTML.' };
    }
    if (text.length > max) {
      return { maxlength: { requiredLength: max, actualLength: text.length } };
    }
    return null;
  };
}

function freeCoordinate(min: number, max: number, label: string) {
  return (control: AbstractControl): ValidationErrors | null => {
    const text = String(control.value ?? '').trim().replace(',', '.');
    if (!text) return null;
    if (!/^-?\d+(\.\d+)?$/.test(text)) return { message: `${label} no es un número.` };
    const value = Number(text);
    if (value < min) return { min: { min } };
    if (value > max) return { max: { max } };
    return null;
  };
}

function httpUrl(control: AbstractControl): ValidationErrors | null {
  const text = String(control.value ?? '').trim();
  if (!text) return null;
  if (text.length > 2000) {
    return { maxlength: { requiredLength: 2000, actualLength: text.length } };
  }
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return { message: 'El enlace debe usar http o https.' };
  }
  const scheme = url.protocol === 'http:' || url.protocol === 'https:';
  if (!scheme || !url.hostname) return { message: 'El enlace debe usar http o https.' };
  return null;
}

function foldSearch(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase();
}

function activityChoiceLabel(item: RecommendationOptionActivity): string {
  const parts = [item.catalog_name, item.name_es, item.file_aa_name, item.name]
    .map((value) => (value ?? '').trim())
    .filter((value, index, all) => value !== '' && all.indexOf(value) === index);
  return parts.join(' · ');
}
