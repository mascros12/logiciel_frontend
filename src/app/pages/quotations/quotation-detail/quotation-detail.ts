import { Component, OnInit, signal, computed, inject, DestroyRef } from '@angular/core';
import { HttpResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, of, forkJoin } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DatePipe, CurrencyPipe, NgClass } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
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
import { QuotationSummary, ServiceSummaryLine } from '../../../core/models/quotation.model';
import { DatePickerModule } from 'primeng/datepicker';

import { QuotationService } from '../../../core/services/quotation.service';
import { ProviderService } from '../../../core/services/provider.service';
import { AuthService } from '../../../core/auth/auth.service';
import { HotelService } from '../../../core/services/hotel.service';
import { ActivityService } from '../../../core/services/activity.service';
import { VehicleService } from '../../../core/services/vehicle.service';
import { ContactService } from '../../../core/services/contact.service';
import { ContactSource, ContactBudget, TravellerType, Ritm } from '../../../core/models/contact.model';
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
  FichaHotelStaySegment,
  FichaMergedRoomSlot,
  FileAADetailCreateBody,
} from '../../../core/models/quotation.model';
import {
  VehicleOption, HotelOption, RoomOption, ActivityOption
} from '../../../core/models/provider.model';
import { RichTextPipe } from '../../../core/pipes/rich-text.pipe';
import { formatQuotationVersionLabel } from '../../../core/utils/quotation-version-label';
import {
  vehicleBrandFromExtras,
  vehicleCategoryFromExtras,
  vehicleFichaAllowsSubtitle,
  vehicleFichaDatesLayout,
  vehicleFichaServiceLayout,
  botePublicoServiceLabel,
  transferZonaZonaServiceLabel,
  rentalVoitureLocationLabel,
  rentalVehicleServiceLabel,
  fichaAaDetailVisibleInTable,
  vueloInternoServiceLabel,
  formatTaxiMaritimoFichaDatesCell,
  parseTaxiMaritimoRoute,
  taxiMaritimoServiceLabel,
  type TaxiMaritimoRouteParts,
  type VehicleFichaDatesLayout,
  type VehicleFichaServiceLayout,
} from '../../../core/models/vehicle-ficha-layout';
import { StickyHorizontalScrollDirective } from '../../../core/directives/sticky-horizontal-scroll.directive';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import {
  apiErrorSummary,
  fieldStyleClass,
  validateForm,
  warnInvalidForm,
} from '../../../core/utils/form-validation.util';
import { FieldErrorComponent } from '../../../shared/components/field-error/field-error.component';

const VEHICLE_FORM_LABELS: Record<string, string> = {
  vehicle: 'Vehículo',
  start_date: 'Fecha inicio',
  end_date: 'Fecha fin',
};
const ROOM_FORM_LABELS: Record<string, string> = {
  hotel: 'Hotel',
  room: 'Habitación',
  start_date: 'Fecha inicio',
  end_date: 'Fecha fin',
};
const ACTIVITY_FORM_LABELS: Record<string, string> = {
  activity: 'Actividad',
};
const SHIFT_ITINERARY_LABELS: Record<string, string> = {
  new_first_date: 'Nueva primera fecha',
};
const CALENDAR_FORM_LABELS: Record<string, string> = {
  from_date: 'Desde',
  to_date: 'Hasta',
};
const EDIT_FORM_LABELS: Record<string, string> = {
  name: 'Nombre',
};

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

/**
 * Pares (intenso, claro) cabecera Ficha AA. Debe coincidir con
 * _FICHA_HEADER_COLOR_PAIRS en logiciel-crv/app/crud/quotation.py.
 */
const FICHA_HEADER_COLOR_PAIRS = [
  ['#DC2626', '#FECACA'], // rojo
  ['#EAB308', '#FEF9C3'], // amarillo
  ['#2563EB', '#BFDBFE'], // azul
  ['#16A34A', '#BBF7D0'], // verde
  ['#F97316', '#FED7AA'], // naranja
  ['#9333EA', '#E9D5FF'], // morado
  ['#DB2777', '#FBCFE8'], // rosa
  ['#0891B2', '#A5F3FC'], // cian
  ['#4F46E5', '#C7D2FE'], // índigo
  ['#0D9488', '#99F6E4'], // turquesa
  ['#65A30D', '#D9F99D'], // lima
  ['#C026D3', '#F5D0FE'], // fucsia
  ['#0284C7', '#BAE6FD'], // cielo
  ['#475569', '#E2E8F0'], // pizarra
  ['#BE123C', '#FECDD3'], // rosa oscuro
  ['#059669', '#A7F3D0'], // esmeralda
  ['#92400E', '#FDE68A'], // ámbar / marrón
  ['#3730A3', '#DDD6FE'], // índigo profundo
] as const;

const FICHA_HEADER_COLORS = FICHA_HEADER_COLOR_PAIRS.flat() as readonly string[];

/** Categorías de vehículo en la línea «Voiture de Location» (orden fijo). */
const VOITURE_LOCATION_VEHICLE_CATEGORIES = [
  'Vehiculo de Alquiler',
  'Interbus',
  'Vuelo Interno',
] as const;

type FichaAaColumnKey =
  | 'drag'
  | 'confirmed'
  | 'rowActions'
  | 'servicio'
  | 'fechas'
  | 'observaciones'
  | 'reserved'
  | 'nReserva'
  | 'precioSistema'
  | 'precioProveedor'
  | 'paid'
  | 'actions';

interface FichaAaColumnDef {
  key: FichaAaColumnKey;
  label: string;
  defaultWidth: number;
  minWidth: number;
  hideable: boolean;
}

const FICHA_AA_COLUMN_DEFS: FichaAaColumnDef[] = [
  { key: 'drag', label: 'Reordenar', defaultWidth: 36, minWidth: 28, hideable: false },
  { key: 'confirmed', label: 'F (confirmado)', defaultWidth: 38, minWidth: 32, hideable: true },
  { key: 'rowActions', label: '± (añadir/quitar)', defaultWidth: 52, minWidth: 44, hideable: true },
  { key: 'servicio', label: 'Servicio', defaultWidth: 240, minWidth: 120, hideable: true },
  { key: 'fechas', label: 'Fechas', defaultWidth: 220, minWidth: 120, hideable: true },
  { key: 'observaciones', label: 'Observaciones', defaultWidth: 280, minWidth: 140, hideable: true },
  { key: 'reserved', label: 'Reservado', defaultWidth: 88, minWidth: 64, hideable: true },
  { key: 'nReserva', label: 'Nº reserva', defaultWidth: 110, minWidth: 80, hideable: true },
  { key: 'precioSistema', label: 'Precio sistema', defaultWidth: 115, minWidth: 90, hideable: true },
  { key: 'precioProveedor', label: 'Precio proveedor', defaultWidth: 115, minWidth: 90, hideable: true },
  { key: 'paid', label: 'Pagado', defaultWidth: 76, minWidth: 56, hideable: true },
  { key: 'actions', label: 'Acciones', defaultWidth: 96, minWidth: 72, hideable: true },
];

const FICHA_AA_DEFAULT_COL_WIDTHS: Record<FichaAaColumnKey, number> = Object.fromEntries(
  FICHA_AA_COLUMN_DEFS.map((c) => [c.key, c.defaultWidth]),
) as Record<FichaAaColumnKey, number>;

const FICHA_AA_MIN_COL_WIDTHS: Record<FichaAaColumnKey, number> = Object.fromEntries(
  FICHA_AA_COLUMN_DEFS.map((c) => [c.key, c.minWidth]),
) as Record<FichaAaColumnKey, number>;

const FICHA_AA_COL_SETTINGS_STORAGE_KEY = 'ficha-aa-col-settings-v2';
/** Migración desde versión anterior (solo 6 columnas redimensionables). */
const FICHA_AA_COL_WIDTHS_STORAGE_KEY_V1 = 'ficha-aa-col-widths-v1';

function computeFichaAaTableMinWidthPx(
  widths: Record<FichaAaColumnKey, number>,
  visible: Partial<Record<FichaAaColumnKey, boolean>>,
): number {
  return FICHA_AA_COLUMN_DEFS.reduce((sum, col) => {
    if (visible[col.key] === false) return sum;
    return sum + widths[col.key];
  }, 0);
}


