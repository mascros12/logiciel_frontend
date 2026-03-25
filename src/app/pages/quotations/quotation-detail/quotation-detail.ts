import { Component, OnInit, signal, computed, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { DatePipe, CurrencyPipe, NgClass } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TabsModule } from 'primeng/tabs';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { InputNumberModule } from 'primeng/inputnumber';
import { CheckboxModule } from 'primeng/checkbox';
import { ToastModule } from 'primeng/toast';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { FormsModule } from '@angular/forms';
import { QuotationSummary } from '../../../core/models/quotation.model';
import { DatePickerModule } from 'primeng/datepicker';

import { QuotationService } from '../../../core/services/quotation.service';
import { ProviderService } from '../../../core/services/provider.service';
import {
  QuotationFull, QuotationVersion, QuotationLine,
  AddVehicleRequest, AddRoomRequest, AddActivityRequest
} from '../../../core/models/quotation.model';
import {
  VehicleOption, HotelOption, RoomOption, ActivityOption
} from '../../../core/models/provider.model';
import { RichTextPipe } from '../../../core/pipes/rich-text.pipe';

@Component({
  selector: 'app-quotation-detail',
  standalone: true,
  imports: [
    DatePipe, CurrencyPipe, NgClass, ReactiveFormsModule,
    TabsModule, ButtonModule, TableModule, TagModule,
    DialogModule, SelectModule, InputTextModule, TextareaModule,
    InputNumberModule, CheckboxModule,
    ToastModule, SkeletonModule, TooltipModule, AutoCompleteModule,
    FormsModule, DatePickerModule, RichTextPipe
  ],
  providers: [MessageService],
  templateUrl: './quotation-detail.html',
  styleUrl: './quotation-detail.scss',
})
export class QuotationDetail implements OnInit {
  quotation = signal<QuotationFull | null>(null);
  loading = signal(true);
  summary = signal<QuotationSummary | null>(null);
  loadingSummary = signal(false);

  // Versión seleccionada para ver
  selectedVersionId = signal<string | null>(null);
  selectedVersion = computed(() => {
    const q = this.quotation();
    if (!q) return null;
    const id = this.selectedVersionId();
    if (!id) return q.current_version;
    return q.versions.find(v => String(v.id) === String(id)) ?? q.current_version;
  });

  /** Primera fecha de la agenda (versión seleccionada), formato YYYY-MM-DD */
  firstAgendaDate = computed(() => {
    const ls = this.lines();
    if (!ls.length) return null;
    return [...ls].sort((a, b) => a.date.localeCompare(b.date))[0].date;
  });

  /** dd/MM/yyyy sin problemas de zona horaria */
  firstAgendaDateDisplay(): string {
    const s = this.firstAgendaDate();
    if (!s) return '';
    const [y, m, d] = s.split('-');
    return `${d}/${m}/${y}`;
  }

  // Lines de la versión actual (cargadas del backend)
  lines = signal<QuotationLine[]>([]);

  // Dialogs
  showAddVehicle = signal(false);
  showAddRoom = signal(false);
  showAddActivity = signal(false);
  showNewVersion = signal(false);
  showExtendCalendar = signal(false);
  showShiftItinerary = signal(false);
  showEdit = signal(false);

  // Formularios
  vehicleForm: FormGroup;
  roomForm: FormGroup;
  activityForm: FormGroup;
  versionForm: FormGroup;
  calendarForm: FormGroup;
  shiftItineraryForm: FormGroup;
  editForm: FormGroup;

  // Opciones para autocomplete
  vehicleOptions = signal<VehicleOption[]>([]);
  vehicleSuggestions = signal<VehicleOption[]>([]);
  hotelOptions = signal<HotelOption[]>([]);
  hotelSuggestions = signal<HotelOption[]>([]);
  roomOptions = signal<RoomOption[]>([]);
  activityOptions = signal<ActivityOption[]>([]);
  activitySuggestions = signal<ActivityOption[]>([]);

  // Fecha activa para agregar item
  activeLine = signal<QuotationLine | null>(null);

  // Rango de fechas para agregar en múltiples días
  addingMultipleDays = signal(false);

  saving = signal(false);

