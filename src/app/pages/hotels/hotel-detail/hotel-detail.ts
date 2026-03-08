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
import { Hotel, Room, RoomSeason } from '../../../core/models/hotel.model';

@Component({
  selector: 'app-hotel-detail',
  standalone: true,
  imports: [
    ReactiveFormsModule, ButtonModule, TableModule, DialogModule,
    InputTextModule, InputNumberModule, ToastModule,
    ConfirmDialogModule, TabsModule, SelectModule,
    DatePickerModule, TagModule, SkeletonModule, TooltipModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './hotel-detail.html',
  styleUrl: './hotel-detail.scss',
})
export class HotelDetail implements OnInit {
  hotel = signal<Hotel | null>(null);
  loading = signal(true);
  saving = signal(false);

  // Dialog habitación
  showRoomDialog = signal(false);
  editingRoom = signal<Room | null>(null);
  savingRoom = signal(false);

  // Dialog temporada de habitación
  showSeasonDialog = signal(false);
  seasonRoom = signal<Room | null>(null);
  savingSeason = signal(false);

  roomForm: FormGroup;
  seasonForm: FormGroup;

  gradeOptions = [
    { label: 'Alta',        value: 'high' },
    { label: 'Media',       value: 'medium' },
    { label: 'Promocional', value: 'low' },
  ];

  gradeLabels: Record<string, string> = { high: 'Alta', medium: 'Media', low: 'Promocional' };
  gradeSeverity: Record<string, 'danger' | 'warn' | 'success'> = {
    high: 'danger', medium: 'warn', low: 'success'
  };

  constructor(
    private route: ActivatedRoute,
    protected router: Router,
    private hotelService: HotelService,
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
      grade:              [null, Validators.required],
      start_date:         [null, Validators.required],
      end_date:           [null, Validators.required],
      net_price:          [0, Validators.required],
      net_additional_adult: [null],
      net_additional_child: [null],
    });
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.load(id);
  }

  load(id: string) {
    this.loading.set(true);
    this.hotelService.getById(id).subscribe({
      next: (h) => { this.hotel.set(h); this.loading.set(false); },
      error: () => { this.loading.set(false); this.router.navigate(['/hoteles']); },
    });
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

  // ── Temporadas de habitación ─────────────────────────────────
  openSeasons(room: Room) {
    this.seasonRoom.set(room);
    this.seasonForm.reset({ net_price: 0 });
    this.showSeasonDialog.set(true);
  }

  submitSeason() {
    if (this.seasonForm.invalid) return;
    const h = this.hotel()!;
    const room = this.seasonRoom()!;
    this.savingSeason.set(true);

    const val = this.seasonForm.value;
    const body = {
      ...val,
      start_date: this.formatDate(val.start_date),
      end_date:   this.formatDate(val.end_date),
    };

    this.hotelService.addRoomSeason(h.id, room.id, body).subscribe({
      next: () => {
        this.savingSeason.set(false);
        this.seasonForm.reset({ net_price: 0 });
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

  formatDate(d: Date): string {
    return d.toISOString().split('T')[0];
  }

  seasonsByGrade(seasons: RoomSeason[], grade: string) {
    return seasons.filter(s => s.grade === grade);
  }

  priceOrDash(val: number | null): string {
    return val !== null && val !== undefined ? `$${val}` : '—';
  }
}