@Component({
  selector: 'app-quotation-detail',
  standalone: true,
  imports: [
    DatePipe, CurrencyPipe, NgClass, RouterLink, ReactiveFormsModule,
    TabsModule, ButtonModule, TableModule, TagModule,
    DialogModule, SelectModule, InputTextModule, TextareaModule,
    InputNumberModule, CheckboxModule,
    ToastModule, SkeletonModule, TooltipModule, ConfirmDialogModule, AutoCompleteModule,
    FormsModule, DatePickerModule, RichTextPipe, DragDropModule, MenuModule,
    StickyHorizontalScrollDirective,
    FieldErrorComponent,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './quotation-detail.html',
  styleUrl: './quotation-detail.scss',
})
export class QuotationDetail implements OnInit {
  /** Opciones del selector de color (misma lista que valida el API). */
  readonly fichaHeaderPalette: readonly string[] = [...FICHA_HEADER_COLORS];

  quotation = signal<QuotationFull | null>(null);
  loading = signal(true);
  summary = signal<QuotationSummary | null>(null);
  loadingSummary = signal(false);
  isAdmin = computed(() => this.auth.currentUser()?.role === 'admin');
  isOperaciones = computed(() => this.auth.currentUser()?.role === 'operaciones');
  /** Editar y guardar `file_aa_name` desde la Ficha AA (catálogo + fila). */
  canEditFichaCatalogueName = computed(() => this.roleCanEditFichaCatalogueName());
  canViewQuotationBreakdown = computed(() => {
    const role = this.auth.currentUser()?.role;
    return role === 'admin' || role === 'admin_proveedores';
  });
  isComercial = computed(() => this.auth.currentUser()?.role === 'comercial');
  canDeleteVersions = computed(() => {
    const role = this.auth.currentUser()?.role;
    return role === 'admin' || role === 'operaciones' || role === 'comercial';
  });
  activeTab = signal<'agenda' | 'cotizacion' | 'fileaa'>('agenda');
  /** Tab principal restaurado desde `?tab=` (no aplicar atajos automáticos de rol). */
  private tabRestoredFromUrl = false;
  /** Sub-tab Ficha AA restaurado desde `?fichaTab=`. */
  private fichaTabRestoredFromUrl = false;

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
  recalculatingFichaSystemPrices = signal(false);
  /** Id del detalle de Ficha AA al que se está enviando correo (botón enviar). */
  sendingFichaEmailDetailId = signal<string | null>(null);

  /** Borrador Ficha AA: composición familiar y habitaciones (también se guarda en la cotización). */
  fichaFamilyRows = signal<FichaFamilyMemberRow[]>([]);
  fichaRoomRows = signal<FichaRoomRequirementRow[]>([]);

  /** Última Ficha AA generada con tabla de servicios (se recarga al abrir la cotización). */
  fichaFileAA = signal<FileAAWithDetails | null>(null);
  /** Filas visibles de la tabla Ficha AA (orden manual drag-drop). */
  fichaVisibleDetailsList = signal<FileAADetailRow[]>([]);
  /** Remonta el tbody con CDK tras soltar (evita desfase DOM `<tr>` vs modelo Angular). */
  fichaDetailDragBodyKey = signal(0);
  fichaDetailReorderSaving = signal(false);
  /** Anchos en px de columnas de la tabla Ficha AA. */
  fichaAaColWidths = signal<Record<FichaAaColumnKey, number>>({
    ...FICHA_AA_DEFAULT_COL_WIDTHS,
  });
  /** Columnas ocultas en la tabla Ficha AA (persistido en localStorage). */
  fichaAaColVisible = signal<Partial<Record<FichaAaColumnKey, boolean>>>({});
  readonly fichaAaColumnPickerDefs = FICHA_AA_COLUMN_DEFS.filter((c) => c.hideable);
  showFichaAaColumnsDialog = signal(false);
  /** Ancho mínimo real de la tabla (suma de columnas visibles) para forzar scroll horizontal. */
  fichaAaTableMinWidthPx = computed(() =>
    computeFichaAaTableMinWidthPx(this.fichaAaColWidths(), this.fichaAaColVisible()),
  );
  fichaAaVisibleColumnCount = computed(() =>
    FICHA_AA_COLUMN_DEFS.filter((c) => this.fichaAaColumnVisible(c.key)).length,
  );
  /** Columnas visibles antes de «Precio sistema» (celda «Totales» en tfoot). */
  fichaAaTotalsLabelColspan = computed(() =>
    FICHA_AA_COLUMN_DEFS.filter(
      (c) =>
        c.key !== 'precioSistema' &&
        c.key !== 'precioProveedor' &&
        c.key !== 'paid' &&
        c.key !== 'actions' &&
        this.fichaAaColumnVisible(c.key),
    ).length,
  );
  fichaAaColResizing = signal(false);
  private fichaAaColResize: { key: FichaAaColumnKey; startX: number; startWidth: number } | null =
    null;
  fichaAATab = signal<'ficha' | 'config'>('ficha');
  /** Borradores UI de los textos libres que se imprimen al final del Word/PDF
   * (debajo de los virements). Se persisten en `FileAA.observations` /
   * `FileAA.reminder` mediante `updateFileAA` al perder el foco. */
  fichaObservationsDraft = signal('');
  fichaReminderDraft = signal('');
  savingFichaFreeText = signal(false);
  fichaNeedBabyBed = signal(false);
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
  /** Texto debajo del nombre en columna Service (solo esta Ficha AA). */
  private vehicleServiceSubtitleDraft: Record<string, string> = {};
  /** Borrador UI para observaciones estructuradas (actividad): pick up + notas */
  private activityFichaObsDraft: Record<string, FileAADetailActivityObsState> = {};
  /** Borrador UI columna Fechas (actividad) — evita que [ngModel] unidireccional revierta al teclear. */
  private activityDatesDraft: Record<string, string> = {};
  /** Borrador UI para filas hotel: número de habitaciones + observaciones */
  private hotelFichaObsDraft: Record<string, FileAADetailRoomObsState> = {};
  /** Evita que un PATCH lento sobrescriba un cambio más reciente en la misma fila. */
  private fileDetailPatchSeq: Record<string, number> = {};
  /** Fuerza refresco de la columna «Precio sistema» al editar noches/cantidad en hotel. */
  private hotelFichaPriceRev = signal(0);

  /** Diálogo: añadir fila en Ficha AA (nueva vs reemplazo + servicio del itinerario). */
  showFichaAddDetailDialog = signal(false);
  /** Modal: editar pareja entrada/salida de una estadía hotel. */
  showHotelStayEditDialog = signal(false);
  hotelStayEditDetailId = signal<string | null>(null);
  hotelStayEditRoomIndex = signal<number | null>(null);
  hotelStayEditSegmentIndex = signal(0);
  hotelStayEditEntradaDate = signal<Date | null>(null);
  hotelStayEditSalidaDate = signal<Date | null>(null);
  fichaAddDetailStep = signal<'kind' | 'pick-room' | 'pick'>('kind');
  /** Fila desde la que se abrió el diálogo (solo UI / categoría). */
  fichaAddAnchorRow = signal<FileAADetailRow | null>(null);
  /** Id de esa fila al abrir — no depender del objeto ni del nombre al enviar. */
  fichaAddAnchorDetailId = signal<string | null>(null);
  fichaAddKind = signal<'new' | 'replace' | null>(null);
  /** Habitación concreta a reemplazar en filas con varias tipologías. */
  fichaAddReplaceRoomId = signal<string | null>(null);
  fichaAddReplaceRoomSlotIndex = signal<number | null>(null);
  fichaAddSourcePickItems = signal<FichaAddSourcePickItem[]>([]);
  fichaAddSelectedPickKey = signal<string | null>(null);
  loadingFichaAddSource = signal(false);
  savingFichaAddDetail = signal(false);
  showFichaCombineDialog = signal(false);
  fichaCombineActivityRow = signal<FileAADetailRow | null>(null);
  fichaCombineSelectedHotelId = signal<string | null>(null);
  showFichaDetachDialog = signal(false);
  fichaDetachHotelRow = signal<FileAADetailRow | null>(null);
  fichaDetachSelectedActivityId = signal<string | null>(null);
  showFichaColorPicker = signal(false);

  /** Edición inline del nombre en Ficha AA (file_aa_name del catálogo). */
  /** Clave de edición inline: ``detailId|target`` (hotel, room, room:0, activity, …). */
  fichaNameEditKey = signal<string | null>(null);
  fichaNameEditValue = signal<string>('');
  savingFichaName = signal(false);

  sourceOptions: { label: string; value: ContactSource }[] = [
    { label: 'Evaneos', value: 'Evaneos' },
    { label: 'Directo', value: 'Directo' },
  ];
  budgetOptions: { label: string; value: ContactBudget }[] = [
    { label: 'Básico', value: 'Básico' },
    { label: 'Normal', value: 'Normal' },
    { label: 'Alto', value: 'Alto' },
  ];
  travellerTypeOptions: { label: string; value: TravellerType }[] = [
    { label: 'Aventurero', value: 'Aventurero' },
    { label: 'Cauteloso', value: 'Cauteloso' },
  ];
  ritmOptions: { label: string; value: Ritm }[] = [
    { label: '2 noches por etapa', value: '2 noches por etapa' },
    { label: '1 noche por etapa', value: '1 noche por etapa' },
    { label: 'Otro', value: 'Otro' },
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private quotationService: QuotationService,
    private providerService: ProviderService,
    private auth: AuthService,
    private fb: FormBuilder,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private hotelService: HotelService,
    private activityService: ActivityService,
    private vehicleService: VehicleService,
    private contactService: ContactService,
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
      source: [null],
      budget: [null],
      traveller_type: [null],
      ritm: [null],
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
    this.restoreTabsFromRoute();
    this.loadFichaAaColWidths();
    this.load(id);
    this.loadProviders();
  }

  private restoreTabsFromRoute(): void {
    const tab = this.route.snapshot.queryParamMap.get('tab');
    if (tab === 'agenda' || tab === 'fileaa') {
      this.tabRestoredFromUrl = true;
      this.activeTab.set(tab);
    } else if (tab === 'cotizacion' && this.canViewQuotationBreakdown()) {
      this.tabRestoredFromUrl = true;
      this.activeTab.set('cotizacion');
    }

    const fichaTab = this.route.snapshot.queryParamMap.get('fichaTab');
    if (fichaTab === 'ficha' || fichaTab === 'config') {
      this.fichaTabRestoredFromUrl = true;
      this.fichaAATab.set(fichaTab);
    }
  }

  private syncTabToRoute(tab: 'agenda' | 'cotizacion' | 'fileaa'): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  private syncFichaTabToRoute(fichaTab: 'ficha' | 'config'): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { fichaTab },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
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
      if (value === 'cotizacion' && !this.canViewQuotationBreakdown()) return;
      this.activeTab.set(value);
      this.syncTabToRoute(value);
      if (value === 'fileaa') {
        const q = this.quotation();
        if (q) this.loadFileAA(q.id);
      }
    }
  }

  load(id: string) {
    this.loading.set(true);
    const prevVersionId = this.selectedVersionId();
    this.quotationService.getById(id).subscribe({
      next: (q) => {
        this.quotation.set(q);
        this.initFichaFromQuotation(q);
        const currentId = q.current_version?.id ? String(q.current_version.id) : null;
        const v1Version =
          q.versions?.find(
            (v) =>
              v.version_number === 1 &&
              !(v as QuotationVersion & { deleted?: boolean }).deleted,
          ) ?? null;
        const v1Id = v1Version?.id ? String(v1Version.id) : null;

        const versionStillExists = q.versions?.some(
          (v) => String(v.id) === String(prevVersionId)
        );
        const keepViewingOther =
          prevVersionId && String(prevVersionId) !== currentId && versionStillExists;

        const finishWithLines = (lines: QuotationLine[]) => {
          this.lines.set(this.sortLinesByDate(lines));
          this.loading.set(false);
          this.loadSummary();
          this.loadFileAA(q.id);
        };

        if (keepViewingOther) {
          this.selectedVersionId.set(prevVersionId);
          this.quotationService.getVersionLines(q.id, prevVersionId).subscribe({
            next: (lines) => {
              const arr = Array.isArray(lines) ? lines : (lines as { lines?: QuotationLine[] })?.lines ?? [];
              finishWithLines(arr);
            },
            error: () => {
              this.lines.set(this.sortLinesByDate(q.lines ?? []));
              this.selectedVersionId.set(currentId);
              this.loading.set(false);
              this.loadSummary();
            },
          });
        } else {
          // Primera apertura del detalle: siempre versión 1 (si existe); tras recargas en la misma vista se mantiene la selección.
          const targetVersionId = !prevVersionId && v1Id ? v1Id : currentId;
          this.selectedVersionId.set(targetVersionId);
          if (targetVersionId && String(targetVersionId) === String(currentId)) {
            finishWithLines(q.lines ?? []);
          } else if (targetVersionId) {
            this.quotationService.getVersionLines(q.id, targetVersionId).subscribe({
              next: (resp) => {
                const arr = Array.isArray(resp) ? resp : (resp as { lines?: QuotationLine[] })?.lines ?? [];
                finishWithLines(arr);
              },
              error: () => {
                this.lines.set(this.sortLinesByDate(q.lines ?? []));
                this.selectedVersionId.set(currentId);
                this.loading.set(false);
                this.loadSummary();
              },
            });
          } else {
            finishWithLines([]);
          }
        }
      },
      error: () => this.loading.set(false),
    });
  }

  /**
   * Refresca solo las líneas de la versión activa y el resumen de precios,
   * sin activar `loading` (evita desmontar el DOM y perder la posición de scroll).
   * Usar tras añadir/eliminar ítems en el tab Agenda.
   */
  refreshLines() {
    const q = this.quotation();
    const versionId = this.selectedVersionId();
    if (!q || !versionId) return;
    this.quotationService.getVersionLines(q.id, versionId).subscribe({
      next: (resp) => {
        const arr = Array.isArray(resp) ? resp : (resp as { lines?: QuotationLine[] })?.lines ?? [];
        this.lines.set(this.sortLinesByDate(arr));
        this.loadSummary();
      },
      error: () => void 0,
    });
  }

  /** Actualiza cabecera y fechas de la cotización sin activar `loading` global. */
  private refreshQuotationMetadata(): void {
    const q = this.quotation();
    if (!q) return;
    this.quotationService.getById(q.id).subscribe({
      next: (updated) => this.quotation.set(updated),
      error: () => void 0,
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

  /** Grupo del tab Cotización al que pertenece cada ítem de línea (v1 = all). */
  private summaryItemInGroup(
    item: { is_original: boolean; deleted: boolean },
    group: 'all' | 'original' | 'deleted' | 'new',
  ): boolean {
    if (group === 'all') return !item.deleted;
    if (group === 'original') return !item.is_original && !item.deleted;
    if (group === 'deleted') return item.deleted && !item.is_original;
    return item.is_original && !item.deleted;
  }

  /** Orden cronológico y rutas de catálogo según la primera aparición en ``lines()``. */
  private summaryLineMeta = computed(() => {
    const lines = this.lines();
    const meta = new Map<
      string,
      { order: number; route: string[] | null; queryParams: Record<string, string> | null }
    >();
    const groups = ['all', 'original', 'deleted', 'new'] as const;
    const kinds = ['room', 'activity', 'vehicle'] as const;

    for (const group of groups) {
      for (const kind of kinds) {
        let order = 0;
        for (const line of lines) {
          const items =
            kind === 'room'
              ? line.rooms
              : kind === 'activity'
                ? line.activities
                : line.vehicles;
          for (const item of items) {
            if (!this.summaryItemInGroup(item, group)) continue;
            const key = `${group}:${kind}:${item.name}`;
            if (meta.has(key)) continue;
            meta.set(key, {
              order: order++,
              route: this.summaryCatalogRoute(kind, item),
              queryParams: this.summaryCatalogQueryParams(kind, item),
            });
          }
        }
      }
    }
    return meta;
  });

  private summaryCatalogRoute(
    kind: 'room' | 'activity' | 'vehicle',
    item: QuotationLine['rooms'][number] | QuotationLine['activities'][number] | QuotationLine['vehicles'][number],
  ): string[] | null {
    if (kind === 'room') {
      const hotelId = (item as QuotationLine['rooms'][number]).hotel_id;
      if (hotelId) return ['/hoteles', hotelId];
      return null;
    }
    if (kind === 'activity') {
      const activityId = (item as QuotationLine['activities'][number]).activity_id;
      if (activityId) return ['/actividades'];
      return null;
    }
    const vehicleId = (item as QuotationLine['vehicles'][number]).vehicle_id;
    if (vehicleId) return ['/vehiculos', vehicleId];
    return null;
  }

  private summaryCatalogQueryParams(
    kind: 'room' | 'activity' | 'vehicle',
    item: QuotationLine['rooms'][number] | QuotationLine['activities'][number] | QuotationLine['vehicles'][number],
  ): Record<string, string> | null {
    if (kind !== 'activity') return null;
    const q = this.summaryActivitySearchQuery(item.name);
    return q ? { q } : null;
  }

  private summaryActivitySearchQuery(name: string): string {
    const plain = (name || '').split(' [')[0].trim();
    return plain.length > 60 ? plain.slice(0, 60) : plain;
  }

  sortSummaryItems(
    items: ServiceSummaryLine[],
    kind: 'room' | 'activity' | 'vehicle',
    group: 'all' | 'original' | 'deleted' | 'new',
  ): ServiceSummaryLine[] {
    const meta = this.summaryLineMeta();
    return [...items].sort((a, b) => {
      const ka = `${group}:${kind}:${a.name}`;
      const kb = `${group}:${kind}:${b.name}`;
      const oa = meta.get(ka)?.order ?? Number.MAX_SAFE_INTEGER;
      const ob = meta.get(kb)?.order ?? Number.MAX_SAFE_INTEGER;
      if (oa !== ob) return oa - ob;
      return a.name.localeCompare(b.name, 'es');
    });
  }

  /** Suma de líneas de un apartado (Hotel / Actividades / Vehículo). */
  summaryCategoryTotal(items: ServiceSummaryLine[] | null | undefined): number {
    return (items ?? []).reduce((sum, item) => sum + (Number(item.total) || 0), 0);
  }

  /** Etiqueta de total por categoría: «—» si no hay importe. */
  summaryCategoryTotalLabel(
    items: ServiceSummaryLine[] | null | undefined,
    sign: 'none' | 'positive' | 'negative' = 'none',
  ): string {
    const total = this.summaryCategoryTotal(items);
    if (Math.abs(total) < 0.005) return '—';
    const fmt = new Intl.NumberFormat('es-CR', {
      style: 'currency',
      currency: 'USD',
    }).format(Math.abs(total));
    if (sign === 'positive') return `+${fmt}`;
    if (sign === 'negative') return `-${fmt}`;
    return fmt;
  }

  /** Total de sección (Elementos Eliminados / Añadidos). */
  summaryDiffSectionTotal(
    amount: number | null | undefined,
    sign: 'positive' | 'negative',
  ): string {
    const n = Number(amount);
    if (!Number.isFinite(n) || Math.abs(n) < 0.005) return '—';
    const fmt = new Intl.NumberFormat('es-CR', {
      style: 'currency',
      currency: 'USD',
    }).format(Math.abs(n));
    return sign === 'positive' ? `+${fmt}` : `-${fmt}`;
  }

  summaryNameCell(
    item: ServiceSummaryLine,
    kind: 'room' | 'activity' | 'vehicle',
    group: 'all' | 'original' | 'deleted' | 'new',
  ): { text: string; route: string[] | null; queryParams: Record<string, string> | null } {
    const key = `${group}:${kind}:${item.name}`;
    const m = this.summaryLineMeta().get(key);
    return {
      text: item.name,
      route: m?.route ?? null,
      queryParams: m?.queryParams ?? null,
    };
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
  fieldStyleClass(control: AbstractControl | null | undefined): string {
    return fieldStyleClass(control);
  }

  private rejectInvalidForm(form: FormGroup, labels: Record<string, string>): boolean {
    const errors = validateForm(form, labels);
    if (errors.length) {
      warnInvalidForm(this.messageService, errors);
      return true;
    }
    return false;
  }

  vehicleName(v: any): string {
    return v?.name ?? '';
  }
  submitVehicle() {
    const startDate = new Date(this.vehicleForm.value.start_date);
    const endDate = new Date(this.vehicleForm.value.end_date);
    if (
      this.vehicleForm.value.start_date &&
      this.vehicleForm.value.end_date &&
      endDate < startDate
    ) {
      this.vehicleForm.get('end_date')?.setErrors({ dateRangeEnd: true });
    }
    if (this.rejectInvalidForm(this.vehicleForm, VEHICLE_FORM_LABELS)) return;

    const q = this.quotation()!;
    const version = this.selectedVersion()!;
    const vehicle = this.vehicleForm.value.vehicle;
  
    // Generar array de fechas del rango
    const dates: string[] = [];
    const current = new Date(startDate);
    while (current <= endDate) {
      dates.push(this.toLocalIsoDate(current));
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
          this.refreshLines();
        },
        error: (err) => {
          this.saving.set(false);
          this.messageService.add({
            severity: 'error',
            summary: apiErrorSummary(err, 'Error al agregar vehículo'),
          });
        }
      });
    });
  }

  submitRoom() {
    const val = this.roomForm.value;
    const startDate = val.start_date ? new Date(val.start_date) : null;
    const endDate = val.end_date ? new Date(val.end_date) : null;
    if (startDate && endDate && endDate <= startDate) {
      this.roomForm.get('end_date')?.setErrors({ dateRangeRoom: true });
    }
    if (this.rejectInvalidForm(this.roomForm, ROOM_FORM_LABELS)) return;
    if (!startDate || !endDate) return;

    const q = this.quotation()!;
    const version = this.selectedVersion()!;

    this.saving.set(true);

    // Noches: [start, end)
    const dates: string[] = [];
    const current = new Date(startDate);
    while (current < endDate) {
      dates.push(this.toLocalIsoDate(current));
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
          this.refreshLines();
        },
        error: (err) => {
          this.saving.set(false);
          this.messageService.add({
            severity: 'error',
            summary: apiErrorSummary(err, 'Error al agregar habitación'),
          });
        },
      });
    });
  }

  submitActivity() {
    if (this.rejectInvalidForm(this.activityForm, ACTIVITY_FORM_LABELS)) return;
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
        this.refreshLines();
      },
      error: (err) => {
        this.saving.set(false);
        this.messageService.add({
          severity: 'error',
          summary: apiErrorSummary(err, 'Error al agregar actividad'),
        });
      }
    });
  }

  // ─── Nueva versión ─────────────────────────────────────────

  openNewVersionDialog() {
    const v = this.selectedVersion();
    const parentLabel = v
      ? formatQuotationVersionLabel(v.version_number, { current: false })
      : null;
    this.versionForm.reset({ notes: parentLabel ? `Copiada de: ${parentLabel}` : '' });
    this.showNewVersion.set(true);
  }

  submitNewVersion() {
    const q = this.quotation()!;
    const sourceVersionId = this.selectedVersionId() ?? undefined;
    this.saving.set(true);
    this.quotationService.createVersion(q.id, this.versionForm.value.notes, sourceVersionId).subscribe({
      next: (v) => {
        this.showNewVersion.set(false);
        this.selectedVersionId.set(v.id);
        this.recalculateVersion(q.id, v.id, {
          repriceInherited: false,
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

  confirmDeleteSelectedVersion(): void {
    const q = this.quotation();
    const version = this.selectedVersion();
    if (!q || !version) return;
    if ((q.versions?.length ?? 0) <= 1) {
      this.messageService.add({
        severity: 'warn',
        summary: 'No se puede eliminar la única versión',
      });
      return;
    }
    this.confirmationService.confirm({
      message: `¿Eliminar la versión V${version.version_number}? Esta acción no se puede deshacer.`,
      header: 'Eliminar versión',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.deleteSelectedVersion(),
    });
  }

  private deleteSelectedVersion(): void {
    const q = this.quotation();
    const version = this.selectedVersion();
    if (!q || !version) return;
    this.saving.set(true);
    this.quotationService.deleteVersion(q.id, version.id).subscribe({
      next: () => {
        this.saving.set(false);
        this.messageService.add({
          severity: 'success',
          summary: `Versión V${version.version_number} eliminada`,
        });
        this.load(q.id);
      },
      error: (err) => {
        this.saving.set(false);
        this.messageService.add({
          severity: 'error',
          summary: err.error?.detail ?? 'No se pudo eliminar la versión',
        });
      },
    });
  }

  // ─── Recalcular total ──────────────────────────────────────

  recalculate() {
    const q = this.quotation()!;
    const version = this.selectedVersion()!;
    this.recalculateVersion(q.id, version.id, {
      successMessage: 'Precios actualizados desde el catálogo',
      onDone: () => this.load(q.id),
    });
  }

  private recalculateVersion(
    quotationId: string,
    versionId: string,
    options?: {
      repriceInherited?: boolean;
      successMessage?: string;
      onDone?: () => void;
      onError?: () => void;
    }
  ) {
    this.quotationService
      .recalculate(quotationId, versionId, {
        reprice_inherited: options?.repriceInherited ?? true,
      })
      .subscribe({
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
    return formatQuotationVersionLabel(v.version_number, { current: v.is_current });
  }

  /** Opciones del selector de versión: orden descendente (Modif N…, Programme). */
  get versionSelectOptions() {
    const q = this.quotation();
    if (!q?.versions?.length) return [];
    return [...q.versions]
      .filter((v) => !(v as QuotationVersion & { deleted?: boolean }).deleted)
      .sort((a, b) => b.version_number - a.version_number)
      .map((v) => ({
        value: v.id,
        label: formatQuotationVersionLabel(v.version_number, { current: v.is_current }),
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
      this.loadFileAA(q.id);
      return;
    }

    this.quotationService.getVersionLines(q.id, String(normalizedId)).subscribe({
      next: (resp) => {
        const arr = Array.isArray(resp) ? resp : (resp as any)?.lines ?? [];
        this.lines.set(this.sortLinesByDate(arr));
        this.loadSummary();
        this.loadFileAA(q.id);
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
      source: q.contact_source ?? null,
      budget: q.contact_budget ?? null,
      traveller_type: q.contact_traveller_type ?? null,
      ritm: q.contact_ritm ?? null,
    });
    this.showEdit.set(true);
  }

  submitEdit() {
    if (this.rejectInvalidForm(this.editForm, EDIT_FORM_LABELS)) return;
    const q = this.quotation()!;
    const raw = this.editForm.value;
    const body: Record<string, unknown> = {
      name: raw.name,
      notes: raw.notes || null,
      from_date: raw.from_date ? (raw.from_date instanceof Date ? this.toLocalIsoDate(raw.from_date) : raw.from_date) : null,
      to_date: raw.to_date ? (raw.to_date instanceof Date ? this.toLocalIsoDate(raw.to_date) : raw.to_date) : null,
      arrival_date: raw.arrival_date ? (raw.arrival_date instanceof Date ? this.toLocalIsoDate(raw.arrival_date) : raw.arrival_date) : null,
      departure_date: raw.departure_date ? (raw.departure_date instanceof Date ? this.toLocalIsoDate(raw.departure_date) : raw.departure_date) : null,
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

    const contactBody: Record<string, unknown> = {
      source: raw.source ?? null,
      budget: raw.budget ?? null,
      traveller_type: raw.traveller_type ?? null,
      ritm: raw.ritm ?? null,
    };

    const finalize = () => {
      this.showEdit.set(false);
      this.saving.set(false);
      this.messageService.add({ severity: 'success', summary: 'Cotización actualizada' });
      this.load(q.id);
    };

    this.quotationService.update(q.id, body as any).subscribe({
      next: () => {
        if (q.contact_id) {
          this.contactService.update(q.contact_id, contactBody as any).subscribe({
            next: () => finalize(),
            error: (err) => {
              this.saving.set(false);
              this.messageService.add({
                severity: 'error',
                summary: apiErrorSummary(err, 'Error al actualizar datos del contacto'),
              });
              this.load(q.id);
            },
          });
        } else {
          finalize();
        }
      },
      error: (err) => {
        this.saving.set(false);
        this.messageService.add({
          severity: 'error',
          summary: apiErrorSummary(err, 'Error al guardar'),
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
        label: 'Actualizar precios',
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

  /**
   * Normaliza un valor del datepicker a mediodía local.
   * Evita desfases al parsear cadenas ISO (`YYYY-MM-DD` = UTC) en zonas distintas.
   */
  private coerceLocalCalendarDate(value: unknown): Date | null {
    if (value == null || value === '') return null;
    if (value instanceof Date) {
      if (Number.isNaN(value.getTime())) return null;
      return new Date(value.getFullYear(), value.getMonth(), value.getDate(), 12, 0, 0, 0);
    }
    if (typeof value === 'string') {
      const iso = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (iso) {
        return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]), 12, 0, 0, 0);
      }
      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) return null;
      return new Date(
        parsed.getFullYear(),
        parsed.getMonth(),
        parsed.getDate(),
        12,
        0,
        0,
        0,
      );
    }
    return null;
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

  dropFichaDetailRow(event: CdkDragDrop<FileAADetailRow[]>, ficha: FileAAWithDetails): void {
    if (event.previousIndex === event.currentIndex) return;
    const previousVisible = [...this.fichaVisibleDetailsList()];
    const previousDetails = [...(ficha.details ?? [])];

    const reorderedVisible = this.fichaVisibleOrderAfterDrop(event, previousVisible);
    const details = this.buildFichaDetailsOrder(ficha, reorderedVisible);
    this.applyFichaDetailReorder(ficha, reorderedVisible, details);
    this.scheduleFichaDetailDragBodyRemount();
    this.fichaDetailReorderSaving.set(true);
    this.quotationService
      .reorderFileAADetails(ficha.id, { detail_ids_in_order: details.map((d) => d.id) })
      .subscribe({
        next: (updated) => {
          this.fichaFileAA.set(updated);
          this.syncFichaVisibleDetailsList();
          this.scheduleFichaDetailDragBodyRemount();
          this.fichaDetailReorderSaving.set(false);
        },
        error: (err) => {
          this.applyFichaDetailReorder(ficha, previousVisible, previousDetails);
          this.scheduleFichaDetailDragBodyRemount();
          this.fichaDetailReorderSaving.set(false);
          this.messageService.add({
            severity: 'error',
            summary:
              typeof err.error?.detail === 'string'
                ? err.error.detail
                : 'No se pudo guardar el orden de la ficha',
          });
        },
      });
  }

  private fichaActivityMergedIntoHotel(d: FileAADetailRow): boolean {
    const raw = d.observation_extras?.['merged_into_hotel_detail_id'];
    return raw !== null && raw !== undefined && String(raw).trim().length > 0;
  }

  canFichaCombineActivity(d: FileAADetailRow): boolean {
    return (
      d.category === 'activity' &&
      d.row_status !== 'red' &&
      !this.fichaActivityMergedIntoHotel(d)
    );
  }

  fichaCombineHotelOptions(): { id: string; label: string }[] {
    const f = this.fichaFileAA();
    if (!f) return [];
    return (f.details ?? [])
      .filter(
        (row) =>
          row.category === 'room' &&
          row.row_status !== 'red' &&
          fichaAaDetailVisibleInTable(row),
      )
      .map((row) => ({
        id: row.id,
        label: this.stripHtml(
          this.fichaDetailServiceLines(row).join(' · ') || row.name || 'Hotel',
        ),
      }));
  }

  openFichaCombineDialog(activity: FileAADetailRow): void {
    if (!this.canFichaCombineActivity(activity)) return;
    this.fichaCombineActivityRow.set(activity);
    this.fichaCombineSelectedHotelId.set(null);
    this.showFichaCombineDialog.set(true);
  }

  onFichaCombineDialogHide(): void {
    this.fichaCombineActivityRow.set(null);
    this.fichaCombineSelectedHotelId.set(null);
  }

  submitFichaCombine(): void {
    const activity = this.fichaCombineActivityRow();
    const hotelId = this.fichaCombineSelectedHotelId();
    if (!activity || !hotelId) return;
    const hotel = this.fichaFileAA()?.details?.find((row) => row.id === hotelId);
    if (!hotel || hotel.category !== 'room') return;
    this.showFichaCombineDialog.set(false);
    this.confirmAttachActivityToHotel(activity, hotel);
  }

  fichaCombineActivityLabel(): string {
    const activity = this.fichaCombineActivityRow();
    if (!activity) return '';
    return this.stripHtml(
      this.fichaDetailServiceLines(activity)[0] || activity.name || 'Actividad',
    );
  }

  private confirmAttachActivityToHotel(
    activity: FileAADetailRow,
    hotel: FileAADetailRow,
  ): void {
    const actLabel = this.stripHtml(this.fichaDetailServiceLines(activity)[0] || activity.name || 'Actividad');
    const hotelLines = this.fichaDetailServiceLines(hotel);
    const hotelLabel = this.stripHtml(hotelLines[0] || hotel.name || 'Hotel');
    this.confirmationService.confirm({
      message: `¿Desea añadir la actividad «${actLabel}» al hotel «${hotelLabel}»? Se agregará a las observaciones del hotel con su fecha, se sumará al precio sistema del hotel y la actividad dejará de mostrarse en la tabla (en Word/PDF seguirá en línea aparte con Net «---»).`,
      header: 'Incorporar actividad al hotel',
      icon: 'pi pi-question-circle',
      acceptLabel: 'Sí, añadir',
      rejectLabel: 'Cancelar',
      reject: () => this.scheduleFichaDetailDragBodyRemount(),
      accept: () => {
        this.fichaDetailReorderSaving.set(true);
        this.quotationService.attachActivityToHotel(hotel.id, activity.id).subscribe({
          next: (updated) => {
            this.fichaFileAA.set(updated);
            this.syncFichaVisibleDetailsList();
            delete this.hotelFichaObsDraft[hotel.id];
            this.scheduleFichaDetailDragBodyRemount();
            this.fichaDetailReorderSaving.set(false);
            this.messageService.add({
              severity: 'success',
              summary: 'Actividad incorporada al hotel',
            });
          },
          error: (err) => {
            this.scheduleFichaDetailDragBodyRemount();
            this.fichaDetailReorderSaving.set(false);
            const d = err.error?.detail;
            this.messageService.add({
              severity: 'error',
              summary:
                typeof d === 'string' ? d : 'No se pudo incorporar la actividad al hotel',
            });
          },
        });
      },
    });
  }

  fichaHotelAttachedActivityIds(hotel: FileAADetailRow): string[] {
    const raw = hotel.observation_extras?.['attached_activity_detail_ids'];
    if (!Array.isArray(raw)) return [];
    return raw.map((id) => String(id)).filter((id) => id.trim().length > 0);
  }

  /** Suma precio sistema de actividades fusionadas en esta fila hotel. */
  fichaHotelAttachedActivitiesTotal(hotel: FileAADetailRow): number {
    const ids = this.fichaHotelAttachedActivityIds(hotel);
    if (!ids.length) return 0;
    const ficha = this.fichaFileAA();
    if (!ficha) return 0;
    let sum = 0;
    for (const id of ids) {
      const act = ficha.details.find((r) => r.id === id);
      if (act) {
        const n = Number(act.total_price ?? 0);
        if (Number.isFinite(n)) sum += n;
      }
    }
    return sum;
  }

  canFichaDetachFromHotel(hotel: FileAADetailRow): boolean {
    return (
      hotel.category === 'room' &&
      hotel.row_status !== 'red' &&
      this.fichaHotelAttachedActivityIds(hotel).length > 0
    );
  }

  fichaHotelAttachedActivityOptions(hotel: FileAADetailRow): { id: string; label: string }[] {
    const f = this.fichaFileAA();
    if (!f) return [];
    const attachedIds = new Set(this.fichaHotelAttachedActivityIds(hotel));
    return (f.details ?? [])
      .filter((row) => row.category === 'activity' && attachedIds.has(row.id))
      .map((row) => ({
        id: row.id,
        label: this.stripHtml(
          this.fichaDetailServiceLines(row).join(' · ') || row.name || 'Actividad',
        ),
      }));
  }

  onFichaDetachClick(hotel: FileAADetailRow): void {
    if (!this.canFichaDetachFromHotel(hotel)) return;
    const options = this.fichaHotelAttachedActivityOptions(hotel);
    if (options.length === 0) return;
    if (options.length === 1) {
      const activity = this.fichaFileAA()?.details?.find((row) => row.id === options[0].id);
      if (activity) this.confirmDetachActivityFromHotel(hotel, activity);
      return;
    }
    this.fichaDetachHotelRow.set(hotel);
    this.fichaDetachSelectedActivityId.set(null);
    this.showFichaDetachDialog.set(true);
  }

  onFichaDetachDialogHide(): void {
    this.fichaDetachHotelRow.set(null);
    this.fichaDetachSelectedActivityId.set(null);
  }

  submitFichaDetach(): void {
    const hotel = this.fichaDetachHotelRow();
    const activityId = this.fichaDetachSelectedActivityId();
    if (!hotel || !activityId) return;
    const activity = this.fichaFileAA()?.details?.find((row) => row.id === activityId);
    if (!activity) return;
    this.showFichaDetachDialog.set(false);
    this.confirmDetachActivityFromHotel(hotel, activity);
  }

  fichaDetachHotelLabel(): string {
    const hotel = this.fichaDetachHotelRow();
    if (!hotel) return '';
    return this.stripHtml(
      this.fichaDetailServiceLines(hotel).join(' · ') || hotel.name || 'Hotel',
    );
  }

  private confirmDetachActivityFromHotel(
    hotel: FileAADetailRow,
    activity: FileAADetailRow,
  ): void {
    const actLabel = this.stripHtml(
      this.fichaDetailServiceLines(activity)[0] || activity.name || 'Actividad',
    );
    const hotelLabel = this.stripHtml(
      this.fichaDetailServiceLines(hotel)[0] || hotel.name || 'Hotel',
    );
    this.confirmationService.confirm({
      message: `¿Desea descombinar la actividad «${actLabel}» del hotel «${hotelLabel}»? Se quitará de las observaciones del hotel, se restará del precio sistema y la actividad volverá a mostrarse en la tabla con su importe Net en Word/PDF.`,
      header: 'Descombinar actividad del hotel',
      icon: 'pi pi-question-circle',
      acceptLabel: 'Sí, descombinar',
      rejectLabel: 'Cancelar',
      reject: () => this.scheduleFichaDetailDragBodyRemount(),
      accept: () => {
        this.fichaDetailReorderSaving.set(true);
        this.quotationService.detachActivityFromHotel(hotel.id, activity.id).subscribe({
          next: (updated) => {
            this.fichaFileAA.set(updated);
            this.syncFichaVisibleDetailsList();
            delete this.hotelFichaObsDraft[hotel.id];
            this.scheduleFichaDetailDragBodyRemount();
            this.fichaDetailReorderSaving.set(false);
            this.messageService.add({
              severity: 'success',
              summary: 'Actividad descombinada del hotel',
            });
          },
          error: (err) => {
            this.scheduleFichaDetailDragBodyRemount();
            this.fichaDetailReorderSaving.set(false);
            const d = err.error?.detail;
            this.messageService.add({
              severity: 'error',
              summary:
                typeof d === 'string' ? d : 'No se pudo descombinar la actividad del hotel',
            });
          },
        });
      },
    });
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

  /**
   * Líneas de la columna «Service» ya formateadas con las MISMAS reglas
   * que aplican al export Word/PDF. Las calcula el backend en el
   * `computed_field` `display_service_lines` de `FileAADetailResponse`
   * (ver `app.services.ficha_aa_word.ficha_detail_service_lines`).
   *
   * Convenciones:
   *   - room    → `[hotelLine, roomLine]` (o solo `[hotelLine]` si no
   *               aplica el split en dos partes).
   *   - vehicle → `[svcLine]` con sufijo `(N jour[s])`.
   *   - activity / otro → `[svcLine]`.
   *
   * Fallback razonable cuando el backend no devolvió el campo (p. ej.
   * cliente o cache antiguos): se usa `d.name` tal cual.
   */
  fichaDetailServiceLines(d: FileAADetailRow): string[] {
    const lines = (d.display_service_lines ?? []).filter(
      (s): s is string => typeof s === 'string' && s.trim().length > 0,
    );
    return lines.length > 0 ? lines : [(d.name ?? '').trim()];
  }

  fichaVisibleDetails(ficha: FileAAWithDetails): FileAADetailRow[] {
    return (ficha.details ?? []).filter((d) => fichaAaDetailVisibleInTable(d));
  }

  /**
   * Orden tras soltar. En `<table>` el CDK a veces desvía `previousIndex`; la fila
   * movida se identifica por `event.item.data` y el desplazamiento por delta de índices.
   */
  private fichaVisibleOrderAfterDrop(
    event: CdkDragDrop<FileAADetailRow[]>,
    beforeDrop: FileAADetailRow[],
  ): FileAADetailRow[] {
    const moved = event.item.data as FileAADetailRow;
    const fromIndex = beforeDrop.findIndex((d) => d.id === moved.id);
    if (fromIndex < 0) {
      const fallback = [...beforeDrop];
      moveItemInArray(fallback, event.previousIndex, event.currentIndex);
      return fallback;
    }
    const delta = event.currentIndex - event.previousIndex;
    let toIndex = fromIndex + delta;
    toIndex = Math.max(0, Math.min(toIndex, beforeDrop.length - 1));
    const next = [...beforeDrop];
    const [row] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, row);
    return next;
  }

  /** Destruye y recrea el tbody con cdkDropList para alinear DOM y señales. */
  private scheduleFichaDetailDragBodyRemount(): void {
    queueMicrotask(() => this.fichaDetailDragBodyKey.update((k) => k + 1));
  }

  /** Orden completo para API: visibles en el orden de la tabla + fusionadas al final. */
  private buildFichaDetailsOrder(
    ficha: FileAAWithDetails,
    reorderedVisible: FileAADetailRow[],
  ): FileAADetailRow[] {
    const hidden = (ficha.details ?? []).filter((d) => !fichaAaDetailVisibleInTable(d));
    return [...reorderedVisible, ...hidden];
  }

  /** Actualiza lista visible y `details` tras reordenar (evita desfase CDK vs modelo). */
  private applyFichaDetailReorder(
    ficha: FileAAWithDetails,
    reorderedVisible: FileAADetailRow[],
    detailsOverride?: FileAADetailRow[],
  ): void {
    this.fichaVisibleDetailsList.set([...reorderedVisible]);
    const details = detailsOverride ?? this.buildFichaDetailsOrder(ficha, reorderedVisible);
    this.fichaFileAA.set({ ...ficha, details: [...details] });
  }

  /** Sincroniza la lista que renderiza el tbody. */
  private syncFichaVisibleDetailsList(): void {
    const f = this.fichaFileAA();
    this.fichaVisibleDetailsList.set(f ? this.fichaVisibleDetails(f) : []);
  }

  private loadFichaAaColWidths(): void {
    try {
      const rawV2 = localStorage.getItem(FICHA_AA_COL_SETTINGS_STORAGE_KEY);
      if (rawV2) {
        const parsed = JSON.parse(rawV2) as {
          widths?: Partial<Record<FichaAaColumnKey, number>>;
          visible?: Partial<Record<FichaAaColumnKey, boolean>>;
        };
        const nextWidths = { ...FICHA_AA_DEFAULT_COL_WIDTHS };
        for (const col of FICHA_AA_COLUMN_DEFS) {
          const w = parsed.widths?.[col.key];
          if (typeof w === 'number' && Number.isFinite(w) && w >= FICHA_AA_MIN_COL_WIDTHS[col.key]) {
            nextWidths[col.key] = Math.round(w);
          }
        }
        this.fichaAaColWidths.set(nextWidths);
        if (parsed.visible && typeof parsed.visible === 'object') {
          this.fichaAaColVisible.set({ ...parsed.visible });
        }
        return;
      }
      const rawV1 = localStorage.getItem(FICHA_AA_COL_WIDTHS_STORAGE_KEY_V1);
      if (!rawV1) return;
      const parsedV1 = JSON.parse(rawV1) as Partial<Record<FichaAaColumnKey, number>>;
      const next = { ...FICHA_AA_DEFAULT_COL_WIDTHS };
      for (const col of FICHA_AA_COLUMN_DEFS) {
        const w = parsedV1[col.key];
        if (typeof w === 'number' && Number.isFinite(w) && w >= FICHA_AA_MIN_COL_WIDTHS[col.key]) {
          next[col.key] = Math.round(w);
        }
      }
      this.fichaAaColWidths.set(next);
    } catch {
      /* ignore corrupt storage */
    }
  }

  private persistFichaAaColWidths(): void {
    try {
      localStorage.setItem(
        FICHA_AA_COL_SETTINGS_STORAGE_KEY,
        JSON.stringify({
          widths: this.fichaAaColWidths(),
          visible: this.fichaAaColVisible(),
        }),
      );
    } catch {
      /* ignore quota / private mode */
    }
  }

  fichaAaColWidth(key: FichaAaColumnKey): number {
    return this.fichaAaColWidths()[key];
  }

  fichaAaColumnVisible(key: FichaAaColumnKey): boolean {
    return this.fichaAaColVisible()[key] !== false;
  }

  setFichaAaColumnVisible(key: FichaAaColumnKey, visible: boolean): void {
    const def = FICHA_AA_COLUMN_DEFS.find((c) => c.key === key);
    if (!def?.hideable) return;
    if (!visible) {
      const othersVisible = FICHA_AA_COLUMN_DEFS.filter(
        (c) => c.key !== key && this.fichaAaColumnVisible(c.key),
      ).length;
      if (othersVisible === 0) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Columnas',
          detail: 'Debe permanecer visible al menos una columna.',
        });
        return;
      }
    }
    this.fichaAaColVisible.update((state) => ({ ...state, [key]: visible }));
    this.persistFichaAaColWidths();
  }

  resetFichaAaColumnLayout(): void {
    this.fichaAaColWidths.set({ ...FICHA_AA_DEFAULT_COL_WIDTHS });
    this.fichaAaColVisible.set({});
    this.persistFichaAaColWidths();
    this.messageService.add({
      severity: 'success',
      summary: 'Columnas',
      detail: 'Anchos y visibilidad restaurados.',
    });
  }

  startFichaAaColResize(event: MouseEvent, key: FichaAaColumnKey): void {
    event.preventDefault();
    event.stopPropagation();
    this.fichaAaColResize = {
      key,
      startX: event.clientX,
      startWidth: this.fichaAaColWidths()[key],
    };
    this.fichaAaColResizing.set(true);
    const onMove = (e: MouseEvent) => this.onFichaAaColResizeMove(e);
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      this.fichaAaColResizing.set(false);
      this.fichaAaColResize = null;
      this.persistFichaAaColWidths();
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  private onFichaAaColResizeMove(event: MouseEvent): void {
    const state = this.fichaAaColResize;
    if (!state) return;
    const delta = event.clientX - state.startX;
    const next = Math.max(
      FICHA_AA_MIN_COL_WIDTHS[state.key],
      Math.round(state.startWidth + delta),
    );
    this.fichaAaColWidths.update((widths) => ({ ...widths, [state.key]: next }));
  }

  fichaVehicleCategory(d: FileAADetailRow): string | null {
    return vehicleCategoryFromExtras(d.observation_extras);
  }

  fichaVehicleServiceLayout(d: FileAADetailRow): VehicleFichaServiceLayout {
    return vehicleFichaServiceLayout(this.fichaVehicleCategory(d), d.name ?? '');
  }

  fichaVehicleDatesLayout(d: FileAADetailRow): VehicleFichaDatesLayout {
    return vehicleFichaDatesLayout(this.fichaVehicleCategory(d), d.name ?? '');
  }

  fichaVehicleBrand(d: FileAADetailRow): string {
    return vehicleBrandFromExtras(d.observation_extras);
  }

  fichaVueloInternoServiceLabel(d: FileAADetailRow): string {
    return vueloInternoServiceLabel(d.observation_extras, d.name ?? '');
  }

  fichaBotePublicoServiceLabel(d: FileAADetailRow): string {
    return botePublicoServiceLabel(d.observation_extras, d.name ?? '');
  }

  fichaTransferZonaZonaServiceLabel(d: FileAADetailRow): string {
    return transferZonaZonaServiceLabel(d.observation_extras, d.name ?? '');
  }

  fichaRentalServiceLabel(d: FileAADetailRow): string {
    return rentalVehicleServiceLabel(d.observation_extras, d.name ?? '');
  }

  fichaTaxiMaritimoServiceLabel(d: FileAADetailRow): string {
    return taxiMaritimoServiceLabel(
      d.observation_extras,
      d.name ?? '',
      this.fichaVehicleBrand(d),
    );
  }

  fichaTaxiMaritimoRoute(d: FileAADetailRow): TaxiMaritimoRouteParts {
    return parseTaxiMaritimoRoute(this.fichaTaxiMaritimoServiceLabel(d));
  }

  /** Filas visibles en los textareas Interbus (lugares + fechas alineados). */
  fichaInterbusLineRows(d: FileAADetailRow): number {
    const places = this.ensureVehicleServiceSubtitleDraft(d);
    const fechas = this.ensureVehicleFichaObsDraft(d).ficha_interbus_fechas ?? '';
    const n = Math.max(
      places.split('\n').length,
      fechas.split('\n').length,
      2,
    );
    return Math.min(n, 12);
  }

  fichaVehicleAllowsSubtitle(d: FileAADetailRow): boolean {
    return vehicleFichaAllowsSubtitle(this.fichaVehicleCategory(d), d.name ?? '');
  }

  /**
   * Divide la línea de servicio de un vehículo en `{ main, suffix }`,
   * donde `suffix` es el bloque ` (N jour[s])` que en el export Word/PDF
   * va en negrita. Si no hay sufijo, `suffix` queda vacío.
   */
  fichaSplitVehicleJoursSuffix(line: string): { main: string; suffix: string } {
    const m = /^(.*?)(\s*\(\s*\d+\s+jours?\s*\))\s*$/i.exec(line ?? '');
    if (!m) return { main: (line ?? '').trim(), suffix: '' };
    return { main: m[1].trim(), suffix: m[2].trim() };
  }

  /**
   * Divide la línea de servicio de una actividad en `{ main, time }`,
   * donde `time` es el sufijo ``", XhMM"`` (formato producido por el
   * backend desde `observation_extras.ficha_horario`). Puede ir prefijo
   * ``Proveedor - `` delante del nombre. En el HTML, el fragmento de
   * hora se renderiza en rojo oscuro para que coincida con el render
   * Word/PDF. Si no hay hora, `time` queda vacío y la línea se imprime
   * tal cual.
   */
  fichaSplitActivityTimeSuffix(line: string): { main: string; time: string } {
    let stripped = (line ?? '').trim();
    const provSep = stripped.indexOf(' - ');
    if (provSep >= 0) stripped = stripped.slice(provSep + 3).trim();
    const m = /^(.*?),\s*(\d{1,2}h\d{2})\s*$/i.exec(stripped);
    if (!m) return { main: stripped, time: '' };
    return { main: m[1].trim(), time: m[2].trim() };
  }

  fichaNameEditKeyFor(detailId: string, target: string): string {
    return `${detailId}|${target}`;
  }

  isFichaNameEditing(detailId: string, target: string): boolean {
    return this.fichaNameEditKey() === this.fichaNameEditKeyFor(detailId, target);
  }

  fichaNameEditActiveOnRow(detailId: string): boolean {
    const key = this.fichaNameEditKey();
    return !!key && key.startsWith(`${detailId}|`);
  }

  /** Partes «1 bung … et 1 std …» alineadas con ``display_service_lines[1]``. */
  fichaMergedRoomTypeLineParts(d: FileAADetailRow): string[] {
    const line = (this.fichaDetailServiceLines(d)[1] ?? '').trim();
    if (!line) return [];
    return line.split(' et ').map((p) => p.trim()).filter((p) => p.length > 0);
  }

  fichaMergedRoomPartLabel(slot: FichaMergedRoomSlot, includeQuantity: boolean): string {
    const tipo = (slot.room_file_aa_name ?? '').trim();
    if (!tipo) return '';
    if (!includeQuantity) return tipo;
    const qty = slot.room_quantity;
    if (qty === null || qty === undefined || !Number.isFinite(qty) || qty < 1) {
      return tipo;
    }
    return `${qty} ${tipo}`;
  }

  /** ``file_aa_name`` de catálogo para edición inline (sin formato export Word/PDF). */
  fichaRoomFileAaNameForEdit(d: FileAADetailRow, target: string): string {
    const normalize = (value: string): string => {
      const s = value.trim();
      if (!s) return '';
      const slash = s.indexOf('/');
      if (slash >= 0) return s.slice(0, slash).trim();
      const paren = s.indexOf('(');
      if (paren >= 0) return s.slice(0, paren).trim();
      return s;
    };
    const extras = d.observation_extras as Record<string, unknown> | null | undefined;
    if (target.startsWith('room:')) {
      const index = Number(target.slice('room:'.length));
      const slot = this.fichaMergedRoomsFromExtras(d)[index];
      return normalize(slot?.room_file_aa_name ?? '');
    }
    const merged = this.fichaMergedRoomsFromExtras(d);
    if (merged.length === 1) {
      return normalize(merged[0].room_file_aa_name ?? '');
    }
    return normalize(String(extras?.['room_file_aa_name'] ?? ''));
  }

  /** Partes de tipología con color (heredada vs reemplazo). */
  fichaMergedRoomTypeParts(d: FileAADetailRow): { text: string; isReplacement: boolean }[] {
    const rooms = this.fichaMergedRoomsFromExtras(d);
    if (!rooms.length) {
      return this.fichaMergedRoomTypeLineParts(d).map((text) => ({
        text,
        isReplacement: false,
      }));
    }
    const includeQty = rooms.length > 1;
    return rooms.map((slot) => ({
      text: this.fichaMergedRoomPartLabel(slot, includeQty),
      isReplacement: Boolean(slot.is_replacement),
    }));
  }

  fichaHotelAttachedActivityDisplay(
    hotel: FileAADetailRow,
  ): { detailId: string; line: string; main: string; time: string }[] {
    const ids = this.fichaHotelAttachedActivityIds(hotel);
    const lines = this.fichaDetailServiceLines(hotel).slice(2);
    return ids.map((detailId, index) => {
      const line = lines[index] ?? '';
      const parts = this.fichaSplitActivityTimeSuffix(line);
      return { detailId, line, ...parts };
    });
  }

  fichaAttachedActivityRow(detailId: string): FileAADetailRow | undefined {
    return this.fichaFileAA()?.details?.find((row) => row.id === detailId);
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

  /** Adultos / niños / gratuitos en actividad (esquina de la tarjeta en agenda). */
  activityPaxLine(act: QuotationLine['activities'][number]): string {
    return `${act.adults}A · ${act.children}N · ${act.free ?? 0}G`;
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
            let s = `${this.stripHtml(a.name)} (${a.adults}A ${a.children}N ${a.free ?? 0}G)`;
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
            this.loadSummary();
            this.refreshQuotationMetadata();
          },
        });
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
    if (this.rejectInvalidForm(this.shiftItineraryForm, SHIFT_ITINERARY_LABELS)) return;
    const q = this.quotation()!;
    const version = this.selectedVersion()!;
    const d = this.coerceLocalCalendarDate(this.shiftItineraryForm.value.new_first_date);
    if (!d) return;
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
          summary: apiErrorSummary(err, 'Error al desplazar fechas'),
        });
      },
    });
  }

  submitExtendCalendar() {
    const raw = this.calendarForm.value;
    const fromD = this.coerceLocalCalendarDate(raw.from_date);
    const toD = this.coerceLocalCalendarDate(raw.to_date);
    if (fromD && toD && toD < fromD) {
      this.calendarForm.get('to_date')?.setErrors({ dateRangeEnd: true });
    }
    if (this.rejectInvalidForm(this.calendarForm, CALENDAR_FORM_LABELS)) return;
    if (!fromD || !toD) return;

    const q = this.quotation()!;
    const version = this.selectedVersion()!;
    const from_date = this.toLocalIsoDate(fromD);
    const to_date = this.toLocalIsoDate(toD);
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
        this.refreshLines();
        this.refreshQuotationMetadata();
      },
      error: (err) => {
        this.saving.set(false);
        this.messageService.add({
          severity: 'error',
          summary: apiErrorSummary(err, 'Error al ampliar fechas'),
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
    if (value === 'ficha' || value === 'config') {
      this.fichaAATab.set(value);
      this.syncFichaTabToRoute(value);
    }
  }

  onFichaChecklistChange(): void {
    this.syncFichaChecklistToFicha();
  }

  onFichaDisabilityToggle(checked: boolean): void {
    if (!checked) this.fichaDisabilityInfo.set('');
    this.syncFichaChecklistToFicha();
  }

  /** Persiste checklist en `FileAA.observations` y lo quita de filas de detalle. */
  private syncFichaChecklistToFicha(): void {
    const ficha = this.fichaFileAA();
    if (ficha) this.applyChecklistToFicha(ficha);
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

  // ─── Resumen estilo «header del Word/PDF» (en francés) ──────────────
  // Estos helpers replican la lógica del header del documento exportado
  // (Word y PDF) para mostrar la misma información en la celda
  // `ficha-aa-table-summary-cell` del frontend, con colores que imitan los
  // del export: rojo para vuelos/noches/fecha límite y verde oscuro para
  // «Voiture de Location».

  /** Nombre exportado: corta todo lo que va después del primer `/`. */
  fichaExportDisplayNameFr(name: string | null | undefined): string {
    const raw = (name ?? '').trim();
    if (!raw) return '';
    const idx = raw.indexOf('/');
    return idx >= 0 ? raw.slice(0, idx).trim() : raw;
  }

  /**
   * Nombre para el **título** de la Ficha AA en el header (replica
   * `ficha_aa_export_title_name` del backend): aplica primero el
   * recorte por `/` y, si el resultado tiene exactamente dos palabras
   * separadas por espacios (típico `Apellido Nombre`), las invierte
   * (`Nombre Apellido`). Cualquier otro caso se devuelve sin tocar.
   */
  fichaExportTitleNameFr(name: string | null | undefined): string {
    const base = this.fichaExportDisplayNameFr(name);
    const parts = base.split(/\s+/).filter((p) => p.length > 0);
    if (parts.length === 2) return `${parts[1]} ${parts[0]}`;
    return base;
  }

  fichaVersionLabel(ficha: FileAAWithDetails, q: QuotationFull): string {
    const vid = ficha.version_id;
    let vn: number | null = null;
    if (vid && q.versions?.length) {
      const found = q.versions.find((v) => v.id === vid);
      if (found) vn = found.version_number;
    }
    if (vn == null) {
      vn = q.versions?.find((v) => v.is_current)?.version_number ?? null;
    }
    if (vn == null) return '';
    return formatQuotationVersionLabel(vn);
  }

  /** Alergias en filas de detalle (vista previa cabecera; checklist operativo va al pie). */
  fichaHeaderChecklistLine(ficha: FileAAWithDetails): string {
    if (!ficha.details?.length) return '';
    const allergyPrefixes = ['alergia', 'allergie', 'allergy'];
    const seen = new Set<string>();
    const items: string[] = [];
    for (const d of ficha.details) {
      if (d.row_status === 'red') continue;
      for (const ln of (d.observations || '').split('\n')) {
        const s = ln.trim();
        if (!s) continue;
        const low = s.toLowerCase();
        if (!allergyPrefixes.some((p) => low.startsWith(p))) continue;
        const key = s.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        items.push(s);
      }
    }
    return items.join(' · ');
  }

  private formatIsoDateFr(iso: string | null | undefined): string {
    if (!iso) return '';
    const d = new Date(iso + 'T12:00:00');
    if (isNaN(d.getTime())) return '';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${dd}/${mm}/${d.getFullYear()}`;
  }

  private formatTimeFr(t: string | null | undefined): string {
    if (!t) return '';
    const m = /^(\d{2}):(\d{2})/.exec(t);
    if (!m) return t;
    return `${m[1]}h${m[2]}`;
  }

  /** «Du DD/MM/AAAA au DD/MM/AAAA» o cadena vacía si faltan fechas. */
  fichaSummaryDatesLineFr(ficha: FileAAWithDetails): string {
    if (!ficha.from_date || !ficha.to_date) return '';
    return `Du ${this.formatIsoDateFr(ficha.from_date)} au ${this.formatIsoDateFr(ficha.to_date)}`;
  }

  /** «N nuit/nuits» a partir del rango de la ficha. */
  fichaSummaryNightsLineFr(ficha: FileAAWithDetails): string {
    const n = this.fichaNightsFromIsoRange(ficha.from_date, ficha.to_date);
    if (n === null) return '';
    return n === 1 ? '1 nuit' : `${n} nuits`;
  }

  /** Fecha de llegada − 1 mes calendario (DD/MM/AAAA), p. ej. 01/03/2026 → 01/02/2026. */
  fichaArrivalMinusOneMonthFr(ficha: FileAAWithDetails): string {
    if (!ficha.from_date) return '';
    const d = new Date(ficha.from_date + 'T12:00:00');
    if (isNaN(d.getTime())) return '';
    const target = this.subtractOneCalendarMonth(d);
    const dd = String(target.getDate()).padStart(2, '0');
    const mm = String(target.getMonth() + 1).padStart(2, '0');
    return `${dd}/${mm}/${target.getFullYear()}`;
  }

  private subtractOneCalendarMonth(d: Date): Date {
    let year = d.getFullYear();
    let month = d.getMonth() - 1;
    if (month < 0) {
      month = 11;
      year -= 1;
    }
    const lastDay = new Date(year, month + 1, 0).getDate();
    const day = Math.min(d.getDate(), lastDay);
    return new Date(year, month, day, 12, 0, 0);
  }

  /** Composición de pasajeros en francés: «3 Adultes + 1 enfant (10 ans)». */
  fichaCompositionFr(ficha: FileAAWithDetails): string {
    const na = Number(ficha.quantity_adults) || 0;
    const nc = Number(ficha.quantity_children) || 0;
    if (na === 0 && nc === 0) return '';
    const adultPart = na === 1 ? '1 Adulte' : `${na} Adultes`;
    if (nc === 0) return adultPart;
    const minorPart = nc === 1 ? '1 enfant' : `${nc} enfants`;
    const ages = (ficha.children_ages || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const agesSegment = ages.length > 0 ? ` (${ages.join(', ')} ans)` : '';
    return `${adultPart} + ${minorPart}${agesSegment}`;
  }

  /** Habitaciones formateadas en francés con plural según cantidad. */
  fichaRoomsPhrasesFr(): string[] {
    const rows = this.fichaRoomRows();
    if (!rows.length) return [];
    const labels: Record<FichaRoomType, string> = {
      double: 'double',
      triple: 'triple',
      quadruple: 'quadruple',
      quintuple: 'quintuple',
      mixed: 'mixte',
    };
    const out: string[] = [];
    for (const r of rows) {
      const qty = Number(r.quantity) || 0;
      if (qty <= 0) continue;
      const lbl = labels[r.room_type] ?? r.room_type;
      out.push(qty === 1 ? `chambre ${lbl}` : `${qty} chambres ${lbl}s`);
    }
    return out;
  }

  /** «3 Adultes en chambre triple et 2 chambres doubles» (línea unificada). */
  fichaCompositionAndChambresLineFr(ficha: FileAAWithDetails): string {
    const comp = this.fichaCompositionFr(ficha);
    const phrases = this.fichaRoomsPhrasesFr();
    if (comp && phrases.length) {
      return `${comp} en ${phrases.join(' et ')}`;
    }
    if (comp) return comp;
    if (phrases.length) {
      const s = phrases.join(' et ');
      return s.charAt(0).toUpperCase() + s.slice(1);
    }
    return '';
  }

  /** «Arrivée: HHhMM · Vol XX1234» (em-dash si falta dato). */
  fichaArrivalLineFr(q: QuotationFull): string {
    const arr = this.formatTimeFr(q.arrival_time) || '—';
    const far = (q.flight_number_arrival || '').trim() || '—';
    return `Arrivée: ${arr} · Vol ${far}`;
  }

  /** «Départ: HHhMM · Vol XX1234». */
  fichaDepartureLineFr(q: QuotationFull): string {
    const dep = this.formatTimeFr(q.departure_time) || '—';
    const fdep = (q.flight_number_departure || '').trim() || '—';
    return `Départ: ${dep} · Vol ${fdep}`;
  }

  /**
   * Hora del vuelo de salida menos 4 h (HHhMM), como en export Word/PDF cuando hay
   * transfert el último día del viaje.
   */
  fichaDeparturePickupEarlyFr(q: QuotationFull): string {
    const t = q.departure_time;
    if (!t) return '';
    const m = /^(\d{2}):(\d{2})/.exec(t);
    if (!m) return '';
    let totalMin = parseInt(m[1], 10) * 60 + parseInt(m[2], 10) - 4 * 60;
    while (totalMin < 0) {
      totalMin += 24 * 60;
    }
    const h = Math.floor(totalMin / 60) % 24;
    const min = totalMin % 60;
    return `${String(h).padStart(2, '0')}h${String(min).padStart(2, '0')}`;
  }

  /** Transfert en el último día del viaje (misma regla que ``_has_transfert_vehicle_on_last_trip_day``). */
  fichaHasTransfertOnLastTripDay(ficha: FileAAWithDetails): boolean {
    const last = (ficha.to_date ?? '').trim();
    if (!last) return false;
    const details = (ficha.details ?? []).filter((d) => fichaAaDetailVisibleInTable(d));
    return details.some((d) => {
      if (d.category !== 'vehicle') return false;
      if (!/transfert/i.test(d.name ?? '')) return false;
      const from = (d.date_from ?? '').slice(0, 10);
      const to = (d.date_to ?? d.date_from ?? '').slice(0, 10);
      return from <= last && last <= to;
    });
  }

  /**
   * «Voiture de Location: …» — Alquiler: nombre del vehículo (antes del ``/`` y del ``(``),
   * Interbus (una vez) y Vuelo Interno (file_aa_name). Igual que export Word/PDF.
   */
  fichaVoitureLocationLineFr(ficha: FileAAWithDetails): string {
    if (!ficha.details?.length) return '';
    const alquiler: string[] = [];
    const seenAlquiler = new Set<string>();
    let hasInterbus = false;
    const vueloBrands: string[] = [];
    const seenVuelo = new Set<string>();

    for (const d of ficha.details) {
      if (d.category !== 'vehicle') continue;
      const ex = (d.observation_extras ?? {}) as Record<string, unknown>;
      const cat = String(ex['vehicle_category'] ?? '').trim();
      if (!(VOITURE_LOCATION_VEHICLE_CATEGORIES as readonly string[]).includes(cat)) {
        continue;
      }
      if (cat === 'Vehiculo de Alquiler') {
        const label = rentalVoitureLocationLabel(d.name ?? '');
        if (label && !seenAlquiler.has(label)) {
          seenAlquiler.add(label);
          alquiler.push(label);
        }
      } else if (cat === 'Interbus') {
        hasInterbus = true;
      } else if (cat === 'Vuelo Interno') {
        const label = vueloInternoServiceLabel(ex, d.name ?? '');
        if (label && !seenVuelo.has(label)) {
          seenVuelo.add(label);
          vueloBrands.push(label);
        }
      }
    }

    const parts: string[] = [...alquiler];
    if (hasInterbus) parts.push('Interbus');
    parts.push(...vueloBrands);
    return parts.length ? `Voiture de Location: ${parts.join(', ')}` : '';
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
    if (!FICHA_HEADER_COLORS.includes(color)) {
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

  /** Sincroniza el borrador UI de recordatorios (observaciones: ver `applyChecklistToFicha`). */
  private hydrateFichaFreeTextDrafts(ficha: FileAAWithDetails | null): void {
    this.fichaReminderDraft.set((ficha?.reminder ?? '').toString());
    if (!ficha) {
      this.fichaObservationsDraft.set('');
    }
  }

  /** Persiste «Observaciones» del FileAA cuando el textarea pierde el foco. */
  saveFichaObservations(): void {
    const f = this.fichaFileAA();
    if (!f) return;
    const userPart = this.stripChecklistBlock(this.fichaObservationsDraft() ?? '');
    const next = (this.mergedObservationWithChecklist(userPart, this.buildChecklistObservationLines()) ?? '').trim();
    const current = (f.observations ?? '').trim();
    if (next === current) return;
    this.savingFichaFreeText.set(true);
    this.quotationService.updateFileAA(f.id, { observations: next }).subscribe({
      next: (updated) => {
        this.savingFichaFreeText.set(false);
        this.fichaFileAA.set({ ...f, ...updated });
      },
      error: (err) => {
        this.savingFichaFreeText.set(false);
        this.messageService.add({
          severity: 'error',
          summary:
            typeof err.error?.detail === 'string'
              ? err.error.detail
              : 'No se pudieron guardar las observaciones',
        });
      },
    });
  }

  /** Persiste «Recordatorio» del FileAA cuando el textarea pierde el foco. */
  saveFichaReminder(): void {
    const f = this.fichaFileAA();
    if (!f) return;
    const next = (this.fichaReminderDraft() ?? '').trim();
    const current = (f.reminder ?? '').trim();
    if (next === current) return;
    this.savingFichaFreeText.set(true);
    this.quotationService.updateFileAA(f.id, { reminder: next }).subscribe({
      next: (updated) => {
        this.savingFichaFreeText.set(false);
        this.fichaFileAA.set({ ...f, ...updated });
      },
      error: (err) => {
        this.savingFichaFreeText.set(false);
        this.messageService.add({
          severity: 'error',
          summary:
            typeof err.error?.detail === 'string'
              ? err.error.detail
              : 'No se pudo guardar el recordatorio',
        });
      },
    });
  }

  /** Carga la única Ficha AA activa de la cotización (no depende del selector de versión). */
  private loadFileAA(quotationId: string): void {
    this.quotationService.getLatestFileAA(quotationId).subscribe({
      next: (f) => {
        this.clearAllVehicleFichaObsDrafts();
        const loaded = {
          ...f,
          header_color: f.header_color || '#2563EB',
        };
        this.fichaFileAA.set(loaded);
        this.syncFichaVisibleDetailsList();
        this.hydrateChecklistFromFicha(loaded);
        this.applyChecklistToFicha(loaded);
        this.hydrateFichaFreeTextDrafts(loaded);
        if (!this.fichaTabRestoredFromUrl) {
          this.fichaAATab.set('ficha');
        }
        // Para operaciones, al entrar con Ficha AA existente abrir directamente ese tab.
        if (this.isOperaciones() && this.activeTab() === 'agenda' && !this.tabRestoredFromUrl) {
          this.activeTab.set('fileaa');
          this.syncTabToRoute('fileaa');
        }
      },
      error: (err) => {
        if (err.status === 404) {
          this.clearAllVehicleFichaObsDrafts();
          this.fichaFileAA.set(null);
          this.fichaVisibleDetailsList.set([]);
          this.resetChecklistDraft();
          this.hydrateFichaFreeTextDrafts(null);
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
        this.loadFileAA(quotationId);
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

  private mergeFichaDetailPatch(
    row: FileAADetailRow,
    patch: FileAADetailPatch,
    server: FileAADetailRow,
  ): FileAADetailRow {
    const observation_extras =
      patch.observation_extras !== undefined
        ? patch.observation_extras
        : row.observation_extras ?? server.observation_extras;
    return {
      ...row,
      ...server,
      ...patch,
      observation_extras,
      dates: patch.dates ?? row.dates ?? server.dates,
      total_price: patch.total_price ?? row.total_price ?? server.total_price,
      observations:
        patch.observations !== undefined ? patch.observations : row.observations ?? server.observations,
      display_service_lines:
        server.display_service_lines?.length
          ? server.display_service_lines
          : row.display_service_lines,
    } as FileAADetailRow;
  }

  patchFileDetail(detailId: string, patch: FileAADetailPatch): void {
    const cur = this.fichaFileAA();
    if (!cur) return;
    const prevRow = cur.details.find((d) => d.id === detailId);
    if (prevRow) {
      const optimistic = this.mergeFichaDetailPatch(prevRow, patch, prevRow);
      const details = cur.details.map((d) => (d.id === detailId ? optimistic : d));
      this.fichaFileAA.set({ ...cur, details });
      this.syncFichaVisibleDetailsList();
    }
    const seq = (this.fileDetailPatchSeq[detailId] ?? 0) + 1;
    this.fileDetailPatchSeq[detailId] = seq;
    this.quotationService.patchFileAADetail(detailId, patch).subscribe({
      next: (updated) => {
        if (this.fileDetailPatchSeq[detailId] !== seq) return;
        const f = this.fichaFileAA();
        if (!f) return;
        const currentRow = f.details.find((d) => d.id === detailId);
        if (!currentRow) return;
        const mergedUpdated = this.mergeFichaDetailPatch(currentRow, patch, updated);
        const details = f.details.map((d) => (d.id === detailId ? mergedUpdated : d));
        this.fichaFileAA.set({ ...f, details });
        this.syncFichaVisibleDetailsList();
        if (patch.observation_extras !== undefined || patch.observations !== undefined) {
          if (mergedUpdated.category !== 'room') {
            delete this.hotelFichaObsDraft[detailId];
          }
          delete this.vehicleFichaObsDraft[detailId];
          delete this.vehicleServiceSubtitleDraft[detailId];
          delete this.activityFichaObsDraft[detailId];
        }
        if (patch.dates !== undefined || patch.date_from !== undefined || patch.date_to !== undefined) {
          delete this.activityDatesDraft[detailId];
        }
      },
      error: (err) => {
        if (prevRow) {
          const details = cur.details.map((d) => (d.id === detailId ? prevRow : d));
          this.fichaFileAA.set({ ...cur, details });
          this.syncFichaVisibleDetailsList();
        }
        this.messageService.add({
          severity: 'error',
          summary: typeof err.error?.detail === 'string' ? err.error.detail : 'No se pudo guardar el cambio',
        });
      },
    });
  }

  onFichaDetailDatesBlur(row: FileAADetailRow, target: EventTarget | null): void {
    const v =
      target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement
        ? target.value
        : '';
    if (row.category === 'activity') {
      this.commitActivityFichaDates(row, v);
      return;
    }
    this.patchFileDetail(row.id, { dates: v });
  }

  ensureActivityDatesDraft(d: FileAADetailRow): string {
    if (!(d.id in this.activityDatesDraft)) {
      this.activityDatesDraft[d.id] = d.dates ?? '';
    }
    return this.activityDatesDraft[d.id];
  }

  setActivityDatesDraft(d: FileAADetailRow, value: string): void {
    this.activityDatesDraft[d.id] = value;
  }

  private fichaActivityDatesRefYear(d: FileAADetailRow): number {
    if (d.date_from) {
      const y = parseInt(d.date_from.slice(0, 4), 10);
      if (Number.isFinite(y)) return y;
    }
    const q = this.quotation();
    if (q?.from_date) {
      const y = parseInt(String(q.from_date).slice(0, 4), 10);
      if (Number.isFinite(y)) return y;
    }
    return new Date().getFullYear();
  }

  private isoFromDm(day: number, month: number, year: number): string {
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  /** Parsea texto d/m de la columna Fechas de actividades → lista ISO ordenada. */
  private parseFichaActivityDatesCell(raw: string, refYear: number): string[] {
    const text = raw.trim();
    if (!text) return [];
    const isoSet = new Set<string>();

    const addDm = (day: number, month: number) => {
      if (day < 1 || day > 31 || month < 1 || month > 12) return;
      isoSet.add(this.isoFromDm(day, month, refYear));
    };

    for (const line of text.split('\n')) {
      let ln = line.trim();
      if (!ln) continue;

      const rangeRe = /(\d{1,2})\/(\d{1,2})\s*-\s*(\d{1,2})\/(\d{1,2})/g;
      let rangeMatch: RegExpExecArray | null;
      while ((rangeMatch = rangeRe.exec(ln)) !== null) {
        const d1 = parseInt(rangeMatch[1], 10);
        const m1 = parseInt(rangeMatch[2], 10);
        const d2 = parseInt(rangeMatch[3], 10);
        const m2 = parseInt(rangeMatch[4], 10);
        const start = new Date(refYear, m1 - 1, d1);
        const end = new Date(refYear, m2 - 1, d2);
        if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
          const from = start <= end ? start : end;
          const to = start <= end ? end : start;
          const cur = new Date(from);
          while (cur <= to) {
            isoSet.add(this.toLocalIsoDate(cur));
            cur.setDate(cur.getDate() + 1);
          }
        }
        ln = ln.replace(rangeMatch[0], ' ');
      }

      const grouped = ln.replace(/\s+/g, '').match(/^([\d,]+)\/(\d{1,2})$/);
      if (grouped) {
        const month = parseInt(grouped[2], 10);
        for (const part of grouped[1].split(',')) {
          const day = parseInt(part, 10);
          if (Number.isFinite(day)) addDm(day, month);
        }
        continue;
      }

      const dmRe = /\b(\d{1,2})\/(\d{1,2})\b/g;
      let m: RegExpExecArray | null;
      while ((m = dmRe.exec(ln)) !== null) {
        addDm(parseInt(m[1], 10), parseInt(m[2], 10));
      }
    }

    return [...isoSet].sort();
  }

  commitActivityFichaDates(d: FileAADetailRow, datesCell?: string): void {
    const trimmed = (datesCell ?? this.activityDatesDraft[d.id] ?? d.dates ?? '').trim();
    const prev = (d.dates ?? '').trim();
    if (trimmed === prev && d.date_from && d.date_to) {
      return;
    }
    if (!trimmed) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Fecha obligatoria',
        detail: 'Indique al menos un día en formato día/mes (p. ej. 15/3).',
      });
      return;
    }
    const isoList = this.parseFichaActivityDatesCell(trimmed, this.fichaActivityDatesRefYear(d));
    if (!isoList.length) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Formato no reconocido',
        detail: 'Use día/mes, p. ej. 15/3 o 15/3, 16/3',
      });
      return;
    }
    this.patchFileDetail(d.id, {
      dates: trimmed,
      date_from: isoList[0],
      date_to: isoList[isoList.length - 1],
      days: isoList.length,
    });
  }

  onFichaDetailObservationsBlur(row: FileAADetailRow, target: EventTarget | null): void {
    if (row.category === 'vehicle' || row.category === 'activity' || row.category === 'room') return;
    const v = target instanceof HTMLTextAreaElement ? target.value : '';
    const t = v.trim();
    this.patchFileDetail(row.id, { observations: t.length ? t : null });
  }

  private clearAllVehicleFichaObsDrafts(): void {
    this.vehicleFichaObsDraft = {};
    this.vehicleServiceSubtitleDraft = {};
    this.activityFichaObsDraft = {};
    this.activityDatesDraft = {};
    this.hotelFichaObsDraft = {};
  }

  private vehicleServiceSubtitleFromServer(d: FileAADetailRow): string {
    const raw = d.observation_extras;
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      return String((raw as Record<string, unknown>)['vehicle_ficha_aa_subtitle'] ?? '').trim();
    }
    return '';
  }

  /** Referencia estable para ngModel — subtítulo bajo el nombre (vehículo). */
  ensureVehicleServiceSubtitleDraft(d: FileAADetailRow): string {
    if (!(d.id in this.vehicleServiceSubtitleDraft)) {
      this.vehicleServiceSubtitleDraft[d.id] = this.vehicleServiceSubtitleFromServer(d);
    }
    return this.vehicleServiceSubtitleDraft[d.id];
  }

  setVehicleServiceSubtitleDraft(d: FileAADetailRow, value: string): void {
    this.vehicleServiceSubtitleDraft[d.id] = value;
  }

  commitVehicleServiceSubtitle(d: FileAADetailRow): void {
    if (!this.fichaVehicleAllowsSubtitle(d)) return;
    const text = (this.vehicleServiceSubtitleDraft[d.id] ?? '').trim();
    const prev =
      d.observation_extras && typeof d.observation_extras === 'object' && !Array.isArray(d.observation_extras)
        ? { ...(d.observation_extras as Record<string, unknown>) }
        : {};
    const observation_extras = { ...prev };
    if (text) {
      observation_extras['vehicle_ficha_aa_subtitle'] = text;
    } else {
      delete observation_extras['vehicle_ficha_aa_subtitle'];
    }
    this.patchFileDetail(d.id, { observation_extras });
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
      const s = (k: string) => String(o[k] ?? '');
      return {
        luggage_cover: !!o['luggage_cover'],
        pickup_detail: s('pickup_detail'),
        dropoff_detail: s('dropoff_detail'),
        notes: s('notes') || notes,
        ficha_fecha: s('ficha_fecha'),
        ficha_hora: s('ficha_hora'),
        ficha_fecha_ida: s('ficha_fecha_ida'),
        ficha_hora_ida: s('ficha_hora_ida'),
        ficha_fecha_vuelta: s('ficha_fecha_vuelta'),
        ficha_hora_vuelta: s('ficha_hora_vuelta'),
        ficha_fecha_recogida: s('ficha_fecha_recogida'),
        ficha_hora_recogida: s('ficha_hora_recogida'),
        ficha_fecha_devolucion: s('ficha_fecha_devolucion'),
        ficha_hora_devolucion: s('ficha_hora_devolucion'),
        ficha_pick_up: s('ficha_pick_up'),
        ficha_drop_off: s('ficha_drop_off'),
        ficha_interbus_fechas: s('ficha_interbus_fechas'),
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

  // ── Edición inline de nombre (file_aa_name) ─────────────────────────────

  private roleCanEditFichaCatalogueName(): boolean {
    const role = (this.auth.currentUser()?.role ?? '').trim();
    return role === 'admin' || role === 'operaciones';
  }

  /** IDs de catálogo (respuesta API o `observation_extras`). */
  private fichaDetailCatalogueIds(d: FileAADetailRow): {
    hotelId?: string;
    roomId?: string;
    activityId?: string;
    vehicleId?: string;
  } {
    const extras = d.observation_extras as Record<string, unknown> | null | undefined;
    const id = (v: unknown): string | undefined => {
      if (v == null) return undefined;
      const s = String(v).trim();
      return s || undefined;
    };
    return {
      hotelId: id(d.catalogue_hotel_id) ?? id(extras?.['hotel_id']),
      roomId: id(d.catalogue_room_id) ?? id(extras?.['room_id']),
      activityId: id(d.catalogue_activity_id) ?? id(extras?.['activity_id']),
      vehicleId: id(d.catalogue_vehicle_id) ?? id(extras?.['vehicle_id']),
    };
  }

  private cataloguePatchOrSkip<T>(req: Observable<T>, label: string): Observable<T | null> {
    return req.pipe(
      catchError((err) => {
        const detail = err?.error?.detail;
        this.messageService.add({
          severity: 'warn',
          summary: `Catálogo (${label})`,
          detail:
            typeof detail === 'string'
              ? detail
              : 'No se pudo actualizar el catálogo; el nombre se guardará solo en esta ficha.',
        });
        return of(null);
      }),
    );
  }

  private refreshFichaAfterNameEdit(fileId: string): void {
    this.quotationService.getFileAA(fileId).subscribe({
      next: (updated) => {
        this.fichaFileAA.set(updated);
        this.syncFichaVisibleDetailsList();
        this.savingFichaName.set(false);
        this.fichaNameEditKey.set(null);
      },
      error: () => {
        this.savingFichaName.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo recargar la ficha tras guardar el nombre',
        });
      },
    });
  }

  private finishFichaNameEdit(
    d: FileAADetailRow,
    ficha: FileAAWithDetails,
    observation_extras: Record<string, unknown>,
  ): void {
    this.quotationService.patchFileAADetail(d.id, { observation_extras }).subscribe({
      next: () => this.refreshFichaAfterNameEdit(ficha.id),
      error: () => {
        this.savingFichaName.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo actualizar el nombre en la ficha',
        });
      },
    });
  }

  startFichaNameEdit(d: FileAADetailRow, target: string): void {
    if (!this.canEditFichaCatalogueName()) return;
    this.fichaNameEditKey.set(this.fichaNameEditKeyFor(d.id, target));
    const extras = d.observation_extras as Record<string, unknown> | null | undefined;
    if (target === 'hotel') {
      this.fichaNameEditValue.set(
        (extras?.['hotel_file_aa_name'] as string) ||
          (d.display_service_lines?.[0] ?? ''),
      );
      return;
    }
    if (target === 'room' || target.startsWith('room:')) {
      const roomFaa = this.fichaRoomFileAaNameForEdit(d, target);
      this.fichaNameEditValue.set(roomFaa);
      return;
    }
    if (d.category === 'vehicle') {
      const preComputed = (extras?.['vehicle_file_aa_name'] as string) || '';
      if (preComputed) {
        this.fichaNameEditValue.set(preComputed);
      } else {
        const line = d.display_service_lines?.[0] ?? '';
        this.fichaNameEditValue.set(line.replace(/\s*\(\d+\s+jours?\)\s*$/i, '').trim());
      }
      return;
    }
    const actLine = (d.display_service_lines?.[0] ?? '').trim();
    const actMain = actLine.includes(' - ') ? actLine.split(' - ').slice(1).join(' - ').trim() : actLine;
    const actMainNoTime = actMain.replace(/,\s*\d{1,2}h\d{0,2}$/i, '').trim();
    this.fichaNameEditValue.set(
      (extras?.['activity_file_aa_name'] as string) || actMainNoTime,
    );
  }

  cancelFichaNameEdit(): void {
    this.fichaNameEditKey.set(null);
  }

  confirmFichaNameEdit(d: FileAADetailRow, ficha: FileAAWithDetails, target: string): void {
    if (!this.canEditFichaCatalogueName()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Sin permisos',
        detail: 'Solo Administración y Operaciones pueden guardar el nombre de catálogo.',
      });
      return;
    }
    const newName = this.fichaNameEditValue().trim();
    if (!newName) {
      this.cancelFichaNameEdit();
      return;
    }

    this.savingFichaName.set(true);
    const prev =
      d.observation_extras && typeof d.observation_extras === 'object' && !Array.isArray(d.observation_extras)
        ? { ...(d.observation_extras as Record<string, unknown>) }
        : {};
    const ids = this.fichaDetailCatalogueIds(d);

    if (target === 'hotel' && d.category === 'room') {
      const hotelUpdate$ =
        ids.hotelId
          ? this.cataloguePatchOrSkip(
              this.hotelService.update(ids.hotelId, { file_aa_name: newName }),
              'hotel',
            )
          : of(null);
      hotelUpdate$.subscribe({
        next: () => {
          this.finishFichaNameEdit(d, ficha, { ...prev, hotel_file_aa_name: newName });
        },
      });
      return;
    }

    if (target === 'room' && d.category === 'room') {
      const roomUpdate$ =
        ids.hotelId && ids.roomId
          ? this.cataloguePatchOrSkip(
              this.hotelService.updateRoom(ids.hotelId, ids.roomId, { file_aa_name: newName }),
              'habitación',
            )
          : of(null);
      roomUpdate$.subscribe({
        next: () => {
          this.finishFichaNameEdit(d, ficha, { ...prev, room_file_aa_name: newName });
        },
      });
      return;
    }

    if (target.startsWith('room:') && d.category === 'room') {
      const index = Number(target.slice('room:'.length));
      const slot = this.fichaMergedRoomsFromExtras(d)[index];
      const roomId = slot?.room_id;
      const roomUpdate$ =
        ids.hotelId && roomId
          ? this.cataloguePatchOrSkip(
              this.hotelService.updateRoom(ids.hotelId, roomId, { file_aa_name: newName }),
              'habitación',
            )
          : of(null);
      roomUpdate$.subscribe({
        next: () => {
          const rawMerged = Array.isArray(prev['merged_rooms'])
            ? (prev['merged_rooms'] as Record<string, unknown>[]).map((item) => ({ ...item }))
            : [];
          if (rawMerged[index]) {
            rawMerged[index] = { ...rawMerged[index], room_file_aa_name: newName };
          }
          const updated_extras: Record<string, unknown> = { ...prev, merged_rooms: rawMerged };
          if (index === 0) updated_extras['room_file_aa_name'] = newName;
          this.finishFichaNameEdit(d, ficha, updated_extras);
        },
      });
      return;
    }

    const obsKey =
      d.category === 'activity'
        ? 'activity_file_aa_name'
        : d.category === 'vehicle'
          ? 'vehicle_file_aa_name'
          : null;
    const catalogueUpdate$ = this._fichaNameCatalogueUpdate(d, newName, ids);
    catalogueUpdate$.subscribe({
      next: () => {
        if (!obsKey) {
          this.savingFichaName.set(false);
          this.fichaNameEditKey.set(null);
          return;
        }
        this.finishFichaNameEdit(d, ficha, { ...prev, [obsKey]: newName });
      },
    });
  }

  private _fichaNameCatalogueUpdate(
    d: FileAADetailRow,
    newName: string,
    ids: { hotelId?: string; roomId?: string; activityId?: string; vehicleId?: string },
  ): Observable<unknown> {
    if (d.category === 'vehicle' && ids.vehicleId) {
      return this.cataloguePatchOrSkip(
        this.vehicleService.update(ids.vehicleId, { file_aa_name: newName }),
        'vehículo',
      );
    }
    if (d.category === 'activity' && ids.activityId) {
      return this.cataloguePatchOrSkip(
        this.activityService.update(ids.activityId, { file_aa_name: newName }),
        'actividad',
      );
    }
    return of(null);
  }

  commitVehicleFichaObs(d: FileAADetailRow): void {
    const row = this.ensureVehicleFichaObsDraft(d);
    // Preservamos el resto de `observation_extras` (p. ej.
    // `sort_after_detail_id` para resaltar en verde las filas añadidas
    // como reemplazo, `vehicle_brand` persistido, `vehicle_dates_iso`,
    // etc.) y solo sobrescribimos los campos que edita esta sección.
    const prev =
      d.observation_extras && typeof d.observation_extras === 'object' && !Array.isArray(d.observation_extras)
        ? { ...(d.observation_extras as Record<string, unknown>) }
        : {};
    const observation_extras: Record<string, unknown> = {
      ...prev,
      luggage_cover: row.luggage_cover,
      pickup_detail: row.pickup_detail,
      dropoff_detail: row.dropoff_detail,
      notes: row.notes,
      ficha_fecha: row.ficha_fecha ?? '',
      ficha_hora: row.ficha_hora ?? '',
      ficha_fecha_ida: row.ficha_fecha_ida ?? '',
      ficha_hora_ida: row.ficha_hora_ida ?? '',
      ficha_fecha_vuelta: row.ficha_fecha_vuelta ?? '',
      ficha_hora_vuelta: row.ficha_hora_vuelta ?? '',
      ficha_fecha_recogida: row.ficha_fecha_recogida ?? '',
      ficha_hora_recogida: row.ficha_hora_recogida ?? '',
      ficha_fecha_devolucion: row.ficha_fecha_devolucion ?? '',
      ficha_hora_devolucion: row.ficha_hora_devolucion ?? '',
      ficha_pick_up: row.ficha_pick_up ?? '',
      ficha_drop_off: row.ficha_drop_off ?? '',
      ficha_interbus_fechas: row.ficha_interbus_fechas ?? '',
    };
    const notesTrim = row.notes.trim();
    if (this.fichaVehicleCategory(d) === 'Taxi Maritimo') {
      delete observation_extras['vehicle_ficha_aa_subtitle'];
      const dates = formatTaxiMaritimoFichaDatesCell(
        row.ficha_fecha_ida,
        row.ficha_fecha_vuelta,
      );
      this.patchFileDetail(d.id, {
        observation_extras,
        observations: notesTrim ? notesTrim : null,
        dates,
      });
      return;
    }
    if (this.fichaVehicleCategory(d) === 'Interbus') {
      const sub = (this.vehicleServiceSubtitleDraft[d.id] ?? '').trim();
      if (sub) {
        observation_extras['vehicle_ficha_aa_subtitle'] = sub;
      } else {
        delete observation_extras['vehicle_ficha_aa_subtitle'];
      }
    } else if (this.fichaVehicleAllowsSubtitle(d)) {
      const sub = (this.vehicleServiceSubtitleDraft[d.id] ?? '').trim();
      if (sub) {
        observation_extras['vehicle_ficha_aa_subtitle'] = sub;
      } else {
        delete observation_extras['vehicle_ficha_aa_subtitle'];
      }
    } else {
      delete observation_extras['vehicle_ficha_aa_subtitle'];
    }
    this.patchFileDetail(d.id, {
      observation_extras,
      observations: notesTrim ? notesTrim : null,
    });
  }

  private activityFichaObsFromServer(d: FileAADetailRow): FileAADetailActivityObsState {
    const raw = d.observation_extras;
    const notes = typeof d.observations === 'string' ? d.observations : '';
    const assistDefaults = this.fichaActivityAssistDefaults();
    const def: FileAADetailActivityObsState = {
      pickup_detail: '',
      ficha_horario: '',
      activity_adults: null,
      activity_children: null,
      activity_free: null,
      activity_assist_adults: assistDefaults.adults,
      activity_assist_children: assistDefaults.children,
      activity_assist_ages: assistDefaults.ages,
      notes,
    };
    const toIntOrNull = (v: unknown): number | null => {
      if (v === null || v === undefined || v === '') return null;
      const n = Number(v);
      return Number.isFinite(n) && n >= 0 ? Math.trunc(n) : null;
    };
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      const o = raw as Record<string, unknown>;
      return {
        pickup_detail: String(o['pickup_detail'] ?? ''),
        ficha_horario: this.normalizeFichaHorarioDisplay(String(o['ficha_horario'] ?? '')),
        activity_adults: toIntOrNull(o['activity_adults']),
        activity_children: toIntOrNull(o['activity_children']),
        activity_free: toIntOrNull(o['activity_free']),
        activity_assist_adults:
          'activity_assist_adults' in o
            ? toIntOrNull(o['activity_assist_adults'])
            : assistDefaults.adults,
        activity_assist_children:
          'activity_assist_children' in o
            ? toIntOrNull(o['activity_assist_children'])
            : assistDefaults.children,
        activity_assist_ages:
          'activity_assist_ages' in o
            ? String(o['activity_assist_ages'] ?? '')
            : assistDefaults.ages,
        notes: String(o['notes'] ?? notes),
      };
    }
    return def;
  }

  /** Valores por defecto de Asistencia desde la composición familiar de la Ficha AA. */
  private fichaActivityAssistDefaults(): {
    adults: number | null;
    children: number | null;
    ages: string;
  } {
    const ficha = this.fichaFileAA();
    if (!ficha) {
      return { adults: null, children: null, ages: '' };
    }
    const na = Number(ficha.quantity_adults) || 0;
    const nc = Number(ficha.quantity_children) || 0;
    const ageParts = (ficha.children_ages || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    return {
      adults: na > 0 ? na : null,
      children: nc > 0 ? nc : null,
      ages: this.joinEsY(ageParts),
    };
  }

  /** Une fragmentos con « y » (p. ej. edades «6 y 8»). */
  private joinEsY(parts: string[]): string {
    if (!parts.length) return '';
    if (parts.length === 1) return parts[0];
    if (parts.length === 2) return `${parts[0]} y ${parts[1]}`;
    return `${parts.slice(0, -1).join(', ')} y ${parts[parts.length - 1]}`;
  }

  ensureActivityFichaObsDraft(d: FileAADetailRow): FileAADetailActivityObsState {
    if (!this.activityFichaObsDraft[d.id]) {
      this.activityFichaObsDraft[d.id] = { ...this.activityFichaObsFromServer(d) };
    }
    return this.activityFichaObsDraft[d.id];
  }

  /**
   * Convierte valores legacy `HH:MM` (input type=time antiguo) al formato
   * con «h» que prefieren en operaciones (`9h30`). El resto se deja tal
   * cual (p. ej. «8h», «14h15», texto libre).
   */
  normalizeFichaHorarioDisplay(raw: string | null | undefined): string {
    const s = String(raw ?? '').trim();
    if (!s) return '';
    const m = /^(\d{1,2}):(\d{2})$/.exec(s);
    if (m) {
      const h = parseInt(m[1], 10);
      const min = m[2];
      return `${h}h${min}`;
    }
    return s;
  }

  commitActivityFichaObs(d: FileAADetailRow): void {
    const row = this.ensureActivityFichaObsDraft(d);
    // Preservamos el resto de `observation_extras` (p. ej.
    // `sort_after_detail_id` para resaltar en verde las filas añadidas
    // como reemplazo) y solo sobrescribimos los campos editables de
    // esta sección.
    const prev =
      d.observation_extras && typeof d.observation_extras === 'object' && !Array.isArray(d.observation_extras)
        ? { ...(d.observation_extras as Record<string, unknown>) }
        : {};
    const toIntOrNull = (v: unknown): number | null => {
      if (v === null || v === undefined || v === '') return null;
      const n = Number(v);
      return Number.isFinite(n) && n >= 0 ? Math.trunc(n) : null;
    };
    const adults = toIntOrNull(row.activity_adults);
    const children = toIntOrNull(row.activity_children);
    const free = toIntOrNull(row.activity_free);
    const assistAdults = toIntOrNull(row.activity_assist_adults);
    const assistChildren = toIntOrNull(row.activity_assist_children);
    const assistAges = String(row.activity_assist_ages ?? '').trim();
    // Reflejamos en el draft el valor normalizado (entero o null) para
    // que el input muestre exactamente lo que se persiste.
    row.activity_adults = adults;
    row.activity_children = children;
    row.activity_free = free;
    row.activity_assist_adults = assistAdults;
    row.activity_assist_children = assistChildren;
    row.activity_assist_ages = assistAges;
    const horarioNorm = this.normalizeFichaHorarioDisplay(String(row.ficha_horario ?? ''));
    row.ficha_horario = horarioNorm;
    const observation_extras = {
      ...prev,
      pickup_detail: row.pickup_detail,
      ficha_horario: horarioNorm,
      activity_adults: adults,
      activity_children: children,
      activity_free: free,
      activity_assist_adults: assistAdults,
      activity_assist_children: assistChildren,
      activity_assist_ages: assistAges || null,
      notes: row.notes,
    };
    const notesTrim = row.notes.trim();
    // Recálculo local del «Precio sistema» para feedback instantáneo.
    //
    // Usa el snapshot de tarifas netas que el backend persiste en
    // `observation_extras` (`activity_rack_adult` / `activity_rack_child`).
    // Si están presentes, replicamos exactamente la fórmula del catálogo
    // y mandamos `total_price` en el PATCH; si no, dejamos que el backend
    // las backfillee y recompute (y la próxima edición ya será dinámica).
    const patch: FileAADetailPatch = {
      observation_extras,
      observations: notesTrim ? notesTrim : null,
    };
    const rackAdult = this.coerceDecimalLike(prev['activity_rack_adult']);
    const rackChild = this.coerceDecimalLike(prev['activity_rack_child']);
    if (rackAdult !== null && rackChild !== null) {
      const a = adults ?? 0;
      const c = children ?? 0;
      const days = Math.max(1, Number(d.days) || 1);
      const daily = rackAdult * a + rackChild * c;
      const total = daily * days;
      // Normalizamos a dos decimales para evitar arrastrar ruido de coma
      // flotante (p. ej. 0.1 + 0.2) en lo que se persiste.
      patch.total_price = Number(total.toFixed(2));
    }
    this.patchFileDetail(d.id, patch);
  }

  /** Decimal-like → number, tolerando string/number/null/undefined. */
  private coerceDecimalLike(v: unknown): number | null {
    if (v === null || v === undefined || v === '') return null;
    const n = typeof v === 'number' ? v : Number(v);
    return Number.isFinite(n) ? n : null;
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

  hotelStayEditNightsPreview = computed(() => {
    const ent = this.hotelStayEditEntradaDate();
    const sal = this.hotelStayEditSalidaDate();
    if (!ent || !sal) return null;
    const entIso = this.dateToIso(ent);
    const salIso = this.dateToIso(sal);
    if (!entIso || !salIso) return null;
    return this.hotelStayNights(entIso, salIso);
  });

  private fichaHotelRefYear(d: FileAADetailRow): number {
    if (d.date_from) {
      const y = parseInt(d.date_from.slice(0, 4), 10);
      if (Number.isFinite(y)) return y;
    }
    const q = this.quotation();
    if (q?.from_date) {
      const y = parseInt(String(q.from_date).slice(0, 4), 10);
      if (Number.isFinite(y)) return y;
    }
    return new Date().getFullYear();
  }

  private splitFichaYText(text: string | null | undefined): string[] {
    return (text ?? '')
      .split(/\s+y\s+/i)
      .map((p) => p.trim())
      .filter(Boolean);
  }

  private parseFichaDmToIso(dm: string, refYear: number): string | null {
    const m = /^(\d{1,2})\/(\d{1,2})$/.exec((dm ?? '').trim());
    if (!m) return null;
    const day = Number(m[1]);
    const month = Number(m[2]);
    if (day < 1 || day > 31 || month < 1 || month > 12) return null;
    return `${refYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  private isoToDate(iso: string | null | undefined): Date | null {
    if (!iso) return null;
    const dt = new Date(`${iso}T12:00:00`);
    return Number.isNaN(dt.getTime()) ? null : dt;
  }

  private dateToIso(dt: Date | null | undefined): string | null {
    if (!dt || Number.isNaN(dt.getTime())) return null;
    const y = dt.getFullYear();
    const mo = String(dt.getMonth() + 1).padStart(2, '0');
    const da = String(dt.getDate()).padStart(2, '0');
    return `${y}-${mo}-${da}`;
  }

  /** Noches entre entrada (inclusive) y salida (checkout, exclusiva). */
  private hotelStayNights(entrada_iso: string, salida_iso: string): number {
    const a = new Date(`${entrada_iso}T12:00:00`);
    const b = new Date(`${salida_iso}T12:00:00`);
    if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 0;
    const diff = Math.round((b.getTime() - a.getTime()) / 86_400_000);
    return Math.max(0, diff);
  }

  private parseHotelStaySegments(
    entradaText: string,
    salidaText: string,
    d: FileAADetailRow,
    slotExtras?: Record<string, unknown>,
  ): FichaHotelStaySegment[] {
    const refYear = this.fichaHotelRefYear(d);
    const entParts = this.splitFichaYText(entradaText);
    const salParts = this.splitFichaYText(salidaText);
    const count = Math.max(entParts.length, salParts.length);
    const segments: FichaHotelStaySegment[] = [];
    for (let i = 0; i < count; i++) {
      const entIso = this.parseFichaDmToIso(entParts[i] ?? entParts[0] ?? '', refYear);
      const salIso = this.parseFichaDmToIso(salParts[i] ?? salParts[0] ?? '', refYear);
      if (entIso && salIso && salIso > entIso) {
        segments.push({ entrada_iso: entIso, salida_iso: salIso });
      }
    }
    if (segments.length > 0) return segments;

    const rawIso = slotExtras?.['room_dates_iso'];
    if (Array.isArray(rawIso) && rawIso.length > 0) {
      const nights = rawIso
        .map((x) => String(x).trim())
        .filter((x) => /^\d{4}-\d{2}-\d{2}$/.test(x))
        .sort();
      if (nights.length > 0) {
        return [{ entrada_iso: nights[0], salida_iso: this.isoAddDays(nights[nights.length - 1], 1) }];
      }
    }

    const df = String(slotExtras?.['date_from'] ?? d.date_from ?? '').trim();
    const dt = String(slotExtras?.['date_to'] ?? d.date_to ?? '').trim();
    if (df && dt) {
      return [{ entrada_iso: df, salida_iso: this.isoAddDays(dt, 1) }];
    }
    return [];
  }

  private segmentsToFichaFields(segments: FichaHotelStaySegment[]): {
    ficha_entrada: string;
    ficha_salida: string;
    ficha_noches_texto: string;
  } {
    const ent: string[] = [];
    const sal: string[] = [];
    const noc: string[] = [];
    for (const seg of segments) {
      ent.push(this.formatIsoDateDm(seg.entrada_iso));
      sal.push(this.formatIsoDateDm(seg.salida_iso));
      noc.push(String(this.hotelStayNights(seg.entrada_iso, seg.salida_iso)));
    }
    const join = (parts: string[]) => (parts.length <= 1 ? (parts[0] ?? '') : parts.join(' y '));
    return {
      ficha_entrada: join(ent),
      ficha_salida: join(sal),
      ficha_noches_texto: join(noc),
    };
  }

  private segmentsToRoomDatesIso(segments: FichaHotelStaySegment[]): string[] {
    const isos: string[] = [];
    for (const seg of segments) {
      let cur = seg.entrada_iso;
      while (cur < seg.salida_iso) {
        isos.push(cur);
        cur = this.isoAddDays(cur, 1);
      }
    }
    return [...new Set(isos)].sort();
  }

  private joinFichaYFields(parts: string[]): string {
    const cleaned = parts.map((p) => p.trim()).filter(Boolean);
    if (!cleaned.length) return '';
    return cleaned.length === 1 ? cleaned[0] : cleaned.join(' y ');
  }

  fichaHotelRoomsHaveDifferentStays(d: FileAADetailRow): boolean {
    const raw = d.observation_extras?.['merged_rooms'];
    if (!Array.isArray(raw) || raw.length <= 1) return false;
    const sigs = new Set<string>();
    for (const item of raw) {
      if (!item || typeof item !== 'object') continue;
      const o = item as Record<string, unknown>;
      sigs.add(`${String(o['ficha_entrada'] ?? '')}|${String(o['ficha_salida'] ?? '')}`);
    }
    return sigs.size > 1;
  }

  private getHotelStaySegmentsFromDraft(d: FileAADetailRow, roomIndex: number | null): FichaHotelStaySegment[] {
    const draft = this.ensureHotelFichaObsDraft(d);
    if (roomIndex !== null && draft.merged_slots?.[roomIndex]) {
      const slot = draft.merged_slots[roomIndex];
      if (!slot.stay_segments?.length) {
        const raw = d.observation_extras?.['merged_rooms'];
        const slotExtras =
          Array.isArray(raw) && raw[roomIndex] && typeof raw[roomIndex] === 'object'
            ? (raw[roomIndex] as Record<string, unknown>)
            : undefined;
        slot.stay_segments = this.parseHotelStaySegments(
          String(slotExtras?.['ficha_entrada'] ?? draft.ficha_entrada ?? ''),
          String(slotExtras?.['ficha_salida'] ?? draft.ficha_salida ?? ''),
          d,
          slotExtras,
        );
      }
      return slot.stay_segments;
    }
    if (!draft.stay_segments?.length) {
      draft.stay_segments = this.parseHotelStaySegments(
        draft.ficha_entrada ?? '',
        draft.ficha_salida ?? '',
        d,
        d.observation_extras && typeof d.observation_extras === 'object' && !Array.isArray(d.observation_extras)
          ? (d.observation_extras as Record<string, unknown>)
          : undefined,
      );
    }
    return draft.stay_segments;
  }

  hotelStaySegmentsDisplay(d: FileAADetailRow, roomIndex: number | null = null): FichaHotelStaySegment[] {
    return this.getHotelStaySegmentsFromDraft(d, roomIndex);
  }

  hotelNochesDisplay(d: FileAADetailRow, roomIndex: number | null = null): string {
    const segments = this.getHotelStaySegmentsFromDraft(d, roomIndex);
    const parts = segments.map((s) => String(this.hotelStayNights(s.entrada_iso, s.salida_iso)));
    return this.joinFichaYFields(parts);
  }

  hotelStayEditDialogTitle(): string {
    const detailId = this.hotelStayEditDetailId();
    const ficha = this.fichaFileAA();
    const row = ficha?.details.find((r) => r.id === detailId);
    const ri = this.hotelStayEditRoomIndex();
    const si = this.hotelStayEditSegmentIndex();
    let label = 'Editar estadía';
    if (row && ri !== null && this.fichaHotelRoomsHaveDifferentStays(row)) {
      const slot = this.ensureHotelFichaObsDraft(row).merged_slots?.[ri];
      if (slot) label = `${label} — ${this.fichaMergedRoomLabel(slot, ri)}`;
    }
    if (si > 0) label = `${label} (${si + 1})`;
    return label;
  }

  openHotelStayEditDialog(d: FileAADetailRow, segmentIndex: number, roomIndex: number | null = null): void {
    const segments = this.getHotelStaySegmentsFromDraft(d, roomIndex);
    const seg = segments[segmentIndex];
    if (!seg) return;
    this.hotelStayEditDetailId.set(d.id);
    this.hotelStayEditRoomIndex.set(roomIndex);
    this.hotelStayEditSegmentIndex.set(segmentIndex);
    this.hotelStayEditEntradaDate.set(this.isoToDate(seg.entrada_iso));
    this.hotelStayEditSalidaDate.set(this.isoToDate(seg.salida_iso));
    this.showHotelStayEditDialog.set(true);
  }

  onHotelStayEditDialogHide(): void {
    this.hotelStayEditDetailId.set(null);
    this.hotelStayEditRoomIndex.set(null);
    this.hotelStayEditSegmentIndex.set(0);
    this.hotelStayEditEntradaDate.set(null);
    this.hotelStayEditSalidaDate.set(null);
  }

  confirmHotelStayEditDialog(): void {
    const detailId = this.hotelStayEditDetailId();
    const ficha = this.fichaFileAA();
    const row = ficha?.details.find((r) => r.id === detailId);
    if (!row) {
      this.showHotelStayEditDialog.set(false);
      return;
    }
    const entIso = this.dateToIso(this.hotelStayEditEntradaDate());
    const salIso = this.dateToIso(this.hotelStayEditSalidaDate());
    if (!entIso || !salIso) {
      this.messageService.add({ severity: 'warn', summary: 'Indique entrada y salida' });
      return;
    }
    if (salIso <= entIso) {
      this.messageService.add({
        severity: 'warn',
        summary: 'La salida debe ser posterior a la entrada',
        detail: 'La salida es el día de checkout; del 1 al 5 de enero son 4 noches.',
      });
      return;
    }
    const draft = this.ensureHotelFichaObsDraft(row);
    const ri = this.hotelStayEditRoomIndex();
    const si = this.hotelStayEditSegmentIndex();
    const segments =
      ri !== null && draft.merged_slots?.[ri]
        ? (draft.merged_slots[ri].stay_segments ??= this.getHotelStaySegmentsFromDraft(row, ri))
        : (draft.stay_segments ??= this.getHotelStaySegmentsFromDraft(row, null));
    if (!segments[si]) {
      this.showHotelStayEditDialog.set(false);
      return;
    }
    segments[si] = { entrada_iso: entIso, salida_iso: salIso };
    this.syncHotelFichaDateTextsFromSegments(draft, ri);
    this.bumpHotelFichaPriceRev();
    this.showHotelStayEditDialog.set(false);
    this.commitHotelFichaObs(row);
  }

  private syncHotelFichaDateTextsFromSegments(
    draft: FileAADetailRoomObsState,
    roomIndex: number | null,
  ): void {
    if (roomIndex !== null && draft.merged_slots?.[roomIndex]?.stay_segments) {
      const fields = this.segmentsToFichaFields(draft.merged_slots[roomIndex].stay_segments!);
      draft.merged_slots[roomIndex].stay_segments = [...draft.merged_slots[roomIndex].stay_segments!];
      if (!this.fichaHotelRoomsHaveDifferentStaysFromDraft(draft)) {
        draft.ficha_entrada = fields.ficha_entrada;
        draft.ficha_salida = fields.ficha_salida;
        draft.ficha_noches_texto = fields.ficha_noches_texto;
      }
      return;
    }
    if (draft.stay_segments?.length) {
      const fields = this.segmentsToFichaFields(draft.stay_segments);
      draft.ficha_entrada = fields.ficha_entrada;
      draft.ficha_salida = fields.ficha_salida;
      draft.ficha_noches_texto = fields.ficha_noches_texto;
    }
  }

  private fichaHotelRoomsHaveDifferentStaysFromDraft(draft: FileAADetailRoomObsState): boolean {
    const slots = draft.merged_slots;
    if (!slots || slots.length <= 1) return false;
    const sigs = new Set<string>();
    for (const slot of slots) {
      const segs = slot.stay_segments ?? [];
      const fields = this.segmentsToFichaFields(segs);
      sigs.add(`${fields.ficha_entrada}|${fields.ficha_salida}`);
    }
    return sigs.size > 1;
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
    let merged_slots: FichaMergedRoomSlot[] | undefined;
    const merged = this.fichaMergedRoomsFromExtras(d);
    if (merged.length > 1) {
      merged_slots = merged.map((slot) => ({
        room_id: slot.room_id,
        room_file_aa_name: slot.room_file_aa_name,
        room_quantity: slot.room_quantity,
      }));
    }
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      const o = raw as Record<string, unknown>;
      if (merged.length <= 1) {
        const rq = o['room_quantity'];
        if (rq !== null && rq !== undefined && rq !== '') {
          const n = Number(rq);
          room_quantity = Number.isFinite(n) ? n : null;
        }
        if (room_quantity === null && merged.length === 1) {
          room_quantity = merged[0].room_quantity ?? null;
        }
        if (room_quantity === null) {
          const rawMerged = o['merged_rooms'];
          if (Array.isArray(rawMerged) && rawMerged.length === 1) {
            const slot = rawMerged[0];
            if (slot && typeof slot === 'object') {
              const slotRq = (slot as Record<string, unknown>)['room_quantity'];
              if (slotRq !== null && slotRq !== undefined && slotRq !== '') {
                const n = Number(slotRq);
                room_quantity = Number.isFinite(n) ? n : null;
              }
            }
          }
        }
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

    const extrasObj =
      raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : undefined;
    const differentStays = this.fichaHotelRoomsHaveDifferentStays(d);
    const rawMergedArr = extrasObj?.['merged_rooms'];
    if (Array.isArray(rawMergedArr) && rawMergedArr.length > 0 && (merged.length > 1 || differentStays)) {
      merged_slots = rawMergedArr.map((item, i) => {
        const slotObj = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
        const m = merged[i] ?? merged[0];
        const stay_segments = this.parseHotelStaySegments(
          String(slotObj['ficha_entrada'] ?? ficha_entrada),
          String(slotObj['ficha_salida'] ?? ficha_salida),
          d,
          slotObj,
        );
        return {
          room_id: String(slotObj['room_id'] ?? m?.room_id ?? ''),
          room_file_aa_name:
            String(slotObj['room_file_aa_name'] ?? m?.room_file_aa_name ?? '').trim() || undefined,
          room_quantity: m?.room_quantity ?? null,
          stay_segments,
        };
      });
    }

    const stay_segments = this.parseHotelStaySegments(
      ficha_entrada,
      ficha_salida,
      d,
      extrasObj,
    );
    if (stay_segments.length > 0) {
      const fields = this.segmentsToFichaFields(stay_segments);
      ficha_noches_texto = fields.ficha_noches_texto;
    }

    return {
      room_quantity,
      merged_slots,
      stay_segments,
      ficha_entrada,
      ficha_salida,
      ficha_noches_texto,
      notes,
    };
  }

  /** Tipologías incluidas en una fila hotel (legacy = una sola). */
  fichaMergedRoomsFromExtras(d: FileAADetailRow): FichaMergedRoomSlot[] {
    const raw = d.observation_extras;
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      const merged = (raw as Record<string, unknown>)['merged_rooms'];
      if (Array.isArray(merged) && merged.length > 0) {
        return merged
          .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
          .map((slot) => {
            const rq = slot['room_quantity'];
            let room_quantity: number | null = null;
            if (rq !== null && rq !== undefined && rq !== '') {
              const n = Number(rq);
              room_quantity = Number.isFinite(n) ? n : null;
            }
            return {
              room_id: String(slot['room_id'] ?? ''),
              room_file_aa_name: String(slot['room_file_aa_name'] ?? '').trim() || undefined,
              room_quantity,
              is_replacement: Boolean(slot['is_replacement']),
            };
          });
      }
    }
    const roomId = String(d.observation_extras?.['room_id'] ?? '').trim();
    if (!roomId) return [];
    const rqRaw = d.observation_extras?.['room_quantity'];
    let room_quantity: number | null = null;
    if (rqRaw !== null && rqRaw !== undefined && rqRaw !== '') {
      const n = Number(rqRaw);
      room_quantity = Number.isFinite(n) ? n : null;
    }
    return [
      {
        room_id: roomId,
        room_file_aa_name: String(d.observation_extras?.['room_file_aa_name'] ?? '').trim() || undefined,
        room_quantity,
      },
    ];
  }

  fichaHasMultipleRoomTypes(d: FileAADetailRow): boolean {
    const raw = d.observation_extras?.['merged_rooms'];
    if (Array.isArray(raw) && raw.length > 1) return true;
    return this.fichaMergedRoomsFromExtras(d).length > 1;
  }

  fichaMergedRoomLabel(slot: FichaMergedRoomSlot, index: number): string {
    const name = (slot.room_file_aa_name ?? '').trim();
    return name || `Hab ${index + 1}`;
  }

  ensureHotelMergedRoomQtyDraft(d: FileAADetailRow, index: number): number | null {
    const draft = this.ensureHotelFichaObsDraft(d);
    if (!draft.merged_slots?.[index]) return null;
    return draft.merged_slots[index].room_quantity;
  }

  setHotelMergedRoomQtyDraft(d: FileAADetailRow, index: number, raw: unknown): void {
    const draft = this.ensureHotelFichaObsDraft(d);
    if (!draft.merged_slots?.[index]) return;
    draft.merged_slots[index].room_quantity = this.parseHotelRoomQuantityInput(raw);
    this.bumpHotelFichaPriceRev();
  }

  fichaReplaceRoomOptions(d: FileAADetailRow): { slotIndex: number; label: string }[] {
    return this.fichaMergedRoomsFromExtras(d).map((slot, i) => ({
      slotIndex: i,
      label: this.fichaMergedRoomPartLabel(slot, true) || this.fichaMergedRoomLabel(slot, i),
    }));
  }

  ensureHotelFichaObsDraft(d: FileAADetailRow): FileAADetailRoomObsState {
    if (!this.hotelFichaObsDraft[d.id]) {
      this.hotelFichaObsDraft[d.id] = { ...this.hotelFichaObsFromServer(d) };
    }
    return this.hotelFichaObsDraft[d.id];
  }

  /** Cantidad para la columna Service (borrador en edición o valor guardado). */
  fichaRoomQuantityDisplay(d: FileAADetailRow): number | null {
    if (this.fichaHasMultipleRoomTypes(d)) return null;
    const draft = this.hotelFichaObsDraft[d.id];
    if (draft && draft.room_quantity !== null && draft.room_quantity !== undefined) {
      return draft.room_quantity;
    }
    const raw = d.observation_extras?.['room_quantity'];
    if (raw === null || raw === undefined || raw === '') return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }

  private parseHotelRoomQuantityInput(raw: unknown): number | null {
    if (raw === null || raw === undefined || raw === '') return null;
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 1) return null;
    return Math.trunc(n);
  }

  onHotelRoomQuantityInput(d: FileAADetailRow, event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    this.ensureHotelFichaObsDraft(d).room_quantity = this.parseHotelRoomQuantityInput(target.value);
    this.bumpHotelFichaPriceRev();
  }

  onHotelFichaDraftChange(d: FileAADetailRow): void {
    this.bumpHotelFichaPriceRev();
  }

  private bumpHotelFichaPriceRev(): void {
    this.hotelFichaPriceRev.update((n) => n + 1);
  }

  /** Guarda cantidad de habitaciones leyendo el input directamente (ngModel puede ir un tick detrás). */
  commitHotelRoomQuantityObs(d: FileAADetailRow, event: Event): void {
    const target = event.target instanceof HTMLInputElement ? event.target : null;
    if (target) {
      this.ensureHotelFichaObsDraft(d).room_quantity = this.parseHotelRoomQuantityInput(target.value);
      this.bumpHotelFichaPriceRev();
    }
    this.commitHotelFichaObs(d);
  }

  /** En blur, ngModel puede ir un tick detrás: leemos el input/textarea que perdió el foco. */
  private applyHotelFichaBlurTarget(d: FileAADetailRow, target: EventTarget | null): void {
    if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) return;
    const row = this.ensureHotelFichaObsDraft(d);
    const val = target.value;
    switch (target.id) {
      case `aa-rmq-${d.id}`:
        row.room_quantity = this.parseHotelRoomQuantityInput(val);
        break;
      case `aa-rno-${d.id}`:
        row.notes = val;
        break;
      default:
        break;
    }
  }

  commitHotelFichaObs(d: FileAADetailRow, event?: Event): void {
    const target = event?.target ?? null;
    // El blur del número de habitaciones lo maneja commitHotelRoomQuantityObs (change).
    if (target instanceof HTMLInputElement && target.id === `aa-rmq-${d.id}`) {
      return;
    }
    if (
      target instanceof HTMLInputElement &&
      target.id.startsWith(`aa-rmq-${d.id}-`)
    ) {
      const idx = Number(target.id.slice(`aa-rmq-${d.id}-`.length));
      if (Number.isFinite(idx)) {
        this.setHotelMergedRoomQtyDraft(d, idx, target.value);
      }
    }
    if (target) {
      this.applyHotelFichaBlurTarget(d, target);
    }
    const row = this.ensureHotelFichaObsDraft(d);
    const built = this.buildHotelObservationExtrasFromDraft(d, row);
    const observation_extras = built.observation_extras;
    const datesCell = built.datesCell;
    const notesTrim = row.notes.trim();
    const patch: FileAADetailPatch = {
      observation_extras,
      observations: notesTrim ? notesTrim : null,
      dates: datesCell,
    };
    const hotelOnly = this.fichaHotelSystemPriceFromExtras(observation_extras, d);
    const attached = this.fichaHotelAttachedActivitiesTotal(d);
    if (hotelOnly !== null) {
      patch.total_price = Number((hotelOnly + attached).toFixed(2));
    }
    this.patchFileDetail(d.id, patch);
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

  /** Precio sistema en vivo para filas hotel (neto + actividades fusionadas). */
  fichaHotelSystemPriceDisplay(d: FileAADetailRow): string {
    this.hotelFichaPriceRev();
    if (d.category !== 'room') {
      return this.fichaDetailPriceDisplay(d.total_price);
    }
    const attached = this.fichaHotelAttachedActivitiesTotal(d);
    const preview = this.previewHotelSystemPriceFromDraft(d);
    if (preview !== null) {
      return this.fichaDetailPriceDisplay(Number((preview + attached).toFixed(2)));
    }
    return this.fichaDetailPriceDisplay(d.total_price);
  }

  /** Construye extras como en commit y calcula precio sin persistir (vista previa). */
  private previewHotelSystemPriceFromDraft(d: FileAADetailRow): number | null {
    const draft = this.hotelFichaObsDraft[d.id] ?? this.hotelFichaObsFromServer(d);
    const { observation_extras } = this.buildHotelObservationExtrasFromDraft(d, draft);
    return this.fichaHotelSystemPriceFromExtras(observation_extras, d);
  }

  /**
   * Arma ``observation_extras`` y la celda Fechas desde el borrador.
   * Siempre sincroniza ``merged_rooms`` (incluso con ``room_id`` nulo).
   */
  private buildHotelObservationExtrasFromDraft(
    d: FileAADetailRow,
    row: FileAADetailRoomObsState,
  ): { observation_extras: Record<string, unknown>; datesCell: string } {
    const room_quantity = this.parseHotelRoomQuantityInput(row.room_quantity);
    row.room_quantity = room_quantity;
    const prev =
      d.observation_extras && typeof d.observation_extras === 'object' && !Array.isArray(d.observation_extras)
        ? { ...(d.observation_extras as Record<string, unknown>) }
        : {};
    this.backfillHotelRackSnapshotFields(prev, d);
    const prevMerged = (prev['merged_rooms'] as unknown[]) ?? [];
    const differentStays = this.fichaHotelRoomsHaveDifferentStays(d);
    const rowSegments = row.stay_segments?.length
      ? row.stay_segments
      : this.parseHotelStaySegments(row.ficha_entrada ?? '', row.ficha_salida ?? '', d, prev);
    const rowFields = this.segmentsToFichaFields(rowSegments);
    const datesLines: string[] = [];
    if (rowFields.ficha_entrada) datesLines.push(`Entrada: ${rowFields.ficha_entrada}`);
    if (rowFields.ficha_salida) datesLines.push(`Salida: ${rowFields.ficha_salida}`);
    if (rowFields.ficha_noches_texto) datesLines.push(`Noches: ${rowFields.ficha_noches_texto}`);
    const datesCell = datesLines.join('\n');
    const observation_extras: Record<string, unknown> = { ...prev };

    if (Array.isArray(prevMerged) && prevMerged.length > 0) {
      const multiType = prevMerged.length > 1;
      const entTexts: string[] = [];
      const salTexts: string[] = [];
      const nocTexts: string[] = [];
      const updatedMerged = prevMerged.map((item, i) => {
        const base =
          item && typeof item === 'object' ? { ...(item as Record<string, unknown>) } : {};
        this.backfillHotelRackSnapshotFields(base, d, { slotCount: prevMerged.length });
        let slotQty: number;
        if (multiType) {
          const draftSlot = row.merged_slots?.[i];
          slotQty =
            this.parseHotelRoomQuantityInput(draftSlot?.room_quantity) ??
            this.parseHotelRoomQuantityInput(base['room_quantity']) ??
            1;
        } else {
          slotQty =
            room_quantity ?? this.parseHotelRoomQuantityInput(base['room_quantity']) ?? 1;
        }
        const slotSegments =
          differentStays && row.merged_slots?.[i]?.stay_segments?.length
            ? row.merged_slots[i].stay_segments!
            : rowSegments;
        const slotFields = this.segmentsToFichaFields(slotSegments);
        entTexts.push(slotFields.ficha_entrada);
        salTexts.push(slotFields.ficha_salida);
        nocTexts.push(slotFields.ficha_noches_texto);
        const roomDatesIso = this.segmentsToRoomDatesIso(slotSegments);
        const dateFrom = roomDatesIso[0] ?? String(base['date_from'] ?? d.date_from ?? '');
        const dateTo = roomDatesIso.length
          ? this.isoAddDays(roomDatesIso[roomDatesIso.length - 1], 0)
          : String(base['date_to'] ?? d.date_to ?? '');
        return {
          ...base,
          room_quantity: slotQty,
          ficha_entrada: slotFields.ficha_entrada,
          ficha_salida: slotFields.ficha_salida,
          ficha_noches_texto: slotFields.ficha_noches_texto,
          room_dates_iso: roomDatesIso,
          date_from: dateFrom,
          date_to: dateTo,
        };
      });
      observation_extras['merged_rooms'] = updatedMerged;
      observation_extras['ficha_entrada'] = differentStays
        ? this.joinFichaYFields(entTexts)
        : rowFields.ficha_entrada;
      observation_extras['ficha_salida'] = differentStays
        ? this.joinFichaYFields(salTexts)
        : rowFields.ficha_salida;
      observation_extras['ficha_noches_texto'] = differentStays
        ? this.joinFichaYFields(nocTexts)
        : rowFields.ficha_noches_texto;
      observation_extras['room_dates_iso'] = this.segmentsToRoomDatesIso(rowSegments);
      if (!multiType) {
        observation_extras['room_quantity'] = updatedMerged[0]['room_quantity'];
      } else {
        observation_extras['room_quantity'] = updatedMerged.reduce(
          (sum, slot) => sum + Math.max(1, Number((slot as Record<string, unknown>)['room_quantity']) || 1),
          0,
        );
      }
    } else {
      observation_extras['ficha_entrada'] = rowFields.ficha_entrada;
      observation_extras['ficha_salida'] = rowFields.ficha_salida;
      observation_extras['ficha_noches_texto'] = rowFields.ficha_noches_texto;
      observation_extras['room_quantity'] = room_quantity;
      observation_extras['room_dates_iso'] = this.segmentsToRoomDatesIso(rowSegments);
      this.backfillHotelRackSnapshotFields(observation_extras, d);
    }
    const mergedOut = observation_extras['merged_rooms'];
    if (Array.isArray(mergedOut) && mergedOut.length === 1) {
      const slot = mergedOut[0];
      if (slot && typeof slot === 'object') {
        for (const key of ['room_rack_per_night', 'rack_nights_base', 'rack_nightly_sum', 'room_quantity'] as const) {
          const val = (slot as Record<string, unknown>)[key];
          if (val !== undefined && val !== null && val !== '') {
            observation_extras[key] = val;
          }
        }
      }
    }
    return { observation_extras, datesCell };
  }

  fichaHasLargePriceGap(detail: FileAADetailRow): boolean {
    const system = Number(detail.total_price ?? 0);
    const providerRaw = detail.provider_price;
    if (providerRaw === null || providerRaw === undefined || providerRaw === '') return false;
    const provider = Number(providerRaw);
    if (!Number.isFinite(system) || !Number.isFinite(provider)) return false;
    if (provider <= 0) return false;
    const base = Math.max(Math.abs(system), Math.abs(provider));
    if (base <= 0) return false;
    return Math.abs(system - provider) / base >= 0.05;
  }

  /** Suma noches en texto tipo «3» o «2 y 3». */
  private parseFichaNochesCount(text: string | null | undefined): number {
    const raw = (text ?? '').trim();
    if (!raw) return 0;
    let total = 0;
    for (const part of raw.split(/\s+y\s+/i)) {
      const chunk = part.trim();
      if (!chunk) continue;
      const n = parseInt(chunk, 10);
      if (Number.isFinite(n)) {
        total += n;
        continue;
      }
      const m = /\d+/.exec(chunk);
      if (m) total += parseInt(m[0], 10);
    }
    return total;
  }

  /**
   * Congela tarifa neta/noche a partir de ``rack_nightly_sum`` o, en fichas antiguas,
   * del ``total_price`` actual del detalle (antes de editar noches/cantidad).
   */
  private backfillHotelRackSnapshotFields(
    extras: Record<string, unknown>,
    detail?: FileAADetailRow,
    opts?: { slotCount?: number },
  ): void {
    if (extras['room_rack_per_night']) return;
    let sum = this.coerceDecimalLike(extras['rack_nightly_sum']);
    if (sum === null && detail) {
      const total = Number(detail.total_price);
      if (Number.isFinite(total) && total > 0) {
        const slotCount = opts?.slotCount && opts.slotCount > 0 ? opts.slotCount : 1;
        const share = total / slotCount;
        let nights = this.parseFichaNochesCount(String(extras['ficha_noches_texto'] ?? ''));
        if (nights <= 0 && detail.dates) {
          nights = this.parseFichaNochesCount(
            this.parseFichaHotelDatesCell(detail.dates).ficha_noches_texto,
          );
        }
        if (nights <= 0 && detail.days) nights = Math.max(1, Number(detail.days));
        if (nights <= 0) nights = 1;
        const qty = Math.max(1, Math.floor(Number(extras['room_quantity']) || 1));
        const perNight = share / (nights * qty);
        extras['rack_nights_base'] = nights;
        extras['room_rack_per_night'] = Number(perNight.toFixed(2));
        extras['rack_nightly_sum'] = Number((perNight * nights).toFixed(2));
        return;
      }
    }
    if (sum === null) return;
    let base = Number(extras['rack_nights_base']);
    if (!Number.isFinite(base) || base <= 0) {
      base = this.parseFichaNochesCount(String(extras['ficha_noches_texto'] ?? ''));
    }
    if (base <= 0) base = 1;
    extras['rack_nights_base'] = base;
    extras['room_rack_per_night'] = Number((sum / base).toFixed(2));
  }

  private fichaRoomRackPerNight(extras: Record<string, unknown>): number | null {
    const explicit = this.coerceDecimalLike(extras['room_rack_per_night']);
    if (explicit !== null) return explicit;
    const sum = this.coerceDecimalLike(extras['rack_nightly_sum']);
    if (sum === null) return null;
    let base = Number(extras['rack_nights_base']);
    if (!Number.isFinite(base) || base <= 0) {
      base = this.parseFichaNochesCount(String(extras['ficha_noches_texto'] ?? ''));
    }
    if (base <= 0) base = 1;
    return Number((sum / base).toFixed(4));
  }

  private fichaRoomSystemPriceFromSlot(slot: Record<string, unknown>): number | null {
    const perNight = this.fichaRoomRackPerNight(slot);
    if (perNight === null) return null;
    let nights = this.parseFichaNochesCount(String(slot['ficha_noches_texto'] ?? ''));
    if (nights <= 0) {
      const base = Number(slot['rack_nights_base']);
      nights = Number.isFinite(base) && base > 0 ? base : 1;
    }
    const qty = Math.max(1, Math.floor(Number(slot['room_quantity']) || 1));
    return Number((perNight * nights * qty).toFixed(2));
  }

  /** Precio sistema hotel: neto/noche × noches × cantidad de habitaciones (por tipología). */
  private fichaHotelSystemPriceFromExtras(
    observation_extras: Record<string, unknown>,
    detail?: FileAADetailRow,
  ): number | null {
    const working = { ...observation_extras };
    const merged = working['merged_rooms'];
    if (Array.isArray(merged) && merged.length > 0) {
      let sum = 0;
      let any = false;
      for (const item of merged) {
        if (!item || typeof item !== 'object') continue;
        const slot = { ...(item as Record<string, unknown>) };
        this.backfillHotelRackSnapshotFields(slot, detail, { slotCount: merged.length });
        const part = this.fichaRoomSystemPriceFromSlot(slot);
        if (part !== null) {
          sum += part;
          any = true;
        }
      }
      return any ? Number(sum.toFixed(2)) : null;
    }
    this.backfillHotelRackSnapshotFields(working, detail);
    return this.fichaRoomSystemPriceFromSlot(working);
  }

  /** Fila creada desde "Añadir línea" (nueva o reemplazo): se resalta en verde. */
  fichaIsAddedDetail(detail: FileAADetailRow): boolean {
    const raw = detail.observation_extras;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false;
    const anchorId = String((raw as Record<string, unknown>)['sort_after_detail_id'] ?? '').trim();
    if (!anchorId.length) return false;
    if (
      detail.category === 'room' &&
      this.fichaHasMultipleRoomTypes(detail) &&
      this.fichaMergedRoomsFromExtras(detail).some((s) => s.is_replacement)
    ) {
      return false;
    }
    return true;
  }

  openFichaAddDetailDialog(anchor: FileAADetailRow): void {
    this.fichaAddAnchorRow.set(anchor);
    this.fichaAddAnchorDetailId.set(anchor.id);
    this.fichaAddDetailStep.set('kind');
    this.fichaAddKind.set(null);
    this.fichaAddReplaceRoomId.set(null);
    this.fichaAddReplaceRoomSlotIndex.set(null);
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
    this.fichaAddReplaceRoomId.set(null);
    this.fichaAddReplaceRoomSlotIndex.set(null);
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
    if (
      kind === 'replace' &&
      anchor.category === 'room' &&
      this.fichaHasMultipleRoomTypes(anchor)
    ) {
      this.fichaAddDetailStep.set('pick-room');
      this.fichaAddReplaceRoomId.set(null);
      this.fichaAddReplaceRoomSlotIndex.set(null);
      return;
    }
    this.fichaAddDetailStep.set('pick');
    this.loadingFichaAddSource.set(true);
    this.fichaAddSelectedPickKey.set(null);
    this.loadFichaAddSourcePickItems(anchor);
  }

  private loadFichaAddSourcePickItems(anchor: FileAADetailRow): void {
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
    if (this.fichaAddDetailStep() === 'pick') {
      const anchor = this.fichaAddAnchorRow();
      if (
        this.fichaAddKind() === 'replace' &&
        anchor?.category === 'room' &&
        this.fichaHasMultipleRoomTypes(anchor)
      ) {
        this.fichaAddDetailStep.set('pick-room');
        this.fichaAddSelectedPickKey.set(null);
        this.fichaAddSourcePickItems.set([]);
        return;
      }
    }
    if (this.fichaAddDetailStep() === 'pick-room') {
      this.fichaAddDetailStep.set('kind');
      this.fichaAddKind.set(null);
      this.fichaAddReplaceRoomId.set(null);
      this.fichaAddReplaceRoomSlotIndex.set(null);
      return;
    }
    if (this.fichaAddDetailStep() !== 'pick') return;
    this.fichaAddDetailStep.set('kind');
    this.fichaAddKind.set(null);
    this.fichaAddSelectedPickKey.set(null);
    this.fichaAddSourcePickItems.set([]);
  }

  onFichaReplaceRoomSlotPick(slotIndex: number | null): void {
    this.fichaAddReplaceRoomSlotIndex.set(slotIndex);
    if (slotIndex === null) {
      this.fichaAddReplaceRoomId.set(null);
      return;
    }
    const anchor = this.fichaAddAnchorRow();
    if (!anchor) return;
    const slot = this.fichaMergedRoomsFromExtras(anchor)[slotIndex];
    const rid = (slot?.room_id ?? '').trim();
    this.fichaAddReplaceRoomId.set(rid || null);
  }

  continueFichaAddAfterRoomPick(): void {
    const anchor = this.fichaAddAnchorRow();
    if (!anchor || this.fichaAddReplaceRoomSlotIndex() === null) return;
    this.fichaAddDetailStep.set('pick');
    this.loadFichaAddSourcePickItems(anchor);
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
      body = {
        ...base,
        category: 'room',
        room_id: item.roomId,
        ...(kind === 'replace' && this.fichaAddReplaceRoomSlotIndex() !== null
          ? {
              replace_room_slot_index: this.fichaAddReplaceRoomSlotIndex()!,
              ...(this.fichaAddReplaceRoomId()
                ? { replace_room_id: this.fichaAddReplaceRoomId()! }
                : {}),
            }
          : {}),
      };
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
        if (q) this.loadFileAA(q.id);
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
            if (q) this.loadFileAA(q.id);
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

  private readonly fichaChecklistPrefixes = [
    'Cama para bebés',
    'Fecha Especial',
    'Aire acondicionado',
    'Persona con discapacidad',
    'Habitaciones communicante',
    'Sillas para bebés',
  ] as const;

  private stripChecklistBlock(obs: string): string {
    const src = (obs || '').trim();
    if (!src) return '';
    const cleaned = src
      .split('\n')
      .map((l) => l.trim())
      .filter((line) => {
        if (!line) return false;
        if (line === '--- Checklist Ficha AA ---' || line === '--- Fin Checklist Ficha AA ---') return false;
        return !this.fichaChecklistPrefixes.some((p) => line.startsWith(p));
      });
    return cleaned.join('\n').trim();
  }

  private buildChecklistObservationLines(): string[] {
    const lines: string[] = [];
    if (this.fichaNeedBabyBed()) lines.push('Cama para bebés');
    if (this.fichaNeedAC()) lines.push('Aire acondicionado');
    if (this.fichaNeedConnectingRooms()) lines.push('Habitaciones communicante');
    if (this.fichaNeedBabyChairs()) lines.push('Sillas para bebés');
    if (this.fichaHasDisability()) {
      const info = (this.fichaDisabilityInfo() || '').trim();
      lines.push(info ? `Persona con discapacidad: ${info}` : 'Persona con discapacidad');
    }
    return lines;
  }

  private mergedObservationWithChecklist(base: string | null, lines: string[]): string | null {
    const clean = this.stripChecklistBlock(base ?? '');
    if (!lines.length) return clean || null;
    return [clean, ...lines].filter(Boolean).join('\n').trim();
  }

  private applyChecklistToFicha(ficha: FileAAWithDetails): void {
    const checklistLines = this.buildChecklistObservationLines();
    const mergedObs = this.mergedObservationWithChecklist(ficha.observations ?? null, checklistLines);
    const mergedStr = (mergedObs ?? '').trim();
    const currentObs = (ficha.observations ?? '').trim();

    for (const d of ficha.details) {
      if (d.row_status === 'red') continue;
      const clean = this.stripChecklistBlock(d.observations ?? '');
      const cleanStr = (clean || '').trim();
      const rowObs = (d.observations ?? '').trim();
      if (rowObs !== cleanStr) {
        this.patchFileDetail(d.id, { observations: cleanStr || null });
      }
    }

    if (mergedStr !== currentObs) {
      this.quotationService.updateFileAA(ficha.id, { observations: mergedObs ?? undefined }).subscribe({
        next: (updated) => {
          const cur = this.fichaFileAA();
          if (cur?.id === ficha.id) {
            this.fichaFileAA.set({ ...cur, ...updated });
          }
          this.fichaObservationsDraft.set((mergedObs ?? '').toString());
        },
        error: (err) => {
          this.messageService.add({
            severity: 'error',
            summary:
              typeof err.error?.detail === 'string'
                ? err.error.detail
                : 'No se pudo actualizar las observaciones de la ficha',
          });
        },
      });
    } else {
      this.fichaObservationsDraft.set(mergedStr);
    }
  }

  private resetChecklistDraft(): void {
    this.fichaNeedBabyBed.set(false);
    this.fichaNeedAC.set(false);
    this.fichaHasDisability.set(false);
    this.fichaDisabilityInfo.set('');
    this.fichaNeedConnectingRooms.set(false);
    this.fichaNeedBabyChairs.set(false);
  }

  private hydrateChecklistFromFicha(ficha: FileAAWithDetails | null): void {
    this.resetChecklistDraft();
    if (!ficha) return;

    const obsLines = String(ficha.observations ?? '')
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    const findInObs = (prefix: string) => obsLines.find((l) => l.startsWith(prefix)) ?? '';

    const findInDetails = (prefix: string): string => {
      for (const d of (ficha.details || []).filter((r) => r.row_status !== 'red')) {
        const match = String(d.observations ?? '')
          .split('\n')
          .map((l) => l.trim())
          .find((l) => l.startsWith(prefix));
        if (match) return match;
      }
      return '';
    };

    const findLine = (prefix: string) => findInObs(prefix) || findInDetails(prefix);

    this.fichaNeedBabyBed.set(!!findLine('Cama para bebés'));
    this.fichaNeedAC.set(!!findLine('Aire acondicionado'));
    this.fichaNeedConnectingRooms.set(!!findLine('Habitaciones communicante'));
    this.fichaNeedBabyChairs.set(!!findLine('Sillas para bebés'));

    const disability = findLine('Persona con discapacidad');
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

  /** Línea « Généré le … » en hora local del navegador (fuseau de l’utilisateur). */
  private fichaExportGeneratedDisplayFr(): string {
    const d = new Date();
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(-2);
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `Généré le ${dd}/${mm}/${yy}, à ${hh}H${mi}`;
  }

  private fileNameFromContentDisposition(cd: string | null, fallback: string): string {
    if (!cd) return fallback;
    const star = /filename\*=(?:UTF-8''|utf-8'')([^;\n]+)/i.exec(cd);
    if (star?.[1]) {
      try {
        return decodeURIComponent(star[1].trim().replace(/^"(.*)"$/, '$1'));
      } catch {
        /* ignore */
      }
    }
    const quoted = /filename="([^"]+)"/i.exec(cd);
    if (quoted?.[1]) return quoted[1];
    const unquoted = /filename=([^;\n]+)/i.exec(cd);
    if (unquoted?.[1]) return unquoted[1].trim().replace(/^"(.*)"$/, '$1');
    return fallback;
  }

  downloadFichaAAOdt(): void {
    const f = this.fichaFileAA();
    if (!f?.id) return;
    this.downloadingFichaWord.set(true);
    this.quotationService.downloadFichaAAOdt(f.id, this.fichaExportGeneratedDisplayFr()).subscribe({
      next: (res: HttpResponse<Blob>) => {
        this.downloadingFichaWord.set(false);
        const blob = res.body;
        if (!blob) {
          this.messageService.add({ severity: 'error', summary: 'Error al generar ODT' });
          return;
        }
        if (blob.type === 'application/json' || blob.size < 32) {
          blob.text().then((t) => {
            try {
              const j = JSON.parse(t) as { detail?: string };
              this.messageService.add({
                severity: 'error',
                summary: typeof j.detail === 'string' ? j.detail : 'Error al generar ODT',
              });
            } catch {
              this.messageService.add({ severity: 'error', summary: 'Error al generar ODT' });
            }
          });
          return;
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = this.fileNameFromContentDisposition(
          res.headers.get('Content-Disposition'),
          'Ficha_AA.odt',
        );
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
          summary: 'No se pudo descargar el ODT',
        });
      },
    });
  }

  recalculateFichaSystemPrices(): void {
    const f = this.fichaFileAA();
    if (!f?.id) return;
    this.recalculatingFichaSystemPrices.set(true);
    this.quotationService.recalculateFileAASystemPrices(f.id).subscribe({
      next: (updated) => {
        this.recalculatingFichaSystemPrices.set(false);
        this.fichaFileAA.set({
          ...updated,
          header_color: updated.header_color || this.fichaHeaderColor(),
        });
        this.syncFichaVisibleDetailsList();
        this.messageService.add({
          severity: 'success',
          summary: 'Precios sistema actualizados',
        });
      },
      error: (err) => {
        this.recalculatingFichaSystemPrices.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'No se pudieron recalcular los precios',
          detail: err?.error?.detail ?? undefined,
        });
      },
    });
  }

  downloadFichaAAPdf(): void {
    const f = this.fichaFileAA();
    if (!f?.id) return;
    this.downloadingFichaPdf.set(true);
    this.quotationService.downloadFichaAAPdf(f.id, this.fichaExportGeneratedDisplayFr()).subscribe({
      next: (res: HttpResponse<Blob>) => {
        this.downloadingFichaPdf.set(false);
        const blob = res.body;
        if (!blob) {
          this.messageService.add({ severity: 'error', summary: 'Error al generar PDF' });
          return;
        }
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
        a.download = this.fileNameFromContentDisposition(
          res.headers.get('Content-Disposition'),
          'Ficha_AA.pdf',
        );
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
        this.syncFichaVisibleDetailsList();
        this.hydrateChecklistFromFicha(generated);
        this.applyChecklistToFicha(generated);
        this.hydrateFichaFreeTextDrafts(generated);
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
    this.quotationService.deleteVehicle(id).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Vehículo eliminado' });
        this.refreshLines();
      },
      error: () => this.messageService.add({ severity: 'error', summary: 'Error al eliminar' }),
    });
  }
  
  deleteRoom(id: string) {
    this.quotationService.deleteRoom(id).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Habitación eliminada' });
        this.refreshLines();
      },
      error: () => this.messageService.add({ severity: 'error', summary: 'Error al eliminar' }),
    });
  }
  
  deleteActivity(id: string) {
    this.quotationService.deleteActivity(id).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Actividad eliminada' });
        this.refreshLines();
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