  private destroyRef = inject(DestroyRef);

  constructor(
    private route: ActivatedRoute,
    private quotationService: QuotationService,
    private providerService: ProviderService,
    private fb: FormBuilder,
    private messageService: MessageService,
  ) {
    this.vehicleForm = this.fb.group({
      vehicle:    [null, Validators.required],
      start_date: [null, Validators.required],
      end_date:   [null, Validators.required],
    });
    this.roomForm = this.fb.group({
      hotel: [null, Validators.required],
      room: [null, Validators.required],
      additional_adults: [0],
      additional_children: [0],
      start_date: [null, Validators.required],
      end_date: [null, Validators.required],
    });
    this.activityForm = this.fb.group({
      activity: [null, Validators.required],
      adults: [1],
      children: [0],
      free: [0],
      recommendation: [''],
    });
    this.versionForm = this.fb.group({
      notes: [''],
    });
    this.calendarForm = this.fb.group({
      from_date: [null, Validators.required],
      to_date: [null, Validators.required],
    });
    this.shiftItineraryForm = this.fb.group({
      new_first_date: [null, Validators.required],
    });
    this.editForm = this.fb.group({
      name: ['', Validators.required],
      notes: [''],
      from_date: [null],
      to_date: [null],
      arrival_date: [null],
      departure_date: [null],
      arrival_time: [''],
      departure_time: [''],
      flight_number_arrival: [''],
      flight_number_departure: [''],
      commission: [1.20],
      shared: [false],
    });

    // Cargar habitaciones al elegir hotel (más fiable que onChange de p-select en PrimeNG 21)
    this.roomForm
      .get('hotel')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((hotel) => {
        this.roomForm.patchValue({ room: null }, { emitEvent: false });
        if (!hotel?.id) {
          this.roomOptions.set([]);
          return;
        }
        this.providerService.getRoomsByHotel(hotel.id).subscribe({
          next: (rooms) => this.roomOptions.set(rooms ?? []),
          error: () => {
            this.roomOptions.set([]);
            this.messageService.add({
              severity: 'error',
              summary: 'No se pudieron cargar las habitaciones del hotel',
            });
          },
        });
      });
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.load(id);
    this.loadProviders();
  }

  /** Fechas de agenda siempre en orden cronológico (API puede variar el orden). */
  private sortLinesByDate(lines: QuotationLine[]): QuotationLine[] {
    return [...lines].sort((a, b) => a.date.localeCompare(b.date));
  }

  load(id: string) {
    this.loading.set(true);
    const prevVersionId = this.selectedVersionId();
    this.quotationService.getById(id).subscribe({
      next: (q) => {
        this.quotation.set(q);
        const currentId = q.current_version?.id ? String(q.current_version.id) : null;
        const versionStillExists = q.versions?.some(
          (v) => String(v.id) === String(prevVersionId)
        );
        const keepViewingOther =
          prevVersionId && String(prevVersionId) !== currentId && versionStillExists;

        if (keepViewingOther) {
          this.selectedVersionId.set(prevVersionId);
          this.quotationService.getVersionLines(q.id, prevVersionId).subscribe({
            next: (lines) => {
              this.lines.set(this.sortLinesByDate(lines));
              this.loading.set(false);
              this.loadSummary();
            },
            error: () => {
              this.lines.set(this.sortLinesByDate(q.lines ?? []));
              this.selectedVersionId.set(currentId);
              this.loading.set(false);
            },
          });
        } else {
          this.selectedVersionId.set(currentId);
          this.lines.set(this.sortLinesByDate(q.lines ?? []));
          this.loading.set(false);
          this.loadSummary();
        }
      },
      error: () => this.loading.set(false),
    });
  }

  loadProviders() {
    this.providerService.getVehicles().subscribe(r =>
      this.vehicleOptions.set(r.items)
    );
    this.providerService.getHotels().subscribe(r =>
      this.hotelOptions.set(r.items)
    );
    this.providerService.getActivities().subscribe(r =>
      this.activityOptions.set(r.items)
    );
  }

