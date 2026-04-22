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
import { AuthService } from '../../../core/auth/auth.service';
import {
  QuotationFull, QuotationVersion, QuotationLine,
  AddVehicleRequest, AddRoomRequest, AddActivityRequest,
  FichaFamilyMemberRow, FichaRoomRequirementRow, FileAAGenerateRequest,
  FichaMemberRole, FichaRoomType,
  FileAAWithDetails,
  FileAADetailRow,
  FileAADetailPatch,
  FileAADetailVehicleObsState,
  FileAADetailActivityObsState,
  FileAADetailRoomObsState,
  FileAADetailCreateBody,
} from '../../../core/models/quotation.model';
import {
  VehicleOption, HotelOption, RoomOption, ActivityOption
} from '../../../core/models/provider.model';
import { RichTextPipe } from '../../../core/pipes/rich-text.pipe';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';

/** Entrada del desplegable Ficha AA: catálogo maestro hotel / actividad / vehículo. */
interface FichaAddSourcePickItem {
  key: string;
  listLabel: string;
  roomId?: string;
  activityId?: string;
  vehicleId?: string;
  /** Gama del hotel (solo opciones de habitación). */
  hotelCategory?: 'high' | 'medium' | 'low' | null;
}

const FICHA_HEADER_COLORS = [
  '#DC2626', // rojo
  '#EAB308', // amarillo
  '#2563EB', // azul
  '#16A34A', // verde
  '#F97316', // naranja
  '#9333EA', // morado
] as const;


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
  isAdmin = computed(() => this.auth.currentUser()?.role === 'admin');
  isOperaciones = computed(() => this.auth.currentUser()?.role === 'operaciones');
  canViewQuotationBreakdown = computed(() => {
    const role = this.auth.currentUser()?.role;
    return role === 'admin' || role === 'admin_proveedores';
  });
  isComercial = computed(() => this.auth.currentUser()?.role === 'comercial');
  activeTab = signal<'agenda' | 'cotizacion' | 'fileaa'>('agenda');

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
  /** Id del detalle de Ficha AA al que se está enviando correo (botón enviar). */
  sendingFichaEmailDetailId = signal<string | null>(null);

  /** Borrador Ficha AA: composición familiar y habitaciones (también se guarda en la cotización). */
  fichaFamilyRows = signal<FichaFamilyMemberRow[]>([]);
  fichaRoomRows = signal<FichaRoomRequirementRow[]>([]);

  /** Última Ficha AA generada con tabla de servicios (se recarga al abrir la cotización). */
  fichaFileAA = signal<FileAAWithDetails | null>(null);
  fichaAATab = signal<'ficha' | 'config'>('ficha');
  fichaNeedBabyBed = signal(false);
  fichaHasSpecialDate = signal(false);
  fichaSpecialDate = signal('');
  fichaNeedAC = signal(false);
  fichaHasDisability = signal(false);
  fichaDisabilityInfo = signal('');
  fichaNeedConnectingRooms = signal(false);
  fichaNeedBabyChairs = signal(false);

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
  fichaAABlockedForComercial = computed(() => this.isComercial() && !!this.fichaFileAA());

  readonly fichaRoleOptions = [
    { label: 'Niño/a', value: 'child' as FichaMemberRole },
    { label: 'Adulto/a', value: 'adult' as FichaMemberRole },
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

  /** Borrador UI para observaciones estructuradas (vehículo) en Ficha AA — evita pisar texto al teclear */
  private vehicleFichaObsDraft: Record<string, FileAADetailVehicleObsState> = {};
  /** Borrador UI para observaciones estructuradas (actividad): pick up + notas */
  private activityFichaObsDraft: Record<string, FileAADetailActivityObsState> = {};
  /** Borrador UI para filas hotel: número de habitaciones + observaciones */
  private hotelFichaObsDraft: Record<string, FileAADetailRoomObsState> = {};

  /** Diálogo: añadir fila en Ficha AA (nueva vs reemplazo + servicio del itinerario). */
  showFichaAddDetailDialog = signal(false);
  fichaAddDetailStep = signal<'kind' | 'pick'>('kind');
  /** Fila desde la que se abrió el diálogo (solo UI / categoría). */
  fichaAddAnchorRow = signal<FileAADetailRow | null>(null);
  /** Id de esa fila al abrir — no depender del objeto ni del nombre al enviar. */
  fichaAddAnchorDetailId = signal<string | null>(null);
  fichaAddKind = signal<'new' | 'replace' | null>(null);
  fichaAddSourcePickItems = signal<FichaAddSourcePickItem[]>([]);
  fichaAddSelectedPickKey = signal<string | null>(null);
  loadingFichaAddSource = signal(false);
  savingFichaAddDetail = signal(false);
  showFichaColorPicker = signal(false);

  constructor(
    private route: ActivatedRoute,
    private quotationService: QuotationService,
    private providerService: ProviderService,
    private auth: AuthService,
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
      recommendation: [''],
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
      commission: [1.92],
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

  setActiveTab(value: string | number | undefined): void {
    if (value === 'agenda' || value === 'cotizacion' || value === 'fileaa') {
      this.activeTab.set(value);
    }
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

    // Mismo total que la fila «Total» del tab Cotización: no reutilizar summary viejo al cambiar versión.
    this.summary.set(null);
    this.loadingSummary.set(true);
    this.quotationService.getSummary(q.id, version.id).subscribe({
      next: (s) => {
        this.summary.set(s);
        this.loadingSummary.set(false);
      },
      error: () => {
        this.summary.set(null);
        this.loadingSummary.set(false);
      },
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
      recommendation: '',
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
        recommendation: val.recommendation || undefined,
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
        this.selectedVersionId.set(v.id);
        this.recalculateVersion(q.id, v.id, {
          successMessage: `Versión V${v.version_number} creada y recalculada`,
          onDone: () => {
            this.saving.set(false);
            // Refresca lista de versiones y, por seguridad, carga las líneas de la versión creada.
            this.load(q.id);
            this.quotationService.getVersionLines(q.id, v.id).subscribe({
              next: (lines) => this.lines.set(this.sortLinesByDate(lines)),
              error: () => void 0,
            });
          },
          onError: () => {
            this.saving.set(false);
            this.messageService.add({
              severity: 'error',
              summary: `La versión V${v.version_number} se creó, pero no se pudo recalcular`
            });
            this.load(q.id);
          },
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
    this.recalculateVersion(q.id, version.id, {
      successMessage: 'Total recalculado',
      onDone: () => this.load(q.id),
    });
  }

  private recalculateVersion(
    quotationId: string,
    versionId: string,
    options?: {
      successMessage?: string;
      onDone?: () => void;
      onError?: () => void;
    }
  ) {
    this.quotationService.recalculate(quotationId, versionId).subscribe({
      next: () => {
        if (options?.successMessage) {
          this.messageService.add({ severity: 'success', summary: options.successMessage });
        }
        options?.onDone?.();
      },
      error: () => {
        options?.onError?.();
      },
    });
  }

  // ─── Helpers ───────────────────────────────────────────────

  getVersionLabel(v: QuotationVersion): string {
    return `V${v.version_number}${v.is_current ? ' (actual)' : ''}`;
  }

  /** Opciones del selector de versión: orden descendente (V3, V2, V1…). */
  get versionSelectOptions() {
    const q = this.quotation();
    if (!q?.versions?.length) return [];
    return [...q.versions]
      .filter((v) => !(v as QuotationVersion & { deleted?: boolean }).deleted)
      .sort((a, b) => b.version_number - a.version_number)
      .map((v) => ({
        value: v.id,
        versionNumber: v.version_number,
        isCurrent: v.is_current,
        createdByName: (v.created_by_name && String(v.created_by_name).trim()) || null,
      }));
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
      commission: q.commission ?? 1.92,
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
      shared: raw.shared,
    };
    if (this.isAdmin()) {
      body['commission'] = raw.commission;
    }
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
        label: 'Actualizar total',
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

  /** Texto de recomendación / comentario no vacío (plantilla). */
  hasRecommendation(text: string | null | undefined): boolean {
    return !!(text && String(text).trim());
  }

  /**
   * El backend arma `name` como "{hotel} - {habitación}".
   * Parte por el último " - " por si el nombre del hotel incluye ese separador.
   */
  /** Fila Ficha AA (habitación): hotel + tipo en dos líneas si el nombre trae « - ». */
  fichaDetailRoomDisplay(d: FileAADetailRow): { hotel: string; roomLabel: string; twoLines: boolean } {
    const plain = this.stripHtml(d.name);
    const sep = ' - ';
    const idx = plain.lastIndexOf(sep);
    if (idx === -1) {
      return { hotel: '', roomLabel: (plain || d.name || '').trim(), twoLines: false };
    }
    const hotel = plain.slice(0, idx).trim();
    const roomLabel = plain.slice(idx + sep.length).trim();
    if (!roomLabel) {
      return { hotel: '', roomLabel: (plain || d.name || '').trim(), twoLines: false };
    }
    return { hotel, roomLabel, twoLines: true };
  }

  parseQuotationRoomDisplay(room: QuotationLine['rooms'][number]): {
    hotel: string;
    roomLabel: string;
    useFullRichName: boolean;
  } {
    const plain = this.stripHtml(room.name);
    const sep = ' - ';
    const idx = plain.lastIndexOf(sep);
    if (idx === -1) {
      return { hotel: '', roomLabel: '', useFullRichName: true };
    }
    const hotel = plain.slice(0, idx).trim();
    const roomLabel = plain.slice(idx + sep.length).trim();
    if (!roomLabel) {
      return { hotel: '', roomLabel: '', useFullRichName: true };
    }
    return { hotel, roomLabel, useFullRichName: false };
  }

  /** Adultos / niños adicionales en habitación (columna derecha). */
  roomExtrasLine(room: QuotationLine['rooms'][number]): string {
    const bits: string[] = [];
    if (room.additional_adults > 0) bits.push(`+${room.additional_adults}A`);
    if (room.additional_children > 0) bits.push(`+${room.additional_children}N`);
    return bits.length ? bits.join(' ') : '—';
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
        const rec = (r.recommendation || '').trim();
        if (rec) s += ` — ${this.stripHtml(rec)}`;
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
      this.fichaFamilyRows.set([{ role: 'adult', age: null, adult_category: null }]);
    }
    const fr = q.ficha_room_requirements;
    if (Array.isArray(fr) && fr.length > 0) {
      this.fichaRoomRows.set(fr.map((raw) => this.normalizeFichaRoom(raw)));
    } else {
      this.fichaRoomRows.set([{ room_type: 'double', quantity: 1 }]);
    }
  }

  setFichaAATab(value: unknown): void {
    if (value === 'ficha' || value === 'config') this.fichaAATab.set(value);
  }

  onFichaSpecialDateToggle(checked: boolean): void {
    this.fichaHasSpecialDate.set(!!checked);
    if (!checked) this.fichaSpecialDate.set('');
  }

  onFichaDisabilityToggle(checked: boolean): void {
    this.fichaHasDisability.set(!!checked);
    if (!checked) this.fichaDisabilityInfo.set('');
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
    return { role: 'adult', adult_category: null, age: null };
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

  /**
   * Encabezado Ficha AA: adultos + menores con edades (usa quantity_* y children_ages, no el texto largo family_description).
   * Ej.: "3 Adultos + 1 Menor (10 años)" · "3 Adultos + 2 Menores (15, 10 años)"
   */
  fichaCompositionSummary(ficha: FileAAWithDetails): string {
    const na = Number(ficha.quantity_adults) || 0;
    const nc = Number(ficha.quantity_children) || 0;
    if (na === 0 && nc === 0) {
      return '';
    }
    const adultPart = na === 1 ? '1 Adulto' : `${na} Adultos`;
    if (nc === 0) {
      return adultPart;
    }
    const minorPart = nc === 1 ? '1 Menor' : `${nc} Menores`;
    const ages = (ficha.children_ages || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const agesSegment =
      ages.length > 0 ? ` (${ages.join(', ')} años)` : '';
    return `${adultPart} + ${minorPart}${agesSegment}`;
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

  fichaHeaderColor(): string {
    return this.fichaFileAA()?.header_color ?? '#2563EB';
  }

  toggleFichaColorPicker(): void {
    this.showFichaColorPicker.update((v) => !v);
  }

  setFichaHeaderColor(next: string): void {
    const f = this.fichaFileAA();
    if (!f) return;
    const color = String(next || '').toUpperCase();
    if (!FICHA_HEADER_COLORS.includes(color as (typeof FICHA_HEADER_COLORS)[number])) {
      return;
    }
    if ((f.header_color || '').toUpperCase() === color) {
      this.showFichaColorPicker.set(false);
      return;
    }
    this.quotationService.updateFileAA(f.id, { header_color: color }).subscribe({
      next: (updated) => {
        this.fichaFileAA.set({
          ...f,
          ...updated,
          header_color: updated.header_color || color,
        });
        this.showFichaColorPicker.set(false);
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary:
            typeof err.error?.detail === 'string'
              ? err.error.detail
              : 'No se pudo cambiar el color de la Ficha AA',
        });
      },
    });
  }

  private loadLatestFileAA(quotationId: string): void {
    this.quotationService.getLatestFileAA(quotationId).subscribe({
      next: (f) => {
        this.clearAllVehicleFichaObsDrafts();
        const loaded = {
          ...f,
          header_color: f.header_color || '#2563EB',
        };
        this.fichaFileAA.set(loaded);
        this.hydrateChecklistFromFichaDetails(loaded);
        this.fichaAATab.set('ficha');
        // Para operaciones, al entrar con Ficha AA existente abrir directamente ese tab.
        if (this.isOperaciones() && this.activeTab() === 'agenda') {
          this.activeTab.set('fileaa');
        }
      },
      error: (err) => {
        if (err.status === 404) {
          this.clearAllVehicleFichaObsDrafts();
          this.fichaFileAA.set(null);
          this.resetChecklistDraft();
          this.fichaAATab.set('config');
        }
      },
    });
  }

  /** Envía correo al proveedor para una fila de la Ficha AA (vehículo: adjuntos docx/pdf + firma si existe). */
  sendSupplierReservationEmail(row: FileAADetailRow): void {
    if (row.row_status === 'red' || row.send_email || row.supplier_email_sent_at) return;
    const f = this.fichaFileAA();
    const q = this.quotation();
    if (!f || !q) return;

    const previewWindow = window.open('', '_blank');
    if (!previewWindow) {
      this.messageService.add({
        severity: 'warn',
        summary: 'No se pudo abrir la vista previa',
        detail: 'Permita ventanas emergentes para revisar el PDF antes de enviar.',
      });
      return;
    }

    this.sendingFichaEmailDetailId.set(row.id);
    this.quotationService.previewFileAADetailReservationPdf(f.id, row.id).subscribe({
      next: (blob) => {
        this.sendingFichaEmailDetailId.set(null);
        if (blob.type === 'application/json' || blob.size < 32) {
          previewWindow.close();
          blob.text().then((t) => {
            try {
              const j = JSON.parse(t) as { detail?: string };
              this.messageService.add({
                severity: 'warn',
                summary:
                  typeof j.detail === 'string'
                    ? j.detail
                    : 'No se pudo generar la vista previa del PDF',
              });
            } catch {
              this.messageService.add({
                severity: 'warn',
                summary: 'No se pudo generar la vista previa del PDF',
              });
            }
          });
          return;
        }

        const previewUrl = URL.createObjectURL(blob);
        previewWindow.location.href = previewUrl;
        setTimeout(() => URL.revokeObjectURL(previewUrl), 60_000);

        this.confirmationService.confirm({
          header: 'Confirmar envío al proveedor',
          message: `Revise el borrador del PDF para "${this.stripHtml(row.name)}". ¿Desea enviar ahora el correo?`,
          icon: 'pi pi-envelope',
          acceptLabel: 'Enviar',
          rejectLabel: 'Cancelar',
          accept: () => this.executeSendSupplierReservationEmail(f.id, q.id, row.id),
        });
      },
      error: (err) => {
        this.sendingFichaEmailDetailId.set(null);
        previewWindow.close();
        const d = err.error?.detail;
        const msg = typeof d === 'string' ? d : 'No se pudo generar la vista previa del PDF';
        this.messageService.add({
          severity: 'warn',
          summary: 'Vista previa',
          detail: msg,
          life: 12000,
        });
      },
    });
  }

  private executeSendSupplierReservationEmail(fileId: string, quotationId: string, detailId: string): void {
    this.sendingFichaEmailDetailId.set(detailId);
    this.quotationService.sendFileAADetailReservationEmail(fileId, detailId).subscribe({
      next: () => {
        this.sendingFichaEmailDetailId.set(null);
        this.messageService.add({ severity: 'success', summary: 'Correo enviado al proveedor' });
        this.loadLatestFileAA(quotationId);
      },
      error: (err) => {
        this.sendingFichaEmailDetailId.set(null);
        const d = err.error?.detail;
        const msg = typeof d === 'string' ? d : 'No se pudo enviar el correo';
        this.messageService.add({
          severity: 'warn',
          summary: 'Envío de correo',
          detail: msg,
          life: 12000,
        });
      },
    });
  }

  /** Tooltip al pasar el mouse sobre «Enviado» (solo si ya se envió correo al proveedor). */
  fichaSupplierEmailSentTooltip(d: FileAADetailRow): string {
    const raw = d.supplier_email_sent_at;
    if (!raw) return '';
    const dt = new Date(raw);
    if (Number.isNaN(dt.getTime())) return 'Correo enviado al proveedor';
    return `Enviado: ${dt.toLocaleString('es-CR', { dateStyle: 'short', timeStyle: 'short' })}`;
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
        if (patch.observation_extras !== undefined || patch.observations !== undefined) {
          delete this.vehicleFichaObsDraft[detailId];
          delete this.activityFichaObsDraft[detailId];
          delete this.hotelFichaObsDraft[detailId];
        }
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

  onFichaDetailObservationsBlur(row: FileAADetailRow, target: EventTarget | null): void {
    if (row.category === 'vehicle' || row.category === 'activity' || row.category === 'room') return;
    const v = target instanceof HTMLTextAreaElement ? target.value : '';
    const t = v.trim();
    this.patchFileDetail(row.id, { observations: t.length ? t : null });
  }

  private clearAllVehicleFichaObsDrafts(): void {
    this.vehicleFichaObsDraft = {};
    this.activityFichaObsDraft = {};
    this.hotelFichaObsDraft = {};
  }

  private vehicleFichaObsFromServer(d: FileAADetailRow): FileAADetailVehicleObsState {
    const raw = d.observation_extras;
    const notes = typeof d.observations === 'string' ? d.observations : '';
    const def: FileAADetailVehicleObsState = {
      luggage_cover: false,
      pickup_detail: '',
      dropoff_detail: '',
      notes,
    };
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      const o = raw as Record<string, unknown>;
      return {
        luggage_cover: !!o['luggage_cover'],
        pickup_detail: String(o['pickup_detail'] ?? ''),
        dropoff_detail: String(o['dropoff_detail'] ?? ''),
        notes: String(o['notes'] ?? notes),
      };
    }
    return def;
  }

  /** Referencia estable para ngModel en filas vehículo (Ficha AA). */
  ensureVehicleFichaObsDraft(d: FileAADetailRow): FileAADetailVehicleObsState {
    if (!this.vehicleFichaObsDraft[d.id]) {
      this.vehicleFichaObsDraft[d.id] = { ...this.vehicleFichaObsFromServer(d) };
    }
    return this.vehicleFichaObsDraft[d.id];
  }

  commitVehicleFichaObs(d: FileAADetailRow): void {
    const row = this.ensureVehicleFichaObsDraft(d);
    const observation_extras = {
      luggage_cover: row.luggage_cover,
      pickup_detail: row.pickup_detail,
      dropoff_detail: row.dropoff_detail,
      notes: row.notes,
    };
    const notesTrim = row.notes.trim();
    this.patchFileDetail(d.id, {
      observation_extras,
      observations: notesTrim ? notesTrim : null,
    });
  }

  private activityFichaObsFromServer(d: FileAADetailRow): FileAADetailActivityObsState {
    const raw = d.observation_extras;
    const notes = typeof d.observations === 'string' ? d.observations : '';
    const def: FileAADetailActivityObsState = {
      pickup_detail: '',
      notes,
    };
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      const o = raw as Record<string, unknown>;
      return {
        pickup_detail: String(o['pickup_detail'] ?? ''),
        notes: String(o['notes'] ?? notes),
      };
    }
    return def;
  }

  ensureActivityFichaObsDraft(d: FileAADetailRow): FileAADetailActivityObsState {
    if (!this.activityFichaObsDraft[d.id]) {
      this.activityFichaObsDraft[d.id] = { ...this.activityFichaObsFromServer(d) };
    }
    return this.activityFichaObsDraft[d.id];
  }

  commitActivityFichaObs(d: FileAADetailRow): void {
    const row = this.ensureActivityFichaObsDraft(d);
    const observation_extras = {
      pickup_detail: row.pickup_detail,
      notes: row.notes,
    };
    const notesTrim = row.notes.trim();
    this.patchFileDetail(d.id, {
      observation_extras,
      observations: notesTrim ? notesTrim : null,
    });
  }

  /** día/mes desde ISO YYYY-MM-DD (sin año), p. ej. 20/3 */
  formatIsoDateDm(iso: string | null | undefined): string {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    if (!y || !m || !d) return iso;
    return `${Number(d)}/${Number(m)}`;
  }

  private isoAddDays(iso: string, delta: number): string {
    const dt = new Date(`${iso}T12:00:00`);
    if (Number.isNaN(dt.getTime())) return iso;
    dt.setDate(dt.getDate() + delta);
    const y = dt.getFullYear();
    const mo = String(dt.getMonth() + 1).padStart(2, '0');
    const da = String(dt.getDate()).padStart(2, '0');
    return `${y}-${mo}-${da}`;
  }

  /** Parsea líneas «Entrada: … / Salida: … / Noches: …» generadas al exportar o desde API. */
  private parseFichaHotelDatesCell(dates: string | null | undefined): {
    ficha_entrada: string;
    ficha_salida: string;
    ficha_noches_texto: string;
  } {
    const empty = { ficha_entrada: '', ficha_salida: '', ficha_noches_texto: '' };
    if (!dates) return empty;
    const acc = { ...empty };
    for (const line of dates.split('\n')) {
      const t = line.trim();
      const m = /^(Entrada|Salida|Noches)\s*:\s*(.*)$/i.exec(t);
      if (!m) continue;
      const val = (m[2] ?? '').trim();
      const key = m[1].toLowerCase();
      if (key === 'entrada') acc.ficha_entrada = val;
      else if (key === 'salida') acc.ficha_salida = val;
      else if (key === 'noches') acc.ficha_noches_texto = val;
    }
    if (acc.ficha_entrada || acc.ficha_salida || acc.ficha_noches_texto) return acc;
    return empty;
  }

  private hotelFichaObsFromServer(d: FileAADetailRow): FileAADetailRoomObsState {
    const raw = d.observation_extras;
    const notes = typeof d.observations === 'string' ? d.observations : '';
    let room_quantity: number | null = null;
    let ficha_entrada = '';
    let ficha_salida = '';
    let ficha_noches_texto = '';
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      const o = raw as Record<string, unknown>;
      const rq = o['room_quantity'];
      if (rq !== null && rq !== undefined && rq !== '') {
        const n = Number(rq);
        room_quantity = Number.isFinite(n) ? n : null;
      }
      ficha_entrada = String(o['ficha_entrada'] ?? '');
      ficha_salida = String(o['ficha_salida'] ?? '');
      ficha_noches_texto = String(o['ficha_noches_texto'] ?? '');
    }
    if (!ficha_entrada && !ficha_salida && !ficha_noches_texto) {
      const parsed = this.parseFichaHotelDatesCell(d.dates);
      ficha_entrada = parsed.ficha_entrada;
      ficha_salida = parsed.ficha_salida;
      ficha_noches_texto = parsed.ficha_noches_texto;
    }
    if (!ficha_entrada && !ficha_salida && !ficha_noches_texto && d.date_from && d.date_to) {
      ficha_entrada = this.formatIsoDateDm(d.date_from);
      ficha_salida = this.formatIsoDateDm(this.isoAddDays(d.date_to, 1));
      const nd = Number(d.days);
      ficha_noches_texto = Number.isFinite(nd) && nd > 0 ? String(nd) : '';
    }
    return { room_quantity, ficha_entrada, ficha_salida, ficha_noches_texto, notes };
  }

  ensureHotelFichaObsDraft(d: FileAADetailRow): FileAADetailRoomObsState {
    if (!this.hotelFichaObsDraft[d.id]) {
      this.hotelFichaObsDraft[d.id] = { ...this.hotelFichaObsFromServer(d) };
    }
    return this.hotelFichaObsDraft[d.id];
  }

  commitHotelFichaObs(d: FileAADetailRow): void {
    const row = this.ensureHotelFichaObsDraft(d);
    let room_quantity: number | null = null;
    const rawQty = row.room_quantity as unknown;
    if (rawQty !== null && rawQty !== undefined && rawQty !== '') {
      const n = Number(rawQty);
      room_quantity = Number.isFinite(n) ? n : null;
    }
    row.room_quantity = room_quantity;
    const prev =
      d.observation_extras && typeof d.observation_extras === 'object' && !Array.isArray(d.observation_extras)
        ? { ...(d.observation_extras as Record<string, unknown>) }
        : {};
    const ficha_entrada = (row.ficha_entrada ?? '').trim();
    const ficha_salida = (row.ficha_salida ?? '').trim();
    const ficha_noches_texto = (row.ficha_noches_texto ?? '').trim();
    const datesLines: string[] = [];
    if (ficha_entrada) datesLines.push(`Entrada: ${ficha_entrada}`);
    if (ficha_salida) datesLines.push(`Salida: ${ficha_salida}`);
    if (ficha_noches_texto) datesLines.push(`Noches: ${ficha_noches_texto}`);
    const datesCell = datesLines.join('\n');
    const observation_extras = {
      ...prev,
      room_quantity,
      ficha_entrada,
      ficha_salida,
      ficha_noches_texto,
    };
    const notesTrim = row.notes.trim();
    this.patchFileDetail(d.id, {
      observation_extras,
      observations: notesTrim ? notesTrim : null,
      dates: datesCell,
    });
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

  fichaHasLargePriceGap(detail: FileAADetailRow): boolean {
    const system = Number(detail.total_price ?? 0);
    const providerRaw = detail.provider_price;
    if (providerRaw === null || providerRaw === undefined || providerRaw === '') return false;
    const provider = Number(providerRaw);
    if (!Number.isFinite(system) || !Number.isFinite(provider)) return false;
    if (provider <= 0) return false;
    return Math.abs(system - provider) >= 50;
  }

  /** Fila creada desde "Añadir línea" (nueva o reemplazo): se resalta en verde. */
  fichaIsAddedDetail(detail: FileAADetailRow): boolean {
    const raw = detail.observation_extras;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false;
    const anchorId = String((raw as Record<string, unknown>)['sort_after_detail_id'] ?? '').trim();
    return anchorId.length > 0;
  }

  openFichaAddDetailDialog(anchor: FileAADetailRow): void {
    this.fichaAddAnchorRow.set(anchor);
    this.fichaAddAnchorDetailId.set(anchor.id);
    this.fichaAddDetailStep.set('kind');
    this.fichaAddKind.set(null);
    this.fichaAddSelectedPickKey.set(null);
    this.fichaAddSourcePickItems.set([]);
    this.showFichaAddDetailDialog.set(true);
  }

  closeFichaAddDetailDialog(): void {
    this.showFichaAddDetailDialog.set(false);
  }

  onFichaAddDetailDialogHide(): void {
    this.fichaAddDetailStep.set('kind');
    this.fichaAddKind.set(null);
    this.fichaAddAnchorRow.set(null);
    this.fichaAddAnchorDetailId.set(null);
    this.fichaAddSelectedPickKey.set(null);
    this.fichaAddSourcePickItems.set([]);
    this.loadingFichaAddSource.set(false);
    this.savingFichaAddDetail.set(false);
  }

  chooseFichaAddKind(kind: 'new' | 'replace'): void {
    this.fichaAddKind.set(kind);
    const anchor = this.fichaAddAnchorRow();
    const q = this.quotation();
    if (!anchor || !q) return;
    this.fichaAddDetailStep.set('pick');
    this.loadingFichaAddSource.set(true);
    this.fichaAddSelectedPickKey.set(null);
    const onError = (err: { error?: { detail?: unknown } }, summary: string) => {
      this.loadingFichaAddSource.set(false);
      const d = err.error?.detail;
      this.messageService.add({
        severity: 'error',
        summary: typeof d === 'string' ? d : summary,
      });
      this.fichaAddDetailStep.set('kind');
      this.fichaAddKind.set(null);
    };

    const mapRows = <T extends { label: string }>(
      rows: T[],
      pick: (
        row: T,
      ) => Partial<
        Pick<FichaAddSourcePickItem, 'roomId' | 'activityId' | 'vehicleId' | 'hotelCategory'>
      >,
    ) =>
      rows.map((row) => ({
        key: crypto.randomUUID(),
        listLabel: row.label,
        ...pick(row),
      })) as FichaAddSourcePickItem[];

    if (anchor.category === 'room') {
      this.quotationService.getFichaRoomCatalog().subscribe({
        next: (rows) => {
          this.fichaAddSourcePickItems.set(
            mapRows(rows, (r) => ({
              roomId: String(r.room_id),
              hotelCategory: this.normalizeHotelCategory(r.hotel_category),
            })),
          );
          this.loadingFichaAddSource.set(false);
        },
        error: (err) => onError(err, 'No se pudo cargar el catálogo de habitaciones'),
      });
    } else if (anchor.category === 'activity') {
      this.quotationService.getFichaActivityCatalog().subscribe({
        next: (rows) => {
          this.fichaAddSourcePickItems.set(
            mapRows(rows, (r) => ({ activityId: String(r.activity_id) })),
          );
          this.loadingFichaAddSource.set(false);
        },
        error: (err) => onError(err, 'No se pudo cargar el catálogo de actividades'),
      });
    } else {
      this.quotationService.getFichaVehicleCatalog().subscribe({
        next: (rows) => {
          this.fichaAddSourcePickItems.set(
            mapRows(rows, (r) => ({ vehicleId: String(r.vehicle_id) })),
          );
          this.loadingFichaAddSource.set(false);
        },
        error: (err) => onError(err, 'No se pudo cargar el catálogo de vehículos'),
      });
    }
  }

  backFichaAddDetailStep(): void {
    if (this.fichaAddDetailStep() !== 'pick') return;
    this.fichaAddDetailStep.set('kind');
    this.fichaAddKind.set(null);
    this.fichaAddSelectedPickKey.set(null);
    this.fichaAddSourcePickItems.set([]);
  }

  submitFichaAddDetailRow(): void {
    const f = this.fichaFileAA();
    const anchor = this.fichaAddAnchorRow();
    const anchorId = this.fichaAddAnchorDetailId();
    const pickKey = this.fichaAddSelectedPickKey();
    const kind = this.fichaAddKind();
    if (!f || !anchor || !anchorId || !pickKey || !kind) return;
    const item = this.fichaAddSourcePickItems().find((i) => i.key === pickKey);
    if (!item) return;

    const cat = anchor.category;
    let body: FileAADetailCreateBody;
    const base = {
      copy_operational_from_detail_id: anchorId,
      mark_anchor_row_red: kind === 'replace',
    };
    if (cat === 'room') {
      if (!item.roomId) return;
      body = { ...base, category: 'room', room_id: item.roomId };
    } else if (cat === 'activity') {
      if (!item.activityId) return;
      body = { ...base, category: 'activity', activity_id: item.activityId };
    } else if (cat === 'vehicle') {
      if (!item.vehicleId) return;
      body = { ...base, category: 'vehicle', vehicle_id: item.vehicleId };
    } else {
      return;
    }
    this.savingFichaAddDetail.set(true);
    this.quotationService.createFileAADetailRow(f.id, body).subscribe({
      next: () => {
        this.savingFichaAddDetail.set(false);
        this.showFichaAddDetailDialog.set(false);
        this.messageService.add({ severity: 'success', summary: 'Línea añadida a la ficha' });
        const q = this.quotation();
        if (q) this.loadLatestFileAA(q.id);
      },
      error: (err) => {
        this.savingFichaAddDetail.set(false);
        const d = err.error?.detail;
        this.messageService.add({
          severity: 'error',
          summary: typeof d === 'string' ? d : 'No se pudo crear la línea',
        });
      },
    });
  }

  confirmDeleteFichaDetailRow(row: FileAADetailRow): void {
    const name = (row.name || 'Servicio').slice(0, 80);
    this.confirmationService.confirm({
      message: `¿Eliminar la línea «${name}» de esta ficha? Esta acción no se puede deshacer.`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      accept: () => {
        this.quotationService.deleteFileAADetail(row.id).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Línea eliminada' });
            const q = this.quotation();
            if (q) this.loadLatestFileAA(q.id);
          },
          error: (err) => {
            const d = err.error?.detail;
            this.messageService.add({
              severity: 'error',
              summary: typeof d === 'string' ? d : 'No se pudo eliminar la línea',
            });
          },
        });
      },
    });
  }

  /** Opción seleccionada en el p-select Ficha AA (valor = `key`). */
  fichaAddSelectedPickItem(): FichaAddSourcePickItem | null {
    const key = this.fichaAddSelectedPickKey();
    if (!key) return null;
    return this.fichaAddSourcePickItems().find((i) => i.key === key) ?? null;
  }

  /** Texto plano del ítem seleccionado (filtros, accesibilidad). */
  fichaAddSelectedPickLabel(): string {
    return this.fichaAddSelectedPickItem()?.listLabel ?? '';
  }

  private normalizeHotelCategory(v: string | null | undefined): 'high' | 'medium' | 'low' | null {
    if (v === 'high' || v === 'medium' || v === 'low') return v;
    return null;
  }

  /** Gama del hotel para tarjetas de habitación en la agenda (API: hotel_category). */
  agendaRoomGamaClass(room: QuotationLine['rooms'][number]): string {
    const g = this.normalizeHotelCategory(room.hotel_category);
    if (g === 'high') return 'agenda-gama-high';
    if (g === 'medium') return 'agenda-gama-medium';
    if (g === 'low') return 'agenda-gama-low';
    return '';
  }

  /** Gama hotel en filas habitación de la Ficha AA (respuesta o observation_extras). */
  fichaRoomHotelGama(d: FileAADetailRow): 'high' | 'medium' | 'low' | null {
    const fromRow = this.normalizeHotelCategory(d.hotel_category);
    if (fromRow) return fromRow;
    const raw = d.observation_extras?.['hotel_category'];
    return this.normalizeHotelCategory(typeof raw === 'string' ? raw : undefined);
  }

  /** Hotel elegido en el diálogo «Agregar habitación» (para color de gama en habitación). */
  addRoomFormHotel(): HotelOption | null {
    const v = this.roomForm.get('hotel')?.value;
    if (v && typeof v === 'object' && 'id' in v) {
      return v as HotelOption;
    }
    return null;
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
    this.fichaFamilyRows.update((rows) => [...rows, { role: 'adult', age: null, adult_category: null }]);
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
          adult_category: null,
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
      family_members: this.fichaFamilyRows().map((m) => {
        if (m.role === 'child') {
          return { role: 'child' as const, age: m.age ?? 0 };
        }
        return { role: 'adult' as const, age: null };
      }),
      room_requirements: this.fichaRoomRows().map((r) => ({
        room_type: r.room_type,
        quantity: Math.min(50, Math.max(1, Math.floor(Number(r.quantity) || 1))),
      })),
    };
  }

  private stripChecklistBlock(obs: string): string {
    const src = (obs || '').trim();
    if (!src) return '';
    const checklistPrefixes = [
      'Cama para bebés',
      'Fecha Especial',
      'Aire acondicionado',
      'Persona con discapacidad',
      'Habitaciones communicante',
      'Sillas para bebés',
    ];
    const cleaned = src
      .split('\n')
      .map((l) => l.trim())
      .filter((line) => {
        if (!line) return false;
        if (line === '--- Checklist Ficha AA ---' || line === '--- Fin Checklist Ficha AA ---') return false;
        return !checklistPrefixes.some((p) => line.startsWith(p));
      });
    return cleaned.join('\n').trim();
  }

  private checklistLinesForCategory(cat: string): string[] {
    const lines: string[] = [];
    const disability = this.fichaDisabilityInfo().trim();
    if (cat === 'room') {
      if (this.fichaNeedBabyBed()) lines.push('Cama para bebés');
      if (this.fichaHasSpecialDate()) {
        const special = this.fichaSpecialDate().trim();
        lines.push(special ? `Fecha Especial: ${special}` : 'Fecha Especial');
      }
      if (this.fichaNeedAC()) lines.push('Aire acondicionado');
      if (this.fichaNeedConnectingRooms()) lines.push('Habitaciones communicante');
      if (this.fichaHasDisability()) {
        lines.push(disability ? `Persona con discapacidad: ${disability}` : 'Persona con discapacidad');
      }
    } else if (cat === 'activity') {
      if (this.fichaHasDisability()) {
        lines.push(disability ? `Persona con discapacidad: ${disability}` : 'Persona con discapacidad');
      }
    } else if (cat === 'vehicle') {
      if (this.fichaNeedBabyChairs()) lines.push('Sillas para bebés');
      if (this.fichaHasDisability()) {
        lines.push(disability ? `Persona con discapacidad: ${disability}` : 'Persona con discapacidad');
      }
    }
    return lines;
  }

  private mergedObservationWithChecklist(base: string | null, lines: string[]): string | null {
    const clean = this.stripChecklistBlock(base ?? '');
    if (!lines.length) return clean || null;
    return [clean, ...lines].filter(Boolean).join('\n').trim();
  }

  private applyChecklistToFichaDetails(ficha: FileAAWithDetails): void {
    for (const d of ficha.details) {
      if (d.row_status === 'red') continue;
      const lines = this.checklistLinesForCategory(d.category);
      const merged = this.mergedObservationWithChecklist(d.observations ?? null, lines);
      if ((d.observations ?? null) === merged) continue;
      this.patchFileDetail(d.id, { observations: merged });
    }
  }

  private resetChecklistDraft(): void {
    this.fichaNeedBabyBed.set(false);
    this.fichaHasSpecialDate.set(false);
    this.fichaSpecialDate.set('');
    this.fichaNeedAC.set(false);
    this.fichaHasDisability.set(false);
    this.fichaDisabilityInfo.set('');
    this.fichaNeedConnectingRooms.set(false);
    this.fichaNeedBabyChairs.set(false);
  }

  private hydrateChecklistFromFichaDetails(ficha: FileAAWithDetails | null): void {
    this.resetChecklistDraft();
    if (!ficha) return;
    const active = (ficha.details || []).filter((d) => d.row_status !== 'red');
    const findLine = (prefix: string, cats: Array<'room' | 'activity' | 'vehicle'>): string => {
      for (const d of active) {
        if (!cats.includes(d.category as 'room' | 'activity' | 'vehicle')) continue;
        const lines = String(d.observations ?? '')
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean);
        const match = lines.find((l) => l.startsWith(prefix));
        if (match) return match;
      }
      return '';
    };

    this.fichaNeedBabyBed.set(!!findLine('Cama para bebés', ['room']));
    this.fichaNeedAC.set(!!findLine('Aire acondicionado', ['room']));
    this.fichaNeedConnectingRooms.set(!!findLine('Habitaciones communicante', ['room']));
    this.fichaNeedBabyChairs.set(!!findLine('Sillas para bebés', ['vehicle']));

    const special = findLine('Fecha Especial', ['room']);
    if (special) {
      this.fichaHasSpecialDate.set(true);
      const i = special.indexOf(':');
      this.fichaSpecialDate.set(i >= 0 ? special.slice(i + 1).trim() : '');
    }

    const disability = findLine('Persona con discapacidad', ['room', 'activity', 'vehicle']);
    if (disability) {
      this.fichaHasDisability.set(true);
      const i = disability.indexOf(':');
      this.fichaDisabilityInfo.set(i >= 0 ? disability.slice(i + 1).trim() : '');
    }
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
        this.clearAllVehicleFichaObsDrafts();
        const generated = {
          ...ficha,
          header_color: ficha.header_color || '#2563EB',
        };
        this.fichaFileAA.set(generated);
        this.applyChecklistToFichaDetails(generated);
        this.fichaAATab.set('ficha');
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