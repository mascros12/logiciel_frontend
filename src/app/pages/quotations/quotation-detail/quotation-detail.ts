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
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService, MenuItem } from 'primeng/api';
import { MenuModule } from 'primeng/menu';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { FormsModule } from '@angular/forms';
import { QuotationSummary } from '../../../core/models/quotation.model';
import { DatePickerModule } from 'primeng/datepicker';

import { QuotationService } from '../../../core/services/quotation.service';
import { ProviderService } from '../../../core/services/provider.service';
import {
  QuotationFull, QuotationVersion, QuotationLine,
  AddVehicleRequest, AddRoomRequest, AddActivityRequest,
  FichaFamilyMemberRow, FichaRoomRequirementRow, FileAAGenerateRequest,
  FichaAdultCategory, FichaMemberRole, FichaRoomType,
  FileAAWithDetails, FileAADetailRow, FileAADetailPatch,
} from '../../../core/models/quotation.model';
import {
  VehicleOption, HotelOption, RoomOption, ActivityOption
} from '../../../core/models/provider.model';
import { RichTextPipe } from '../../../core/pipes/rich-text.pipe';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-quotation-detail',
  standalone: true,
  imports: [
    DatePipe, CurrencyPipe, NgClass, ReactiveFormsModule,
    TabsModule, ButtonModule, TableModule, TagModule,
    DialogModule, SelectModule, InputTextModule, TextareaModule,
    InputNumberModule, CheckboxModule,
    ToastModule, SkeletonModule, TooltipModule, ConfirmDialogModule, AutoCompleteModule,
    FormsModule, DatePickerModule, RichTextPipe, DragDropModule, MenuModule,
  ],
  providers: [MessageService, ConfirmationService],
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
  /** Reordenar días (mismas fechas) e insertar días vacíos entre líneas */
  showOrganizeItinerary = signal(false);
  organizeDraftLines = signal<QuotationLine[]>([]);
  insertStartCount = signal(1);
  /** Días a insertar después de cada línea (solo afecta al botón de esa fila). */
  insertAfterByLineId = signal<Record<string, number>>({});
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
  downloadingFichaWord = signal(false);
  downloadingFichaPdf = signal(false);

  /** Borrador Ficha AA: composición familiar y habitaciones (también se guarda en la cotización). */
  fichaFamilyRows = signal<FichaFamilyMemberRow[]>([]);
  fichaRoomRows = signal<FichaRoomRequirementRow[]>([]);

  /** Última Ficha AA generada con tabla de servicios (se recarga al abrir la cotización). */
  fichaFileAA = signal<FileAAWithDetails | null>(null);

  fichaTotals = computed(() => {
    const f = this.fichaFileAA();
    if (!f?.details?.length) return { system: 0, provider: 0 };
    let system = 0;
    let provider = 0;
    for (const d of f.details) {
      system += Number(d.total_price) || 0;
      provider += Number(d.provider_price ?? 0) || 0;
    }
    return { system, provider };
  });

  readonly fichaRoleOptions = [
    { label: 'Niño/a', value: 'child' as FichaMemberRole },
    { label: 'Adulto/a', value: 'adult' as FichaMemberRole },
  ];

  readonly fichaAdultCategoryOptions = [
    { label: 'Adulto joven', value: 'young' as FichaAdultCategory },
    { label: 'Adulto', value: 'regular' as FichaAdultCategory },
    { label: 'Adulto mayor', value: 'senior' as FichaAdultCategory },
  ];

  readonly fichaRoomTypeOptions = [
    { label: 'Doble', value: 'double' as FichaRoomType },
    { label: 'Triple', value: 'triple' as FichaRoomType },
    { label: 'Cuádruple', value: 'quadruple' as FichaRoomType },
    { label: 'Quíntuple', value: 'quintuple' as FichaRoomType },
    { label: 'Mixta', value: 'mixed' as FichaRoomType },
  ];

  /** Menú popup "Itinerario" (se reconstruye al abrir para disabled reactivos). */
  itineraryMenuItems: MenuItem[] = [];

  private destroyRef = inject(DestroyRef);

  constructor(
    private route: ActivatedRoute,
    private quotationService: QuotationService,
    private providerService: ProviderService,
    private fb: FormBuilder,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
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

  /** En versión 1 no se muestran ítems marcados como eliminados; en v2+ sí (con estilo). */
  private agendaVersionNumber(): number {
    return this.selectedVersion()?.version_number ?? 1;
  }

  visibleRooms(line: QuotationLine) {
    if (this.agendaVersionNumber() > 1) return line.rooms;
    return line.rooms.filter((r) => !r.deleted);
  }

  visibleActivities(line: QuotationLine) {
    if (this.agendaVersionNumber() > 1) return line.activities;
    return line.activities.filter((a) => !a.deleted);
  }

  visibleVehicles(line: QuotationLine) {
    if (this.agendaVersionNumber() > 1) return line.vehicles;
    return line.vehicles.filter((v) => !v.deleted);
  }

  getInsertAfterCount(lineId: string): number {
    const rec = this.insertAfterByLineId();
    const n = rec[lineId];
    return n != null && n >= 1 ? Math.min(60, n) : 1;
  }

  setInsertAfterCount(lineId: string, value: number | null | undefined): void {
    const v = Math.min(60, Math.max(1, Math.floor(Number(value) || 1)));
    this.insertAfterByLineId.update((rec) => ({ ...rec, [lineId]: v }));
  }

  load(id: string) {
    this.loading.set(true);
    const prevVersionId = this.selectedVersionId();
    this.quotationService.getById(id).subscribe({
      next: (q) => {
        this.quotation.set(q);
        this.initFichaFromQuotation(q);
        this.loadLatestFileAA(q.id);
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

  openItineraryMenu(event: Event, menu: { toggle: (e: Event) => void }): void {
    this.itineraryMenuItems = this.buildItineraryMenuItems();
    menu.toggle(event);
  }

  private buildItineraryMenuItems(): MenuItem[] {
    return [
      {
        label: 'Ampliar fechas',
        icon: 'pi pi-calendar-plus',
        command: () => this.openExtendCalendar(),
      },
      {
        label: 'Cambiar inicio del viaje',
        icon: 'pi pi-sync',
        disabled: !this.firstAgendaDate(),
        command: () => this.openShiftItinerary(),
      },
      {
        label: 'Organizar itinerario',
        icon: 'pi pi-bars',
        disabled: !this.lines().length,
        command: () => this.openOrganizeItinerary(),
      },
      { separator: true },
      {
        label: 'Recalcular total',
        icon: 'pi pi-refresh',
        command: () => this.recalculate(),
      },
    ];
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

  openOrganizeItinerary() {
    const ls = this.lines();
    if (!ls.length) {
      this.messageService.add({
        severity: 'warn',
        summary: 'No hay días en la agenda',
        detail: 'Amplía el itinerario o sincroniza el calendario antes de organizar.',
      });
      return;
    }
    this.organizeDraftLines.set([...ls]);
    this.insertStartCount.set(1);
    this.insertAfterByLineId.set({});
    this.showOrganizeItinerary.set(true);
  }

  dropOrganizeLine(event: CdkDragDrop<QuotationLine[]>) {
    const arr = [...this.organizeDraftLines()];
    moveItemInArray(arr, event.previousIndex, event.currentIndex);
    this.organizeDraftLines.set(arr);
  }

  lineDateDisplay(iso: string): string {
    const [y, m, d] = iso.split('-');
    return y && m && d ? `${d}/${m}/${y}` : iso;
  }

  lineSummary(line: QuotationLine): string {
    const v = this.visibleVehicles(line).length;
    const r = this.visibleRooms(line).length;
    const a = this.visibleActivities(line).length;
    const parts: string[] = [];
    if (v) parts.push(`${v} veh.`);
    if (r) parts.push(`${r} hab.`);
    if (a) parts.push(`${a} act.`);
    return parts.length ? parts.join(' · ') : 'Sin servicios';
  }

  /** Texto plano para tooltip y confirmaciones (nombres pueden venir con HTML del backend). */
  private stripHtml(html: string): string {
    if (!html) return '';
    return html
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /** Detalle legible de habitaciones, actividades y vehículos del día (versión visible en agenda). */
  lineDetailTooltip(line: QuotationLine): string {
    const parts: string[] = [];
    const rooms = this.visibleRooms(line);
    if (rooms.length) {
      const bits = rooms.map((r) => {
        let s = this.stripHtml(r.name);
        if (r.additional_adults > 0) s += ` +${r.additional_adults} adulto(s)`;
        if (r.additional_children > 0) s += ` +${r.additional_children} niño(s)`;
        return s;
      });
      parts.push(`Hoteles: ${bits.join('; ')}`);
    }
    const acts = this.visibleActivities(line);
    if (acts.length) {
      parts.push(
        `Actividades: ${acts
          .map((a) => {
            let s = `${this.stripHtml(a.name)} (${a.adults}A ${a.children}N)`;
            const rec = (a.recommendation || '').trim();
            if (rec) s += ` — ${this.stripHtml(rec)}`;
            return s;
          })
          .join('; ')}`
      );
    }
    const vehs = this.visibleVehicles(line);
    if (vehs.length) {
      parts.push(`Vehículos: ${vehs.map((v) => this.stripHtml(v.name)).join('; ')}`);
    }
    return parts.length ? parts.join(' · ') : 'Sin servicios en este día';
  }

  confirmRemoveOrganizeDay(line: QuotationLine): void {
    if (this.organizeDraftLines().length <= 1) {
      this.messageService.add({
        severity: 'warn',
        summary: 'No se puede quitar',
        detail: 'Debe quedar al menos un día en la agenda.',
      });
      return;
    }
    const dateStr = this.lineDateDisplay(line.date);
    const detail = this.lineDetailTooltip(line);
    const hasServices = detail !== 'Sin servicios en este día';
    const msg = hasServices
      ? `Se eliminará el día ${dateStr} y los servicios asociados (${detail}). El resto de fechas se compactará sin huecos.`
      : `¿Eliminar el día vacío ${dateStr}? El resto de fechas se compactará.`;
    this.confirmationService.confirm({
      header: 'Quitar día del itinerario',
      message: msg,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Quitar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.executeRemoveOrganizeDay(line.id),
    });
  }

  private executeRemoveOrganizeDay(lineId: string): void {
    const q = this.quotation()!;
    const version = this.selectedVersion()!;
    this.saving.set(true);
    this.quotationService.removeVersionLines(q.id, version.id, { line_ids: [lineId] }).subscribe({
      next: (res) => {
        this.saving.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Día eliminado',
          detail: `Se quitó ${res.removed} día(s). Fechas compactadas y total recalculado.`,
        });
        this.insertAfterByLineId.update((rec) => {
          const next = { ...rec };
          delete next[lineId];
          return next;
        });
        this.quotationService.getVersionLines(q.id, version.id).subscribe({
          next: (lines) => {
            const s = this.sortLinesByDate(lines);
            this.lines.set(s);
            if (this.showOrganizeItinerary()) {
              this.organizeDraftLines.set([...s]);
            }
          },
        });
        this.load(q.id);
      },
      error: (err) => {
        this.saving.set(false);
        this.messageService.add({
          severity: 'error',
          summary: err.error?.detail ?? 'Error al quitar el día',
        });
      },
    });
  }

  submitOrganizeOrder() {
    const q = this.quotation()!;
    const version = this.selectedVersion()!;
    const ids = this.organizeDraftLines().map((l) => l.id);
    this.saving.set(true);
    this.quotationService.reorderVersionLines(q.id, version.id, { line_ids_in_order: ids }).subscribe({
      next: () => {
        this.showOrganizeItinerary.set(false);
        this.saving.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Orden de días actualizado',
          detail: 'Las fechas calendario se mantienen; el contenido sigue el nuevo orden. Total recalculado.',
        });
        this.load(q.id);
      },
      error: (err) => {
        this.saving.set(false);
        this.messageService.add({
          severity: 'error',
          summary: err.error?.detail ?? 'Error al reordenar',
        });
      },
    });
  }

  submitInsertDaysAtStart() {
    const q = this.quotation()!;
    const version = this.selectedVersion()!;
    const count = Math.min(60, Math.max(1, Math.floor(Number(this.insertStartCount()) || 1)));
    this.saving.set(true);
    this.quotationService
      .insertLineDays(q.id, version.id, { after_line_id: null, count })
      .subscribe({
        next: (res) => {
          this.saving.set(false);
          this.messageService.add({
            severity: 'success',
            summary: 'Días insertados al inicio',
            detail: `Se añadieron ${res.inserted} día(s) vacío(s).`,
          });
          this.quotationService.getVersionLines(q.id, version.id).subscribe({
            next: (lines) => {
              const s = this.sortLinesByDate(lines);
              this.lines.set(s);
              if (this.showOrganizeItinerary()) {
                this.organizeDraftLines.set([...s]);
              }
            },
          });
          this.load(q.id);
        },
        error: (err) => {
          this.saving.set(false);
          this.messageService.add({
            severity: 'error',
            summary: err.error?.detail ?? 'Error al insertar días',
          });
        },
      });
  }

  submitInsertDaysAfterLine(lineId: string) {
    const q = this.quotation()!;
    const version = this.selectedVersion()!;
    const count = this.getInsertAfterCount(lineId);
    this.saving.set(true);
    this.quotationService
      .insertLineDays(q.id, version.id, { after_line_id: lineId, count })
      .subscribe({
        next: (res) => {
          this.saving.set(false);
          this.messageService.add({
            severity: 'success',
            summary: 'Días insertados',
            detail: `Se añadieron ${res.inserted} día(s) vacío(s) después de la línea elegida.`,
          });
          this.quotationService.getVersionLines(q.id, version.id).subscribe({
            next: (lines) => {
              const s = this.sortLinesByDate(lines);
              this.lines.set(s);
              if (this.showOrganizeItinerary()) {
                this.organizeDraftLines.set([...s]);
              }
            },
          });
          this.load(q.id);
        },
        error: (err) => {
          this.saving.set(false);
          this.messageService.add({
            severity: 'error',
            summary: err.error?.detail ?? 'Error al insertar días',
          });
        },
      });
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

  initFichaFromQuotation(q: QuotationFull): void {
    const fm = q.ficha_family_members;
    if (Array.isArray(fm) && fm.length > 0) {
      this.fichaFamilyRows.set(fm.map((raw) => this.normalizeFichaMember(raw)));
    } else {
      this.fichaFamilyRows.set([{ role: 'adult', adult_category: 'regular' }]);
    }
    const fr = q.ficha_room_requirements;
    if (Array.isArray(fr) && fr.length > 0) {
      this.fichaRoomRows.set(fr.map((raw) => this.normalizeFichaRoom(raw)));
    } else {
      this.fichaRoomRows.set([{ room_type: 'double', quantity: 1 }]);
    }
  }

  private asRecord(raw: unknown): Record<string, unknown> {
    if (raw !== null && typeof raw === 'object' && !Array.isArray(raw)) {
      return raw as Record<string, unknown>;
    }
    return {};
  }

  private normalizeFichaMember(raw: unknown): FichaFamilyMemberRow {
    const o = this.asRecord(raw);
    const role: FichaMemberRole = o['role'] === 'child' ? 'child' : 'adult';
    if (role === 'child') {
      const age = Math.min(17, Math.max(0, Math.floor(Number(o['age']) || 0)));
      return { role: 'child', age, adult_category: null };
    }
    const ac = String(o['adult_category'] || 'regular');
    const cat = (['young', 'regular', 'senior'].includes(ac) ? ac : 'regular') as FichaAdultCategory;
    return { role: 'adult', adult_category: cat, age: null };
  }

  private normalizeFichaRoom(raw: unknown): FichaRoomRequirementRow {
    const o = this.asRecord(raw);
    const rt = String(o['room_type'] || 'double') as FichaRoomType;
    const qty = Math.min(50, Math.max(1, Math.floor(Number(o['quantity']) || 1)));
    const allowed: FichaRoomType[] = ['double', 'triple', 'quadruple', 'quintuple', 'mixed'];
    return {
      room_type: allowed.includes(rt) ? rt : 'double',
      quantity: qty,
    };
  }

  formatIsoDateEs(iso: string): string {
    const [y, m, d] = iso.split('-');
    return y && m && d ? `${d}/${m}/${y}` : iso;
  }

  tripNightsCount(q: QuotationFull): number | null {
    if (!q.from_date || !q.to_date) return null;
    const a = new Date(q.from_date + 'T12:00:00').getTime();
    const b = new Date(q.to_date + 'T12:00:00').getTime();
    return Math.max(0, Math.round((b - a) / 86400000));
  }

  fichaHeaderDatesLine(q: QuotationFull): string {
    if (!q.from_date || !q.to_date) {
      return 'Defina fecha de inicio y fin del viaje en «Editar».';
    }
    const n = this.tripNightsCount(q);
    const nights =
      n === null ? '' : ` (${n} ${n === 1 ? 'noche' : 'noches'})`;
    return `${this.formatIsoDateEs(q.from_date)} — ${this.formatIsoDateEs(q.to_date)}${nights}`;
  }

  /** Resumen de habitaciones para el encabezado tipo ficha (usa filas actuales del borrador). */
  fichaRoomsSummaryLine(): string {
    const rows = this.fichaRoomRows();
    if (!rows.length) return '';
    const acc = new Map<FichaRoomType, number>();
    for (const r of rows) {
      acc.set(r.room_type, (acc.get(r.room_type) ?? 0) + (r.quantity ?? 0));
    }
    const parts: string[] = [];
    for (const opt of this.fichaRoomTypeOptions) {
      const n = acc.get(opt.value);
      if (n) parts.push(`${n}× ${opt.label.toLowerCase()}`);
    }
    return parts.join(', ');
  }

  fichaNightsFromIsoRange(fromD: string | null, toD: string | null): number | null {
    if (!fromD || !toD) return null;
    const a = new Date(fromD + 'T12:00:00').getTime();
    const b = new Date(toD + 'T12:00:00').getTime();
    return Math.max(0, Math.round((b - a) / 86400000));
  }

  fichaGeneratedDatesLine(ficha: FileAAWithDetails): string {
    if (!ficha.from_date || !ficha.to_date) {
      return 'Sin rango de fechas en la ficha.';
    }
    const n = this.fichaNightsFromIsoRange(ficha.from_date, ficha.to_date);
    const nights =
      n === null ? '' : ` · ${n} ${n === 1 ? 'noche' : 'noches'}`;
    return `Del ${this.formatIsoDateEs(ficha.from_date)} al ${this.formatIsoDateEs(ficha.to_date)}${nights}`;
  }

  fichaCategoryLabel(cat: string): string {
    switch (cat) {
      case 'vehicle':
        return 'Transporte';
      case 'room':
        return 'Hotel';
      case 'activity':
        return 'Actividad';
      default:
        return cat;
    }
  }

  private loadLatestFileAA(quotationId: string): void {
    this.quotationService.getLatestFileAA(quotationId).subscribe({
      next: (f) => this.fichaFileAA.set(f),
      error: (err) => {
        if (err.status === 404) this.fichaFileAA.set(null);
      },
    });
  }

  patchFileDetail(detailId: string, patch: FileAADetailPatch): void {
    const cur = this.fichaFileAA();
    if (!cur) return;
    this.quotationService.patchFileAADetail(detailId, patch).subscribe({
      next: (updated) => {
        const f = this.fichaFileAA();
        if (!f) return;
        const details = f.details.map((d) => (d.id === detailId ? { ...d, ...updated } : d));
        this.fichaFileAA.set({ ...f, details });
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: typeof err.error?.detail === 'string' ? err.error.detail : 'No se pudo guardar el cambio',
        });
      },
    });
  }

  onFichaDetailDatesBlur(row: FileAADetailRow, target: EventTarget | null): void {
    const v = target instanceof HTMLInputElement ? target.value : '';
    this.patchFileDetail(row.id, { dates: v });
  }

  onFichaDetailReservationNoBlur(row: FileAADetailRow, target: EventTarget | null): void {
    const t = target instanceof HTMLInputElement ? target.value.trim() : '';
    this.patchFileDetail(row.id, { reservation_number: t || null });
  }

  onFichaDetailTotalBlur(row: FileAADetailRow, target: EventTarget | null): void {
    const raw = target instanceof HTMLInputElement ? target.value : '';
    const v = parseFloat(String(raw).replace(',', '.'));
    if (!Number.isFinite(v)) return;
    this.patchFileDetail(row.id, { total_price: v });
  }

  onFichaDetailProviderBlur(row: FileAADetailRow, target: EventTarget | null): void {
    const raw = target instanceof HTMLInputElement ? target.value.trim() : '';
    if (!raw) {
      this.patchFileDetail(row.id, { provider_price: null });
      return;
    }
    const v = parseFloat(raw.replace(',', '.'));
    if (!Number.isFinite(v)) return;
    this.patchFileDetail(row.id, { provider_price: v });
  }

  fichaDetailPriceDisplay(v: number | string | null | undefined): string {
    if (v === null || v === undefined || v === '') return '';
    return String(v);
  }

  fichaFlightArrivalOk(q: QuotationFull): boolean {
    return !!(
      q.arrival_time &&
      String(q.flight_number_arrival || '').trim().length > 0
    );
  }

  fichaFlightDepartureOk(q: QuotationFull): boolean {
    return !!(
      q.departure_time &&
      String(q.flight_number_departure || '').trim().length > 0
    );
  }

  addFichaFamilyRow(): void {
    this.fichaFamilyRows.update((rows) => [...rows, { role: 'adult', adult_category: 'regular' }]);
  }

  removeFichaFamilyRow(index: number): void {
    this.fichaFamilyRows.update((rows) => {
      if (rows.length <= 1) return rows;
      return rows.filter((_, i) => i !== index);
    });
  }

  patchFichaMember(index: number, patch: Partial<FichaFamilyMemberRow>): void {
    this.fichaFamilyRows.update((rows) =>
      rows.map((row, i) => {
        if (i !== index) return row;
        const merged = { ...row, ...patch };
        if (merged.role === 'child') {
          return {
            role: 'child' as const,
            age: merged.age ?? row.age ?? 8,
            adult_category: null,
          };
        }
        return {
          role: 'adult' as const,
          age: null,
          adult_category: merged.adult_category ?? row.adult_category ?? 'regular',
        };
      })
    );
  }

  addFichaRoomRow(): void {
    this.fichaRoomRows.update((rows) => [...rows, { room_type: 'double', quantity: 1 }]);
  }

  removeFichaRoomRow(index: number): void {
    this.fichaRoomRows.update((rows) => {
      if (rows.length <= 1) return rows;
      return rows.filter((_, i) => i !== index);
    });
  }

  patchFichaRoom(index: number, patch: Partial<FichaRoomRequirementRow>): void {
    this.fichaRoomRows.update((rows) =>
      rows.map((row, i) => (i === index ? { ...row, ...patch } : row))
    );
  }

  buildFileAABody(): FileAAGenerateRequest {
    const ver = this.selectedVersion();
    const q = this.quotation();
    const versionId = ver?.id ?? q?.current_version?.id;
    return {
      ...(versionId ? { version_id: versionId } : {}),
      family_members: this.fichaFamilyRows().map((m) =>
        m.role === 'child'
          ? { role: 'child' as const, age: m.age ?? 0, adult_category: null }
          : {
              role: 'adult' as const,
              age: null,
              adult_category: (m.adult_category ?? 'regular') as FichaAdultCategory,
            }
      ),
      room_requirements: this.fichaRoomRows().map((r) => ({
        room_type: r.room_type,
        quantity: Math.min(50, Math.max(1, Math.floor(Number(r.quantity) || 1))),
      })),
    };
  }

  validateFichaClient(q: QuotationFull): string[] {
    const errs: string[] = [];
    if (!this.fichaFlightArrivalOk(q)) {
      errs.push('Hora y vuelo de llegada obligatorios (edite la cotización).');
    }
    if (!this.fichaFlightDepartureOk(q)) {
      errs.push('Hora y vuelo de salida obligatorios (edite la cotización).');
    }
    if (!q.from_date || !q.to_date) {
      errs.push('Fechas de viaje obligatorias en la cotización.');
    }
    const ls = this.lines();
    const hasService = ls.some(
      (line) =>
        (line.vehicles?.length ?? 0) +
          (line.rooms?.length ?? 0) +
          (line.activities?.length ?? 0) >
        0
    );
    if (!hasService) {
      errs.push(
        'La agenda (versión que está viendo) no tiene hoteles, actividades ni vehículos. Añada servicios en el itinerario o cambie de versión.'
      );
    }
    const members = this.fichaFamilyRows();
    if (!members.length) {
      errs.push('Añada al menos una persona en la composición familiar.');
    }
    for (const m of members) {
      if (m.role === 'child') {
        const a = m.age;
        if (a === undefined || a === null || a < 0 || a > 17) {
          errs.push('Cada niño/a debe tener edad entre 0 y 17.');
          break;
        }
      } else if (!m.adult_category) {
        errs.push('Cada adulto debe tener categoría (joven, adulto o mayor).');
        break;
      }
    }
    const rooms = this.fichaRoomRows();
    if (!rooms.length) {
      errs.push('Indique al menos un tipo de habitación.');
    }
    for (const r of rooms) {
      if (!r.quantity || r.quantity < 1) {
        errs.push('La cantidad de habitaciones debe ser al menos 1 en cada fila.');
        break;
      }
    }
    return errs;
  }

  saveFichaDraft(): void {
    const q = this.quotation()!;
    const body = this.buildFileAABody();
    this.saving.set(true);
    this.quotationService
      .update(q.id, {
        ficha_family_members: body.family_members,
        ficha_room_requirements: body.room_requirements,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.messageService.add({
            severity: 'success',
            summary: 'Borrador guardado',
            detail: 'Composición y habitaciones guardadas en la cotización.',
          });
          this.load(q.id);
        },
        error: (err) => {
          this.saving.set(false);
          this.messageService.add({
            severity: 'error',
            summary: err.error?.detail ?? 'No se pudo guardar el borrador',
          });
        },
      });
  }

  downloadFichaAAWord(): void {
    const f = this.fichaFileAA();
    if (!f?.id) return;
    this.downloadingFichaWord.set(true);
    this.quotationService.downloadFichaAAWord(f.id).subscribe({
      next: (blob) => {
        this.downloadingFichaWord.set(false);
        if (blob.type === 'application/json' || blob.size < 32) {
          blob.text().then((t) => {
            try {
              const j = JSON.parse(t) as { detail?: string };
              this.messageService.add({
                severity: 'error',
                summary: typeof j.detail === 'string' ? j.detail : 'Error al generar Word',
              });
            } catch {
              this.messageService.add({ severity: 'error', summary: 'Error al generar Word' });
            }
          });
          return;
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Ficha_AA.docx';
        a.click();
        URL.revokeObjectURL(url);
        this.messageService.add({
          severity: 'success',
          summary: 'Documento descargado',
          detail: 'Revise la carpeta de descargas.',
        });
      },
      error: () => {
        this.downloadingFichaWord.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'No se pudo descargar el Word',
        });
      },
    });
  }

  downloadFichaAAPdf(): void {
    const f = this.fichaFileAA();
    if (!f?.id) return;
    this.downloadingFichaPdf.set(true);
    this.quotationService.downloadFichaAAPdf(f.id).subscribe({
      next: (blob) => {
        this.downloadingFichaPdf.set(false);
        if (blob.type === 'application/json' || blob.size < 32) {
          blob.text().then((t) => {
            try {
              const j = JSON.parse(t) as { detail?: string };
              this.messageService.add({
                severity: 'error',
                summary: typeof j.detail === 'string' ? j.detail : 'Error al generar PDF',
              });
            } catch {
              this.messageService.add({ severity: 'error', summary: 'Error al generar PDF' });
            }
          });
          return;
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Ficha_AA.pdf';
        a.click();
        URL.revokeObjectURL(url);
        this.messageService.add({
          severity: 'success',
          summary: 'PDF descargado',
          detail: 'Revise la carpeta de descargas.',
        });
      },
      error: () => {
        this.downloadingFichaPdf.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'No se pudo descargar el PDF',
        });
      },
    });
  }

  generateFileAA(): void {
    const q = this.quotation()!;
    const errs = this.validateFichaClient(q);
    if (errs.length) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Complete los datos de la Ficha AA',
        detail: errs.join(' '),
      });
      return;
    }
    const body = this.buildFileAABody();
    this.saving.set(true);
    this.quotationService.generateFileAA(q.id, body).subscribe({
      next: (ficha) => {
        this.saving.set(false);
        this.fichaFileAA.set(ficha);
        this.messageService.add({
          severity: 'success',
          summary: 'Ficha AA generada',
          detail: 'Tabla de servicios lista. Puede marcar confirmado, reservado y precios.',
        });
        this.load(q.id);
      },
      error: (err) => {
        this.saving.set(false);
        const d = err.error?.detail;
        const msg = Array.isArray(d) ? d.map((x: { msg?: string }) => x.msg).join(' ') : d;
        this.messageService.add({
          severity: 'error',
          summary: typeof msg === 'string' ? msg : 'Error al generar Ficha AA',
        });
      },
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