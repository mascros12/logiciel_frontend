import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DatePipe, DecimalPipe, CurrencyPipe, Location } from '@angular/common';

import { ButtonModule } from 'primeng/button';
import { TabsModule } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { SkeletonModule } from 'primeng/skeleton';

import { MessageService } from 'primeng/api';
import { RichTextPipe } from '../../../core/pipes/rich-text.pipe';

import { VehicleService } from '../../../core/services/vehicle.service';
import {
  Vehicle,
  VehicleSeason,
  VehicleSeasonCreate,
  DEFAULT_VEHICLE_CATEGORY,
  VEHICLE_CATEGORY_OPTIONS,
} from '../../../core/models/vehicle.model';
import { AuthService } from '../../../core/auth/auth.service';
import { canEditProviderReservationEmail } from '../../../core/utils/catalog-provider-email';

@Component({
  selector: 'app-vehicle-detail',
  standalone: true,
  templateUrl: './vehicle-detail.html',
  styleUrl: './vehicle-detail.scss',
  imports: [
    DatePipe, DecimalPipe, CurrencyPipe, RichTextPipe,
    ReactiveFormsModule,
    ButtonModule, TabsModule, TagModule, TableModule,
    DialogModule, ToastModule, InputTextModule, InputNumberModule,
    SelectModule, DatePickerModule, SkeletonModule,
  ],
  providers: [MessageService],
})
export class VehicleDetail implements OnInit {
  vehicle = signal<Vehicle | null>(null);
  loading = signal(true);

  showSeasonDialog = signal(false);
  savingSeason = signal(false);

  showVehicleMetaDialog = signal(false);
  savingVehicleMeta = signal(false);
  vehicleMetaForm: FormGroup;

  showVehicleEditDialog = signal(false);
  savingVehicleEdit = signal(false);
  vehicleEditForm: FormGroup;

  seasonForm: FormGroup;

  readonly categoryOptions = [...VEHICLE_CATEGORY_OPTIONS];

  gradeOptions = [
    { label: 'Temporada Pico', value: 'high' },
    { label: 'Temporada Alta', value: 'medium' },
    { label: 'Temporada Baja', value: 'low' },
  ];

  gradeLabels: Record<string, string> = {
    high: 'Pico',
    medium: 'Alta',
    low: 'Promocional',
  };