  loadSummary() {
    const q = this.quotation();
    const version = this.selectedVersion();
    if (!q || !version) return;
  
    this.loadingSummary.set(true);
    this.quotationService.getSummary(q.id, version.id).subscribe({
      next: (s) => {
        this.summary.set(s);
        this.loadingSummary.set(false);
      },
      error: () => this.loadingSummary.set(false),
    });
  }

  // ─── Autocomplete ──────────────────────────────────────────

  searchVehicle(event: { query: string }) {
    const q = event.query.toLowerCase();
    this.vehicleSuggestions.set(
      this.vehicleOptions().filter(v =>
        v.name.toLowerCase().includes(q) || v.brand.toLowerCase().includes(q)
      )
    );
  }

  searchHotel(event: { query: string }) {
    const q = event.query.toLowerCase();
    this.hotelSuggestions.set(
      this.hotelOptions().filter(h => h.name.toLowerCase().includes(q))
    );
  }

  searchActivity(event: { query: string }) {
    const q = event.query.toLowerCase();
    this.activitySuggestions.set(
      this.activityOptions().filter(a => a.name.toLowerCase().includes(q))
    );
  }

  ItemLabel(o: any): string {
    return o?.name ?? '';
  }

  // ─── Abrir dialogs ─────────────────────────────────────────

  openAddVehicle(line: QuotationLine) {
    this.activeLine.set(line);
    const lineDate = new Date(line.date + 'T00:00:00');
    this.vehicleForm.reset({
      start_date: lineDate,
      end_date: lineDate,
    });
    this.showAddVehicle.set(true);
  }

  openAddRoom(line: QuotationLine) {
    this.activeLine.set(line);
    const lineDate = new Date(line.date + 'T00:00:00');
    const endDate = new Date(lineDate);
    endDate.setDate(endDate.getDate() + 1); // checkout -> una sola noche por defecto
    this.roomForm.reset({
      additional_adults: 0,
      additional_children: 0,
      start_date: lineDate,
      end_date: endDate,
    });
    this.roomOptions.set([]);
    this.showAddRoom.set(true);
  }

  openAddActivity(line: QuotationLine) {
    this.activeLine.set(line);
    this.activityForm.reset({ adults: 1, children: 0, free: 0 });
    this.showAddActivity.set(true);
  }

  // ─── Guardar items ─────────────────────────────────────────
  vehicleName(v: any): string {
    return v?.name ?? '';
  }
  submitVehicle() {
    if (this.vehicleForm.invalid) return;
    const q = this.quotation()!;
    const version = this.selectedVersion()!;
    const vehicle = this.vehicleForm.value.vehicle;
    const startDate = new Date(this.vehicleForm.value.start_date);
    const endDate = new Date(this.vehicleForm.value.end_date);
  
    if (endDate < startDate) {
      this.messageService.add({ severity: 'warn', summary: 'La fecha fin debe ser mayor o igual a la fecha inicio' });
      return;
    }
  
    // Generar array de fechas del rango
    const dates: string[] = [];
    const current = new Date(startDate);
    while (current <= endDate) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }
  
    this.saving.set(true);
  
    // Crear una request por cada día
    const requests = dates.map(date =>
      this.quotationService.addVehicle(q.id, version.id, {
        vehicle_id: vehicle.id,
        date,
      })
    );
  
