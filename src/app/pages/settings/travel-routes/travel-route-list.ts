import { Component, OnInit, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
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
  PlaceKind,
  RouteMode,
  RouteOptionPlace,
  TravelRoute,
  TravelRouteOptions,
} from '../../../core/models/travel-route.model';
import { TravelRouteService } from '../../../core/services/travel-route.service';
import { formatDuration } from '../../../core/utils/carnet-document';

function requiredText(control: AbstractControl): ValidationErrors | null {
  const value = typeof control.value === 'string' ? control.value.trim() : '';
  return value ? null : { required: true };
}

@Component({
  selector: 'app-travel-route-list',
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
  templateUrl: './travel-route-list.html',
  styleUrl: './travel-route-list.scss',
})
export class TravelRouteListPage implements OnInit {
  readonly routes = signal<TravelRoute[]>([]);
  readonly options = signal<TravelRouteOptions | null>(null);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly showDialog = signal(false);
  readonly editing = signal<TravelRoute | null>(null);
  search = '';
  activeFilter: 'all' | 'yes' | 'no' = 'all';
  modeFilter: '' | RouteMode = '';
  form: FormGroup;

  readonly modes = [
    { label: 'Entre zonas', value: 'zone_to_zone' },
    { label: 'Entre establecimientos', value: 'place_to_place' },
  ];
  readonly kinds = [
    { label: 'Hotel', value: 'hotel' },
    { label: 'Actividad', value: 'activity' },
    { label: 'Sucursal', value: 'provider_branch' },
  ];

  constructor(
    private fb: FormBuilder,
    private routesApi: TravelRouteService,
    private messages: MessageService,
  ) {
    this.form = this.fb.group({
      mode: ['zone_to_zone' as RouteMode, Validators.required],
      active: [true],
      distance_km: [null as number | null],
      duration_minutes: [null as number | null],
      instructions: [''],
      origin_zone_id: [null as string | null],
      destination_zone_id: [null as string | null],
      origin_kind: [null as PlaceKind | null],
      origin_id: [null as string | null],
      destination_kind: [null as PlaceKind | null],
      destination_id: [null as string | null],
    });
    this.form.controls['mode'].valueChanges.subscribe((mode: RouteMode) => {
      if (this.filling) return;
      if (mode === 'zone_to_zone') {
        this.form.patchValue({
          origin_kind: null,
          origin_id: null,
          destination_kind: null,
          destination_id: null,
          instructions: '',
        }, { emitEvent: false });
      } else {
        this.form.patchValue({
          origin_zone_id: null,
          destination_zone_id: null,
        }, { emitEvent: false });
      }
      this.syncValidators();
    });
    for (const side of ['origin', 'destination'] as const) {
      this.form.controls[`${side}_kind`].valueChanges.subscribe(() => {
        if (this.filling) return;
        this.form.patchValue({
          [`${side}_id`]: null,
          [`${side}_zone_id`]: null,
        }, { emitEvent: false });
        this.syncValidators();
      });
    }
    this.syncValidators();
  }

  private filling = false;

  ngOnInit(): void {
    this.routesApi.options().subscribe({
      next: (options) => this.options.set(options),
      error: () => this.messages.add({ severity: 'error', summary: 'No se pudieron cargar zonas y establecimientos' }),
    });
    this.load();
  }

  load(): void {
    this.loading.set(true);
    const active = this.activeFilter === 'all' ? null : this.activeFilter === 'yes';
    this.routesApi.list(active, this.modeFilter || null, this.search).subscribe({
      next: (res) => {
        this.routes.set(res.items);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.messages.add({ severity: 'error', summary: 'No se pudieron cargar los trayectos' });
      },
    });
  }

  openCreate(): void {
    this.editing.set(null);
    this.fill({
      mode: 'zone_to_zone',
      active: true,
      distance_km: null,
      duration_minutes: null,
      instructions: '',
      origin_zone_id: null,
      destination_zone_id: null,
      origin_kind: null,
      origin_id: null,
      destination_kind: null,
      destination_id: null,
    });
    this.showDialog.set(true);
  }

  openEdit(row: TravelRoute): void {
    this.editing.set(row);
    this.fill({
      mode: row.mode,
      active: row.active,
      distance_km:
        row.distance_km == null || row.distance_km === ''
          ? null
          : Number(row.distance_km),
      duration_minutes: row.duration_minutes,
      instructions: row.instructions,
      origin_zone_id: row.origin_zone_id,
      destination_zone_id: row.destination_zone_id,
      origin_kind: row.origin_kind,
      origin_id: row.origin_id,
      destination_kind: row.destination_kind,
      destination_id: row.destination_id,
    });
    this.showDialog.set(true);
  }