  gradeSeverity: Record<string, 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast'> = {
    high: 'danger',
    medium: 'warn',
    low: 'success',
  };

  constructor(
    private route: ActivatedRoute,
    protected router: Router,
    private location: Location,
    private vehicleService: VehicleService,
    private auth: AuthService,
    private fb: FormBuilder,
    private messageService: MessageService,
  ) {
    this.seasonForm = this.fb.group({
      grade: [null, Validators.required],
      start_date: [null, Validators.required],
      end_date: [null, Validators.required],
      net_daily_price: [0, Validators.required],
      net_weekly_price: [0, Validators.required],
    });

    this.vehicleMetaForm = this.fb.group({
      reservation_email: [''],
    });

    this.vehicleEditForm = this.fb.group({
      name: ['', Validators.required],
      brand: ['', Validators.required],
      seats: [5, Validators.required],
      bag: [3, Validators.required],
      carryon_bag: [3, Validators.required],
      category: [DEFAULT_VEHICLE_CATEGORY],
      reservation_email: [''],
      commission: [1.2],
      net_daily_high: [0],
      net_daily_medium: [0],
      net_daily_low: [0],
      rack_daily_high: [0],
      rack_daily_medium: [0],
      rack_daily_low: [0],
      net_weekly_high: [0],
      net_weekly_medium: [0],
      net_weekly_low: [0],
      rack_weekly_high: [0],
      rack_weekly_medium: [0],
      rack_weekly_low: [0],
    });

    const netFields = [
      'net_daily_high', 'net_daily_medium', 'net_daily_low',
      'net_weekly_high', 'net_weekly_medium', 'net_weekly_low',
    ];
    netFields.forEach((field) => {
      this.vehicleEditForm.get(field)!.valueChanges.subscribe(() => this.calcEditRack());
    });
    this.vehicleEditForm.get('commission')!.valueChanges.subscribe(() => this.calcEditRack());
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/vehiculos']);
      return;
    }
    this.load(id);
  }

  goBack(): void {
    this.location.back();
  }

  load(id: string) {
    this.loading.set(true);
    this.vehicleService.getById(id).subscribe({
      next: (v) => {
        this.vehicle.set(v);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.router.navigate(['/vehiculos']);
      },
    });
  }

  // ── Info helpers ──────────────────────────────────────────────
  priceOrDash(val: number | null | undefined): string {
    return val !== null && val !== undefined ? `$${val}` : '—';
  }

  // ── Temporadas ────────────────────────────────────────────────
  seasonsByGrade(grade: string): VehicleSeason[] {
    const v = this.vehicle();
    if (!v) return [];
    return v.seasons.filter(s => s.grade === grade);
  }

  openSeasonDialog() {
    this.seasonForm.reset({
      grade: null,
      start_date: null,
      end_date: null,
      net_daily_price: 0,
      net_weekly_price: 0,
    });
    this.showSeasonDialog.set(true);
  }

  submitSeason() {
    if (this.seasonForm.invalid || !this.vehicle()) return;
    const v = this.vehicle()!;
    this.savingSeason.set(true);

    const val = this.seasonForm.value;
    const body: VehicleSeasonCreate = {
      grade: val.grade as 'high' | 'medium' | 'low',
      start_date: this.formatDate(val.start_date),
      end_date: this.formatDate(val.end_date),
      net_daily_price: val.net_daily_price,
      net_weekly_price: val.net_weekly_price,
    };

    this.vehicleService.addSeason(v.id, body).subscribe({
      next: () => {
        this.savingSeason.set(false);
        this.showSeasonDialog.set(false);
        this.messageService.add({ severity: 'success', summary: 'Temporada agregada' });
        this.load(v.id);
      },
      error: (err) => {
        this.savingSeason.set(false);
        this.messageService.add({ severity: 'error', summary: err.error?.detail ?? 'Error al agregar temporada' });
      },
    });
  }

  deleteSeason(seasonId: string) {
    const v = this.vehicle();
    if (!v) return;
    this.vehicleService.deleteSeason(v.id, seasonId).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Temporada eliminada' });
        this.load(v.id);
      },
    });
  }

  formatDate(d: Date): string {
    return d.toISOString().split('T')[0];
  }

  openVehicleMetaDialog() {
    const v = this.vehicle();
    if (!v) return;
    this.vehicleMetaForm.patchValue({
      reservation_email: v.reservation_email ?? '',
    });
    this.showVehicleMetaDialog.set(true);
  }

  openVehicleEditDialog() {
    const v = this.vehicle();
    if (!v) return;
    this.vehicleEditForm.patchValue({
      ...v,
      category: v.category || DEFAULT_VEHICLE_CATEGORY,
      reservation_email: v.reservation_email ?? '',
    });
    this.showVehicleEditDialog.set(true);
  }

  calcEditRack() {
    const c = this.vehicleEditForm.get('commission')!.value ?? 1.92;
    const pairs = [
      ['net_daily_high', 'rack_daily_high'],
      ['net_daily_medium', 'rack_daily_medium'],
      ['net_daily_low', 'rack_daily_low'],
      ['net_weekly_high', 'rack_weekly_high'],
      ['net_weekly_medium', 'rack_weekly_medium'],
      ['net_weekly_low', 'rack_weekly_low'],
    ] as const;
    pairs.forEach(([net, rack]) => {
      const val = this.vehicleEditForm.get(net)!.value ?? 0;
      this.vehicleEditForm.get(rack)!.setValue(
        Math.round(val * c * 100) / 100,
        { emitEvent: false },
      );
    });
  }

  submitVehicleEdit() {
    if (this.vehicleEditForm.invalid) return;
    const v = this.vehicle();
    if (!v) return;
    this.savingVehicleEdit.set(true);
    const val = this.vehicleEditForm.value;
    this.vehicleService.update(v.id, val).subscribe({
      next: (updated) => {
        this.savingVehicleEdit.set(false);
        this.showVehicleEditDialog.set(false);
        this.vehicle.set(updated);
        this.messageService.add({ severity: 'success', summary: 'Vehículo actualizado' });
      },
      error: (err) => {
        this.savingVehicleEdit.set(false);
        this.messageService.add({
          severity: 'error',
          summary: err.error?.detail ?? 'Error al guardar',
        });
      },
    });
  }

  canManageVehicles(): boolean {
    const role = this.auth.currentUser()?.role;
    return role === 'admin' || role === 'admin_proveedores';
  }

  canEditProviderEmail(): boolean {
    return canEditProviderReservationEmail(this.auth.currentUser()?.role);
  }

  showEmailActions(): boolean {
    return this.canManageVehicles() || this.canEditProviderEmail();
  }

  submitVehicleMeta() {
    const v = this.vehicle();
    if (!v) return;
    const raw = (this.vehicleMetaForm.value.reservation_email ?? '') as string;
    const reservation_email = raw.trim() === '' ? null : raw.trim();
    this.savingVehicleMeta.set(true);
    const req = this.canManageVehicles()
      ? this.vehicleService.update(v.id, { reservation_email })
      : this.vehicleService.updateReservationEmail(v.id, reservation_email);
    req.subscribe({
      next: (updated) => {
        this.savingVehicleMeta.set(false);
        this.showVehicleMetaDialog.set(false);
        this.vehicle.set(updated);
        this.messageService.add({ severity: 'success', summary: 'Correo actualizado' });
      },
      error: (err) => {
        this.savingVehicleMeta.set(false);
        this.messageService.add({
          severity: 'error',
          summary: err.error?.detail ?? 'Error al guardar',
        });
      },
    });
  }
}

