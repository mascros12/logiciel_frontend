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
  PlaceKind,
  RouteMode,
  RouteOptionPlace,
  TravelRoute,
  TravelRouteOptions,
} from '../../../core/models/travel-route.model';
import { TravelRouteService } from '../../../core/services/travel-route.service';
import { formatDuration } from '../../../core/utils/carnet-document';

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
      distance_km: [null as number | null, [Validators.required, Validators.min(0)]],
      duration_minutes: [0, [Validators.required, Validators.min(0)]],
      instructions: [''],
      origin_zone_id: [null as string | null, Validators.required],
      destination_zone_id: [null as string | null, Validators.required],
      origin_kind: [null as PlaceKind | null],
      origin_id: [null as string | null],
      destination_kind: [null as PlaceKind | null],
      destination_id: [null as string | null],
    });
    this.form.controls['mode'].valueChanges.subscribe((mode: RouteMode) => {
      this.applyMeasures(mode);
    });
  }

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
    this.form.reset({
      mode: 'zone_to_zone',
      active: true,
      distance_km: null,
      duration_minutes: 0,
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
    this.form.reset({
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

  private applyMeasures(mode: RouteMode): void {
    const distance = this.form.controls['distance_km'];
    const duration = this.form.controls['duration_minutes'];
    if (mode === 'place_to_place') {
      distance.setValidators([Validators.min(0)]);
      duration.clearValidators();
      duration.setValue(null, { emitEvent: false });
    } else {
      distance.setValidators([Validators.required, Validators.min(0)]);
      duration.setValidators([Validators.required, Validators.min(0)]);
      if (distance.value == null || distance.value === '') {
        distance.setValue(0, { emitEvent: false });
      }
      if (duration.value == null) {
        duration.setValue(0, { emitEvent: false });
      }
    }
    distance.updateValueAndValidity({ emitEvent: false });
    duration.updateValueAndValidity({ emitEvent: false });
  }

  save(): void {
    if (this.form.invalid || this.saving()) return;
    const value = this.form.getRawValue();
    if (value.mode === 'place_to_place' && (!value.origin_id || !value.destination_id)) {
      this.messages.add({ severity: 'warn', summary: 'Elija el origen y el destino' });
      return;
    }
    const place = value.mode === 'place_to_place';
    const rawDistance = value.distance_km;
    const distance =
      rawDistance === '' || rawDistance == null ? null : Number(rawDistance);
    const body = {
      ...value,
      distance_km: place ? distance : Number(rawDistance),
      duration_minutes: place ? null : Number(value.duration_minutes),
      origin_kind: value.mode === 'zone_to_zone' ? null : value.origin_kind,
      origin_id: value.mode === 'zone_to_zone' ? null : value.origin_id,
      destination_kind: value.mode === 'zone_to_zone' ? null : value.destination_kind,
      destination_id: value.mode === 'zone_to_zone' ? null : value.destination_id,
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