  places(kind: PlaceKind | null): RouteOptionPlace[] {
    const options = this.options();
    if (!options || !kind) return [];
    if (kind === 'hotel') return options.hotels;
    if (kind === 'activity') return options.activities;
    return options.branches;
  }

  onPlace(side: 'origin' | 'destination'): void {
    const kind = this.form.value[`${side}_kind`] as PlaceKind | null;
    const id = this.form.value[`${side}_id`] as string | null;
    const place = this.places(kind).find((item) => item.id === id);
    this.form.patchValue({ [`${side}_zone_id`]: place?.zone_id ?? null });
  }

  previewDuration(): string {
    return formatDuration(Number(this.form.value.duration_minutes ?? 0));
  }

  showPlaces(): boolean {
    return this.form.value.mode === 'place_to_place';
  }

  showDistance(): boolean {
    return this.form.value.mode === 'zone_to_zone' || this.lodgingPair();
  }

  showDuration(): boolean {
    return this.form.value.mode === 'zone_to_zone' || this.activityLeg();
  }

  private lodgingPair(): boolean {
    return this.isLodging(this.form.value.origin_kind)
      && this.isLodging(this.form.value.destination_kind);
  }

  private activityLeg(): boolean {
    return this.form.value.origin_kind === 'activity'
      || this.form.value.destination_kind === 'activity';
  }

  private isLodging(kind: PlaceKind | null): boolean {
    return kind === 'hotel' || kind === 'provider_branch';
  }

  private fill(value: object): void {
    this.filling = true;
    this.form.reset(value);
    this.syncValidators();
    this.filling = false;
  }

  private syncValidators(): void {
    const place = this.showPlaces();
    const distance = this.showDistance();
    const duration = this.showDuration();
    this.setRules('distance_km', distance, [Validators.min(0)]);
    this.setRules('duration_minutes', duration, [Validators.min(0)]);
    this.setRules('instructions', false, place ? [requiredText] : []);
    this.setRules('origin_zone_id', !place, []);
    this.setRules('destination_zone_id', !place, []);
    this.setRules('origin_kind', place, []);
    this.setRules('origin_id', place, []);
    this.setRules('destination_kind', place, []);
    this.setRules('destination_id', place, []);
    if (!distance) {
      this.form.controls['distance_km'].setValue(null, { emitEvent: false });
    }
    if (!duration) {
      this.form.controls['duration_minutes'].setValue(null, { emitEvent: false });
    }
    if (!place) {
      this.form.controls['instructions'].setValue('', { emitEvent: false });
    }
  }

  private setRules(name: string, required: boolean, extra: ValidatorFn[]): void {
    const control = this.form.controls[name];
    control.setValidators(required ? [Validators.required, ...extra] : extra);
    control.updateValueAndValidity({ emitEvent: false });
  }

  save(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      if (this.form.invalid) {
        this.messages.add({ severity: 'warn', summary: 'Complete los campos obligatorios' });
      }
      return;
    }
    const value = this.form.getRawValue();
    const place = value.mode === 'place_to_place';
    if (place && (!value.origin_zone_id || !value.destination_zone_id)) {
      this.messages.add({
        severity: 'warn',
        summary: 'El establecimiento elegido no tiene zona',
      });
      return;
    }
    const rawDistance = value.distance_km;
    const body = {
      ...value,
      distance_km: this.showDistance() ? Number(rawDistance) : null,
      duration_minutes: this.showDuration() ? Number(value.duration_minutes) : null,
      instructions: place ? String(value.instructions ?? '').trim() : '',
      origin_kind: place ? value.origin_kind : null,
      origin_id: place ? value.origin_id : null,
      destination_kind: place ? value.destination_kind : null,
      destination_id: place ? value.destination_id : null,
    };
    this.saving.set(true);
    const current = this.editing();
    const request = current
      ? this.routesApi.update(current.id, body)
      : this.routesApi.create(body);
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.showDialog.set(false);
        this.messages.add({ severity: 'success', summary: current ? 'Trayecto actualizado' : 'Trayecto creado' });
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        const detail = err?.error?.detail;
        this.messages.add({
          severity: 'error',
          summary: typeof detail === 'string' ? detail : 'No se pudo guardar el trayecto',
        });
      },
    });
  }

  deactivate(row: TravelRoute): void {
    this.routesApi.update(row.id, { active: !row.active }).subscribe({
      next: () => this.load(),
      error: () => this.messages.add({ severity: 'error', summary: 'No se pudo cambiar el estado' }),
    });
  }

  endpoint(row: TravelRoute, side: 'origin' | 'destination'): string {
    const zone = side === 'origin' ? row.origin_zone_name : row.destination_zone_name;
    const place = side === 'origin' ? row.origin_name : row.destination_name;
    return place ? `${zone} · ${place}` : zone;
  }
}