    import('rxjs').then(({ forkJoin }) => {
      forkJoin(requests).subscribe({
        next: () => {
          this.showAddVehicle.set(false);
          this.saving.set(false);
          this.messageService.add({ severity: 'success', summary: `Vehículo agregado (${dates.length} días)` });
          this.load(q.id);
        },
        error: (err) => {
          this.saving.set(false);
          this.messageService.add({ severity: 'error', summary: err.error?.detail ?? 'Error al agregar vehículo' });
        }
      });
    });
  }

  submitRoom() {
    if (this.roomForm.invalid) return;
    const q = this.quotation()!;
    const version = this.selectedVersion()!;
    const val = this.roomForm.value;

    this.saving.set(true);

    const startDate = new Date(val.start_date);
    const endDate = new Date(val.end_date);
    if (endDate <= startDate) {
      this.saving.set(false);
      this.messageService.add({
        severity: 'warn',
        summary: 'La fecha fin debe ser mayor que la fecha inicio (crea noches excluyendo la última).',
      });
      return;
    }

    // Noches: [start, end)
    const dates: string[] = [];
    const current = new Date(startDate);
    while (current < endDate) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }

    const requests = dates.map((date) =>
      this.quotationService.addRoom(q.id, version.id, {
        room_id: val.room.id,
        date,
        additional_adults: val.additional_adults,
        additional_children: val.additional_children,
      })
    );

    import('rxjs').then(({ forkJoin }) => {
      forkJoin(requests).subscribe({
        next: () => {
          this.showAddRoom.set(false);
          this.saving.set(false);
          this.messageService.add({
            severity: 'success',
            summary: `Habitación agregada (${dates.length} noches)`,
          });
          this.load(q.id);
        },
        error: (err) => {
          this.saving.set(false);
          this.messageService.add({
            severity: 'error',
            summary: err.error?.detail ?? 'Error al agregar habitación',
          });
        },
      });
    });
  }

  submitActivity() {
    if (this.activityForm.invalid) return;
    const q = this.quotation()!;
    const version = this.selectedVersion()!;
    const line = this.activeLine()!;
    const val = this.activityForm.value;
    const activity: ActivityOption = val.activity;

    this.saving.set(true);
    const body: AddActivityRequest = {
      activity_id: activity.id,
      date: line.date,
      adults: val.adults,
      children: val.children,
      free: val.free,
      recommendation: val.recommendation || undefined,
    };

    this.quotationService.addActivity(q.id, version.id, body).subscribe({
      next: () => {
        this.showAddActivity.set(false);
        this.saving.set(false);
        this.messageService.add({ severity: 'success', summary: 'Actividad agregada' });
        this.load(q.id);
      },
      error: (err) => {
        this.saving.set(false);
        this.messageService.add({
          severity: 'error',
          summary: err.error?.detail ?? 'Error al agregar actividad'
        });
      }
    });
  }

  // ─── Nueva versión ─────────────────────────────────────────

  submitNewVersion() {
    const q = this.quotation()!;
    this.saving.set(true);
    this.quotationService.createVersion(q.id, this.versionForm.value.notes).subscribe({
      next: (v) => {
        this.showNewVersion.set(false);
        this.saving.set(false);
        this.messageService.add({ severity: 'success', summary: `Versión v${v.version_number} creada` });
        // Refresca lista de versiones y, por seguridad, carga las líneas de la versión creada.
        this.selectedVersionId.set(v.id);
        this.load(q.id);
        this.quotationService.getVersionLines(q.id, v.id).subscribe({
          next: (lines) => this.lines.set(this.sortLinesByDate(lines)),
          error: () => void 0,
        });
      },
      error: () => {
        this.saving.set(false);
        this.messageService.add({ severity: 'error', summary: 'Error al crear versión' });
      }
    });
  }

  // ─── Recalcular total ──────────────────────────────────────

  recalculate() {
    const q = this.quotation()!;
    const version = this.selectedVersion()!;
    this.quotationService.recalculate(q.id, version.id).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Total recalculado' });
        this.load(q.id);
      }
    });
  }

  // ─── Helpers ───────────────────────────────────────────────

  getVersionLabel(v: QuotationVersion): string {
    return `v${v.version_number}${v.is_current ? ' (actual)' : ''}`;
  }

  get versionOptions() {
    return this.quotation()?.versions.map(v => ({
      label: this.getVersionLabel(v),
      value: v.id,
    })) ?? [];
  }

  onVersionChange(versionId: any) {
    // PrimeNG puede devolver el objeto completo dependiendo de configuración;
    // normalizamos para quedarnos con el UUID string.
    const normalizedId =
      typeof versionId === 'string'
        ? versionId
        : versionId?.value ?? versionId?.id ?? null;

    this.selectedVersionId.set(normalizedId);
    const q = this.quotation()!;
    if (!normalizedId) return;

    // Comparar como string para evitar diferencias UUID vs string
    const currentId = q.current_version?.id ? String(q.current_version.id) : null;
    if (String(normalizedId) === currentId) {
      this.lines.set(this.sortLinesByDate(q.lines ?? []));
      this.loadSummary();
      return;
    }

    this.quotationService.getVersionLines(q.id, String(normalizedId)).subscribe({
      next: (resp) => {
        const arr = Array.isArray(resp) ? resp : (resp as any)?.lines ?? [];
        this.lines.set(this.sortLinesByDate(arr));
        this.loadSummary();
      },
      error: () =>
        this.messageService.add({
          severity: 'error',
          summary: 'No se pudieron cargar las líneas de esta versión',
        }),
    });
  }

  openEdit() {
    const q = this.quotation();
    if (!q) return;
    this.editForm.patchValue({
      name: q.name,
      notes: q.notes ?? '',
      from_date: q.from_date ? new Date(q.from_date + 'T12:00:00') : null,
      to_date: q.to_date ? new Date(q.to_date + 'T12:00:00') : null,
      arrival_date: q.arrival_date ? new Date(q.arrival_date + 'T12:00:00') : null,
      departure_date: q.departure_date ? new Date(q.departure_date + 'T12:00:00') : null,
      arrival_time: this.formatTime(q.arrival_time) || '',
      departure_time: this.formatTime(q.departure_time) || '',
      flight_number_arrival: q.flight_number_arrival ?? '',
      flight_number_departure: q.flight_number_departure ?? '',
      commission: q.commission ?? 1.20,
      shared: q.shared ?? false,
    });
    this.showEdit.set(true);
  }

  submitEdit() {
    if (this.editForm.invalid) return;
    const q = this.quotation()!;
    const raw = this.editForm.value;
    const body: Record<string, unknown> = {
      name: raw.name,
      notes: raw.notes || null,
      from_date: raw.from_date ? (raw.from_date instanceof Date ? raw.from_date.toISOString().split('T')[0] : raw.from_date) : null,
      to_date: raw.to_date ? (raw.to_date instanceof Date ? raw.to_date.toISOString().split('T')[0] : raw.to_date) : null,
      arrival_date: raw.arrival_date ? (raw.arrival_date instanceof Date ? raw.arrival_date.toISOString().split('T')[0] : raw.arrival_date) : null,
      departure_date: raw.departure_date ? (raw.departure_date instanceof Date ? raw.departure_date.toISOString().split('T')[0] : raw.departure_date) : null,
      arrival_time: raw.arrival_time ? (raw.arrival_time.length === 5 ? raw.arrival_time + ':00' : raw.arrival_time) : null,
      departure_time: raw.departure_time ? (raw.departure_time.length === 5 ? raw.departure_time + ':00' : raw.departure_time) : null,
      flight_number_arrival: raw.flight_number_arrival || null,
      flight_number_departure: raw.flight_number_departure || null,
      commission: raw.commission,
      shared: raw.shared,
    };
    this.saving.set(true);
    this.quotationService.update(q.id, body).subscribe({
      next: () => {
        this.showEdit.set(false);
        this.saving.set(false);
        this.messageService.add({ severity: 'success', summary: 'Cotización actualizada' });
        this.load(q.id);
      },
      error: (err) => {
        this.saving.set(false);
        this.messageService.add({
          severity: 'error',
          summary: err.error?.detail ?? 'Error al guardar',
        });
      },
    });
  }

  openExtendCalendar() {
    const q = this.quotation();
    if (!q) return;
    const from = q.from_date ? new Date(q.from_date + 'T12:00:00') : null;
    const to = q.to_date ? new Date(q.to_date + 'T12:00:00') : null;
    this.calendarForm.reset({ from_date: from, to_date: to });
    this.showExtendCalendar.set(true);
  }

  openShiftItinerary() {
    const first = this.firstAgendaDate();
    if (!first) {
      this.messageService.add({
        severity: 'warn',
        summary: 'No hay días en la agenda',
        detail: 'Añade al menos un día al itinerario antes de desplazar fechas.',
      });
      return;
    }
    this.shiftItineraryForm.reset({
      new_first_date: new Date(first + 'T12:00:00'),
    });
    this.showShiftItinerary.set(true);
  }

  /** YYYY-MM-DD según calendario local (evita desfase con toISOString / UTC). */
  private toLocalIsoDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  submitShiftItinerary() {
    if (this.shiftItineraryForm.invalid) return;
    const q = this.quotation()!;
    const version = this.selectedVersion()!;
    const raw = this.shiftItineraryForm.value.new_first_date;
    const d = raw instanceof Date ? raw : new Date(raw);
    const new_first_date = this.toLocalIsoDate(d);
    this.saving.set(true);
    this.quotationService.shiftItineraryDates(q.id, version.id, { new_first_date }).subscribe({
      next: (res) => {
        this.showShiftItinerary.set(false);
        this.saving.set(false);
        const days = res.delta_days;
        const detail =
          days === 0
            ? 'La fecha elegida coincide con la primera fecha actual.'
            : `Se movieron todos los días ${days > 0 ? '+' : ''}${days} día(s). Se recalculó el total según temporadas actuales.`;
        this.messageService.add({
          severity: 'success',
          summary: 'Fechas del viaje actualizadas',
          detail,
        });
        this.load(q.id);
      },
      error: (err) => {
        this.saving.set(false);
        this.messageService.add({
          severity: 'error',
          summary: err.error?.detail ?? 'Error al desplazar fechas',
        });
      },
    });
  }

  submitExtendCalendar() {
    if (this.calendarForm.invalid) return;
    const q = this.quotation()!;
    const version = this.selectedVersion()!;
    const raw = this.calendarForm.value;
    const fromD = raw.from_date instanceof Date ? raw.from_date : new Date(raw.from_date);
    const toD = raw.to_date instanceof Date ? raw.to_date : new Date(raw.to_date);
    if (toD < fromD) {
      this.messageService.add({
        severity: 'warn',
        summary: 'La fecha fin debe ser mayor o igual a la de inicio',
      });
      return;
    }
    const from_date = fromD.toISOString().split('T')[0];
    const to_date = toD.toISOString().split('T')[0];
    this.saving.set(true);
    this.quotationService.syncCalendar(q.id, version.id, { from_date, to_date }).subscribe({
      next: () => {
        this.showExtendCalendar.set(false);
        this.saving.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Itinerario actualizado',
          detail: 'Se añadieron los días faltantes en esta versión.',
        });
        this.load(q.id);
      },
      error: (err) => {
        this.saving.set(false);
        this.messageService.add({
          severity: 'error',
          summary: err.error?.detail ?? 'Error al ampliar fechas',
        });
      },
    });
  }

  generateFileAA() {
    const q = this.quotation()!;
    this.quotationService.generateFileAA(q.id).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Ficha AA generada' });
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error al generar Ficha AA' });
      }
    });
  }

  formatTime(t: string | null): string {
    if (!t) return '';
    return t.substring(0, 5);
  }

  deleteVehicle(id: string) {
    const q = this.quotation()!;
    this.quotationService.deleteVehicle(id).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Vehículo eliminado' });
        this.load(q.id);
      },
      error: () => this.messageService.add({ severity: 'error', summary: 'Error al eliminar' }),
    });
  }
  
  deleteRoom(id: string) {
    const q = this.quotation()!;
    this.quotationService.deleteRoom(id).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Habitación eliminada' });
        this.load(q.id);
      },
      error: () => this.messageService.add({ severity: 'error', summary: 'Error al eliminar' }),
    });
  }
  
  deleteActivity(id: string) {
    const q = this.quotation()!;
    this.quotationService.deleteActivity(id).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Actividad eliminada' });
        this.load(q.id);
      },
      error: () => this.messageService.add({ severity: 'error', summary: 'Error al eliminar' }),
    });
  }

  /**
   * v1: temporadas = leyenda superior; chips neutros salvo precio 0 (amarillo).
   * v2+: rojo = eliminado; amarillo = precio neto 0; azul = heredado (is_original=false);
   * verde = nuevo en esta versión (is_original=true).
   */
  getChipClass(item: {
    is_original: boolean;
    deleted: boolean;
    net_price?: number | string;
  }): string {
    if (item.deleted) return 'chip-deleted';
    const net = Number(item.net_price ?? 0);
    if (!Number.isFinite(net) || net === 0) return 'chip-warning';

    const vn = this.selectedVersion()?.version_number ?? 1;
    if (vn < 2) return 'chip-v1-neutral';

    if (item.is_original) return 'chip-new';
    return 'chip-inherited';
  }
}