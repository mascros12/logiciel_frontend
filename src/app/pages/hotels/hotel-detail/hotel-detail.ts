import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TabsModule } from 'primeng/tabs';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { TagModule } from 'primeng/tag';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService, ConfirmationService } from 'primeng/api';
import { HotelService } from '../../../core/services/hotel.service';
import { RichTextPipe } from '../../../core/pipes/rich-text.pipe';
import { AuthService } from '../../../core/auth/auth.service';
import {
  Hotel,
  HotelCategory,
  HotelCreate,
  Room,
  RoomSeason,
  RoomSeasonCreate,
  HotelSeason,
} from '../../../core/models/hotel.model';
import { DecimalPipe } from '@angular/common';
@Component({
  selector: 'app-hotel-detail',
  standalone: true,
  imports: [
    ReactiveFormsModule, ButtonModule, TableModule, DialogModule,
    InputTextModule, InputNumberModule, ToastModule,
    ConfirmDialogModule, TabsModule, SelectModule,
    DatePickerModule, TagModule, SkeletonModule, TooltipModule,
    DecimalPipe, RichTextPipe,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './hotel-detail.html',
  styleUrl: './hotel-detail.scss',
})
export class HotelDetail implements OnInit {
  hotel = signal<Hotel | null>(null);
  hotelSeasons = signal<HotelSeason[]>([]);
  loading = signal(true);
  saving = signal(false);
  activeTab = signal<'rooms' | 'seasons'>('rooms');

  // Dialog habitación
  showRoomDialog = signal(false);
  editingRoom = signal<Room | null>(null);
  savingRoom = signal(false);

  // Dialog temporada de habitación
  showSeasonDialog = signal(false);
  seasonRoom = signal<Room | null>(null);
  savingSeason = signal(false);

  // Dialog temporada del hotel
  showHotelSeasonDialog = signal(false);
  savingHotelSeason = signal(false);

  /** Editar datos generales del hotel (incl. correo reservas) */
  showHotelMetaDialog = signal(false);
  savingHotelMeta = signal(false);
  hotelMetaForm: FormGroup;

  roomForm: FormGroup;
  seasonForm: FormGroup;
  hotelSeasonForm: FormGroup;

  provincesMeta = [
    { label: 'San José', value: 'San Jose' },
    { label: 'Alajuela', value: 'Alajuela' },
    { label: 'Cartago', value: 'Cartago' },
    { label: 'Heredia', value: 'Heredia' },
    { label: 'Guanacaste', value: 'Guanacaste' },
    { label: 'Puntarenas', value: 'Puntarenas' },
    { label: 'Limón', value: 'Limon' },
  ];

  categoryOptions = [
    { label: 'Gama Alta', value: 'high' as const },
    { label: 'Gama Media', value: 'medium' as const },
    { label: 'Gama Baja', value: 'low' as const },
  ];

  /** Etiquetas para la gama del hotel (distintas de temporadas Pico/Alta/Baja). */
  categoryLabels: Record<string, string> = {
    high: 'Gama Alta',
    medium: 'Gama Media',
    low: 'Gama Baja',
  };

  gradeOptions = [
    { label: 'Temporada Pico', value: 'high' },
    { label: 'Temporada Alta', value: 'medium' },
    { label: 'Temporada Baja', value: 'low' },
  ];

  gradeLabels: Record<string, string> = { high: 'Pico', medium: 'Alta', low: 'Promocional' };
  gradeSeverity: Record<string, 'danger' | 'warn' | 'success'> = {
    high: 'danger', medium: 'warn', low: 'success'
  };

  /** Texto de gama en cabecera; valores legacy no mapeados se muestran tal cual. */
  hotelCategoryLabel(category: string): string {
    return category in this.categoryLabels ? this.categoryLabels[category] : category;
  }

  constructor(
    private route: ActivatedRoute,
    protected router: Router,
    private hotelService: HotelService,
    private auth: AuthService,
    private fb: FormBuilder,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
  ) {
    this.roomForm = this.fb.group({
      name: ['', Validators.required],
      net_high_price:        [null],
      rack_high_price:       [null],
      net_medium_price:      [null],
      rack_medium_price:     [null],
      net_low_price:         [null],
      rack_low_price:        [null],
      net_additional_adult:  [null],
      rack_additional_adult: [null],
      net_additional_child:  [null],
      rack_additional_child: [null],
    });

    // Calcular rack automáticamente
    const hotel = this.hotel;
    const netRackPairs = [
      ['net_high_price',       'rack_high_price'],
      ['net_medium_price',     'rack_medium_price'],
      ['net_low_price',        'rack_low_price'],
      ['net_additional_adult', 'rack_additional_adult'],
      ['net_additional_child', 'rack_additional_child'],
    ];
    netRackPairs.forEach(([net, rack]) => {
      this.roomForm.get(net)!.valueChanges.subscribe(() => this.calcRoomRack());
    });

    this.seasonForm = this.fb.group({
      grade:  [null, Validators.required],
      price:  [0, Validators.required],
      year:   [new Date().getFullYear(), Validators.required],
    });

    this.hotelSeasonForm = this.fb.group({
      grade:      [null, Validators.required],
      start_date: [null, Validators.required],
      end_date:   [null, Validators.required],
    });

    this.hotelMetaForm = this.fb.group({
      name: ['', Validators.required],
      province: [null as string | null],
      address: [''],
      category: [null as HotelCategory | null],
      commission: [1.2, Validators.required],
      reservation_email: [''],
    });
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.load(id);
  }

  load(id: string) {
    this.loading.set(true);
    this.hotelService.getById(id).subscribe({
      next: (h) => {
        this.hotel.set(h);
        this.loading.set(false);
        this.loadHotelSeasons(id);
      },
      error: () => { this.loading.set(false); this.router.navigate(['/hoteles']); },
    });
  }

  loadHotelSeasons(hotelId: string) {
    this.hotelService.getHotelSeasons(hotelId).subscribe({
      next: (list) => this.hotelSeasons.set(list),
      error: () => this.hotelSeasons.set([]),
    });
  }

  onTabChange(value: string | number | undefined) {
    this.activeTab.set(value === 'seasons' ? 'seasons' : 'rooms');
  }

  calcRoomRack() {
    const commission = this.hotel()?.commission ?? 1.92;
    const pairs = [
      ['net_high_price',       'rack_high_price'],
      ['net_medium_price',     'rack_medium_price'],
      ['net_low_price',        'rack_low_price'],
      ['net_additional_adult', 'rack_additional_adult'],
      ['net_additional_child', 'rack_additional_child'],
    ];
    pairs.forEach(([net, rack]) => {
      const val = this.roomForm.get(net)!.value;
      if (val !== null && val !== undefined) {
        this.roomForm.get(rack)!.setValue(
          Math.round(val * commission * 100) / 100,
          { emitEvent: false }
        );
      }
    });
  }

  // ── Habitaciones ────────────────────────────────────────────
  openAddRoom() {
    this.editingRoom.set(null);
    this.roomForm.reset();
    this.showRoomDialog.set(true);
  }

  openEditRoom(room: Room) {
    this.editingRoom.set(room);
    this.roomForm.patchValue(room);
    this.showRoomDialog.set(true);
  }

  submitRoom() {
    if (this.roomForm.invalid) return;
    const h = this.hotel()!;
    const id = this.editingRoom()?.id;
    this.savingRoom.set(true);

    const req = id
      ? this.hotelService.updateRoom(h.id, id, this.roomForm.value)
      : this.hotelService.addRoom(h.id, this.roomForm.value);

    req.subscribe({
      next: () => {
        this.showRoomDialog.set(false);
        this.savingRoom.set(false);
        this.messageService.add({ severity: 'success', summary: id ? 'Habitación actualizada' : 'Habitación agregada' });
        this.load(h.id);
      },
      error: (err) => {
        this.savingRoom.set(false);
        this.messageService.add({ severity: 'error', summary: err.error?.detail ?? 'Error' });
      },
    });
  }

  confirmDeleteRoom(event: Event, roomId: string) {
    this.confirmationService.confirm({
      target: event.target as EventTarget,
      message: '¿Eliminar esta habitación?',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.hotelService.deleteRoom(this.hotel()!.id, roomId).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Habitación eliminada' });
            this.load(this.hotel()!.id);
          },
        });
      },
    });
  }

  // ── Temporadas de habitación (RoomSeason: grade, price, year) ─
  openSeasons(room: Room) {
    this.seasonRoom.set(room);
    const currentYear = new Date().getFullYear();
    this.seasonForm.reset({ grade: null, price: 0, year: currentYear });
    this.showSeasonDialog.set(true);
  }

  submitSeason() {
    if (this.seasonForm.invalid) return;
    const h = this.hotel()!;
    const room = this.seasonRoom()!;
    this.savingSeason.set(true);
    const val = this.seasonForm.value;
    const body: RoomSeasonCreate = {
      grade: val.grade as 'high' | 'medium' | 'low',
      price: val.price,
      year: val.year,
    };

    this.hotelService.addRoomSeason(h.id, room.id, body).subscribe({
      next: () => {
        this.savingSeason.set(false);
        this.seasonForm.reset({ grade: null, price: 0, year: new Date().getFullYear() });
        this.messageService.add({ severity: 'success', summary: 'Temporada agregada' });
        this.hotelService.getById(h.id).subscribe(updated => {
          this.hotel.set(updated);
          const updatedRoom = updated.rooms.find(r => r.id === room.id);
          if (updatedRoom) this.seasonRoom.set(updatedRoom);
        });
      },
      error: (err) => {
        this.savingSeason.set(false);
        this.messageService.add({ severity: 'error', summary: err.error?.detail ?? 'Error' });
      },
    });
  }

  deleteSeason(seasonId: string) {
    const h = this.hotel()!;
    const room = this.seasonRoom()!;
    this.hotelService.deleteRoomSeason(h.id, room.id, seasonId).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Temporada eliminada' });
        this.hotelService.getById(h.id).subscribe(updated => {
          this.hotel.set(updated);
          const updatedRoom = updated.rooms.find(r => r.id === room.id);
          if (updatedRoom) this.seasonRoom.set(updatedRoom);
        });
      },
    });
  }

  /** Años a mostrar: actual + próximos 2 */
  getSeasonYears(): number[] {
    const y = new Date().getFullYear();
    return [y, y + 1, y + 2];
  }

  /** Opciones de año para el select del formulario de temporadas de habitación */
  getSeasonYearOptions() {
    return this.getSeasonYears().map(year => ({ label: year.toString(), value: year }));
  }

  formatDate(d: Date): string {
    return d.toISOString().split('T')[0];
  }

  /**
   * Precio a mostrar para un año y grade concreto.
   * Si existe RoomSeason para ese (year, grade), se usa su price; si no, se usa el precio base de la habitación.
   */
  priceForYearAndGrade(room: Room, year: number, grade: 'high' | 'medium' | 'low'): string {
    const season = (room.seasons || []).find(s => s.year === year && s.grade === grade);
    if (season) {
      return `$${season.price}`;
    }
    const base =
      grade === 'high'
        ? room.net_high_price
        : grade === 'medium'
          ? room.net_medium_price
          : room.net_low_price;
    return this.priceOrDash(base as number | null);
  }

  /**
   * Rack a mostrar para un año y grade concreto.
   * Si existe RoomSeason para ese (year, grade): rack = precio temporada × comisión del hotel.
   * Si no: se usa el rack base de la habitación.
   */
  rackForYearAndGrade(room: Room, year: number, grade: 'high' | 'medium' | 'low'): string {
    const commission = this.hotel()?.commission ?? 1.2;
    const season = (room.seasons || []).find(s => s.year === year && s.grade === grade);
    if (season) {
      const rack = Math.round(season.price * commission * 100) / 100;
      return `$${rack}`;
    }
    const base =
      grade === 'high'
        ? room.rack_high_price
        : grade === 'medium'
          ? room.rack_medium_price
          : room.rack_low_price;
    return this.priceOrDash(base as number | null);
  }

  /** Texto resumido de precios base (Pico / Alta / Baja) */
  basePricesSummary(room: Room): string {
    const a = room.net_high_price != null ? `$${room.net_high_price}` : '—';
    const m = room.net_medium_price != null ? `$${room.net_medium_price}` : '—';
    const b = room.net_low_price != null ? `$${room.net_low_price}` : '—';
    return `Pico ${a} · Alta ${m} · Baja ${b}`;
  }

  priceOrDash(val: number | null): string {
    return val !== null && val !== undefined ? `$${val}` : '—';
  }

  /** Rack calculado: precio × comisión del hotel (para temporadas de habitación) */
  rackFromSeasonPrice(price: number): string {
    const commission = this.hotel()?.commission ?? 1.2;
    const rack = Math.round(price * commission * 100) / 100;
    return `$${rack}`;
  }

  hotelSeasonsByGrade(grade: string): HotelSeason[] {
    return this.hotelSeasons().filter(s => s.grade === grade);
  }

  openAddHotelSeason() {
    this.hotelSeasonForm.reset();
    this.showHotelSeasonDialog.set(true);
  }

  submitHotelSeason() {
    if (this.hotelSeasonForm.invalid) return;
    const h = this.hotel();
    if (!h) return;
    const val = this.hotelSeasonForm.value;
    const body = {
      hotel_id: h.id,
      grade: val.grade,
      start_date: this.formatDate(val.start_date),
      end_date: this.formatDate(val.end_date),
    };
    this.savingHotelSeason.set(true);
    this.hotelService.addHotelSeason(h.id, body).subscribe({
      next: () => {
        this.savingHotelSeason.set(false);
        this.showHotelSeasonDialog.set(false);
        this.messageService.add({ severity: 'success', summary: 'Temporada agregada' });
        this.loadHotelSeasons(h.id);
      },
      error: (err) => {
        this.savingHotelSeason.set(false);
        this.messageService.add({ severity: 'error', summary: err.error?.detail ?? 'Error' });
      },
    });
  }

  deleteHotelSeason(season: HotelSeason) {
    const h = this.hotel();
    if (!h) return;
    this.hotelService.deleteHotelSeason(h.id, season.id).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Temporada eliminada' });
        this.loadHotelSeasons(h.id);
      },
    });
  }

  openHotelMetaDialog() {
    const h = this.hotel();
    if (!h) return;
    this.hotelMetaForm.patchValue({
      name: h.name,
      province: h.province,
      address: h.address ?? '',
      category: this.parseHotelCategory(h.category),
      commission: h.commission,
      reservation_email: h.reservation_email ?? '',
    });
    this.showHotelMetaDialog.set(true);
  }

  submitHotelMeta() {
    if (this.hotelMetaForm.invalid) return;
    const h = this.hotel();
    if (!h) return;
    this.savingHotelMeta.set(true);
    const v = this.hotelMetaForm.value as Partial<HotelCreate>;
    this.hotelService.update(h.id, v).subscribe({
      next: (updated) => {
        this.savingHotelMeta.set(false);
        this.showHotelMetaDialog.set(false);
        this.hotel.set(updated);
        this.messageService.add({ severity: 'success', summary: 'Hotel actualizado' });
      },
      error: (err) => {
        this.savingHotelMeta.set(false);
        this.messageService.add({
          severity: 'error',
          summary: err.error?.detail ?? 'Error al guardar',
        });
      },
    });
  }

  private parseHotelCategory(v: string | null | undefined): HotelCategory | null {
    if (v === 'high' || v === 'medium' || v === 'low') return v;
    return null;
  }

  stripRichTextMarkers(value: string | null | undefined): string {
    return String(value ?? '')
      .replace(/[*_~]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  canManageHotels(): boolean {
    const role = this.auth.currentUser()?.role;
    return role === 'admin' || role === 'admin_proveedores';
  }
}