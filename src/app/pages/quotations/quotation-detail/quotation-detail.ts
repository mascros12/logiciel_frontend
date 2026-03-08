import { Component, OnInit, signal, computed } from '@angular/core';
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
import { InputNumberModule } from 'primeng/inputnumber';
import { ToastModule } from 'primeng/toast';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { FormsModule } from '@angular/forms';
import { QuotationSummary } from '../../../core/models/quotation.model';

import { QuotationService } from '../../../core/services/quotation.service';
import { ProviderService } from '../../../core/services/provider.service';
import {
  QuotationFull, QuotationVersion, QuotationLine,
  AddVehicleRequest, AddRoomRequest, AddActivityRequest
} from '../../../core/models/quotation.model';
import {
  VehicleOption, HotelOption, RoomOption, ActivityOption
} from '../../../core/models/provider.model';

@Component({
  selector: 'app-quotation-detail',
  standalone: true,
  imports: [
    DatePipe, CurrencyPipe, NgClass, ReactiveFormsModule,
    TabsModule, ButtonModule, TableModule, TagModule,
    DialogModule, SelectModule, InputTextModule, InputNumberModule,
    ToastModule, SkeletonModule, TooltipModule, AutoCompleteModule,
    FormsModule,
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
    return q.versions.find(v => v.id === id) ?? q.current_version;
  });

  // Lines de la versión actual (cargadas del backend)
  lines = signal<QuotationLine[]>([]);

  // Dialogs
  showAddVehicle = signal(false);
  showAddRoom = signal(false);
  showAddActivity = signal(false);
  showNewVersion = signal(false);

  // Formularios
  vehicleForm: FormGroup;
  roomForm: FormGroup;
  activityForm: FormGroup;
  versionForm: FormGroup;

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

  constructor(
    private route: ActivatedRoute,
    private quotationService: QuotationService,
    private providerService: ProviderService,
    private fb: FormBuilder,
    private messageService: MessageService,
  ) {
    this.vehicleForm = this.fb.group({
      vehicle: [null, Validators.required],
    });
    this.roomForm = this.fb.group({
      hotel: [null, Validators.required],
      room: [null, Validators.required],
      additional_adults: [0],
      additional_children: [0],
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
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.load(id);
    this.loadProviders();
  }

  load(id: string) {
    this.loading.set(true);
    this.quotationService.getById(id).subscribe({
      next: (q) => {
        this.quotation.set(q);
        this.lines.set(q.lines ?? []);
        this.selectedVersionId.set(q.current_version?.id ?? null);
        this.loading.set(false);
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
    const q = this.quotation()!;
    const version = this.selectedVersion()!;
    if (!version) return;
  
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

  onHotelSelect(hotel: HotelOption) {
    this.roomForm.patchValue({ room: null });
    this.roomOptions.set([]);
    this.providerService.getRoomsByHotel(hotel.id).subscribe(r =>
      this.roomOptions.set(r.items)
    );
  }

  searchActivity(event: { query: string }) {
    const q = event.query.toLowerCase();
    this.activitySuggestions.set(
      this.activityOptions().filter(a => a.name.toLowerCase().includes(q))
    );
  }

  // ─── Abrir dialogs ─────────────────────────────────────────

  openAddVehicle(line: QuotationLine) {
    this.activeLine.set(line);
    this.vehicleForm.reset();
    this.showAddVehicle.set(true);
  }

  openAddRoom(line: QuotationLine) {
    this.activeLine.set(line);
    this.roomForm.reset({ additional_adults: 0, additional_children: 0 });
    this.roomOptions.set([]);
    this.showAddRoom.set(true);
  }

  openAddActivity(line: QuotationLine) {
    this.activeLine.set(line);
    this.activityForm.reset({ adults: 1, children: 0, free: 0 });
    this.showAddActivity.set(true);
  }

  // ─── Guardar items ─────────────────────────────────────────

  submitVehicle() {
    if (this.vehicleForm.invalid) return;
    const q = this.quotation()!;
    const version = this.selectedVersion()!;
    const line = this.activeLine()!;
    const vehicle: VehicleOption = this.vehicleForm.value.vehicle;

    this.saving.set(true);
    const body: AddVehicleRequest = {
      vehicle_id: vehicle.id,
      date: line.date,
    };

    this.quotationService.addVehicle(q.id, version.id, body).subscribe({
      next: () => {
        this.showAddVehicle.set(false);
        this.saving.set(false);
        this.messageService.add({ severity: 'success', summary: 'Vehículo agregado' });
        this.load(q.id);
      },
      error: (err) => {
        this.saving.set(false);
        this.messageService.add({
          severity: 'error',
          summary: err.error?.detail ?? 'Error al agregar vehículo'
        });
      }
    });
  }

  submitRoom() {
    if (this.roomForm.invalid) return;
    const q = this.quotation()!;
    const version = this.selectedVersion()!;
    const line = this.activeLine()!;
    const val = this.roomForm.value;

    this.saving.set(true);
    const body: AddRoomRequest = {
      room_id: val.room.id,
      date: line.date,
      additional_adults: val.additional_adults,
      additional_children: val.additional_children,
    };

    this.quotationService.addRoom(q.id, version.id, body).subscribe({
      next: () => {
        this.showAddRoom.set(false);
        this.saving.set(false);
        this.messageService.add({ severity: 'success', summary: 'Habitación agregada' });
        this.load(q.id);
      },
      error: (err) => {
        this.saving.set(false);
        this.messageService.add({
          severity: 'error',
          summary: err.error?.detail ?? 'Error al agregar habitación'
        });
      }
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
        this.load(q.id);
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
    this.selectedVersionId.set(versionId);
    const q = this.quotation()!;
    if (versionId !== q.current_version?.id) {
      this.quotationService.getById(q.id).subscribe(full => {
        this.lines.set(full.lines);
      });
    } else {
      this.lines.set(q.lines);
    }
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
}