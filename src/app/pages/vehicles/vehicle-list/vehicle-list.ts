import { Component, OnInit, signal, computed } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TabsModule } from 'primeng/tabs';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { TagModule } from 'primeng/tag';
import { MessageService, ConfirmationService } from 'primeng/api';
import { VehicleService } from '../../../core/services/vehicle.service';
import { Vehicle, VehicleSeason } from '../../../core/models/vehicle.model';
import { RichTextPipe } from '../../../core/pipes/rich-text.pipe';
import { FormsModule } from '@angular/forms';
import { VehicleFilterPipe } from './vehicle-filter.pipe';

@Component({
  selector: 'app-vehicle-list',
  standalone: true,
  imports: [
    ReactiveFormsModule, FormsModule,
    TableModule, ButtonModule, DialogModule,
    InputTextModule, InputNumberModule, ToastModule,
    ConfirmDialogModule, TabsModule, SelectModule,
    DatePickerModule, TagModule, RichTextPipe, VehicleFilterPipe,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './vehicle-list.html',
  styleUrl: './vehicle-list.scss',
})
export class VehicleList implements OnInit {
  vehicles = signal<Vehicle[]>([]);
  loading = signal(false);
  saving = signal(false);
  searchTerm = '';

  showDialog = signal(false);
  editingVehicle = signal<Vehicle | null>(null);

  // Para el dialog de temporada
  showSeasonDialog = signal(false);
  seasonVehicle = signal<Vehicle | null>(null);
  savingSeason = signal(false);

  form: FormGroup;
  seasonForm: FormGroup;

  gradeOptions = [
    { label: 'Pico', value: 'high' },
    { label: 'Alta', value: 'medium' },
    { label: 'Promocional', value: 'low' },
  ];

  gradeLabels: Record<string, string> = {
    high: 'Pico', medium: 'Alta', low: 'Promocional'
  };

  gradeSeverity: Record<string, 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast'> = {
    high: 'danger', medium: 'warn', low: 'success'
  };

  constructor(
    private router: Router,
    private vehicleService: VehicleService,
    private fb: FormBuilder,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      brand: ['', Validators.required],
      seats: [5, Validators.required],
      bag: [3, Validators.required],
      carryon_bag: [3, Validators.required],
      category: [''],
      commission: [1.2],
      // Diarios neto
      net_daily_high: [0],
      net_daily_medium: [0],
      net_daily_low: [0],
      // Diarios rack
      rack_daily_high: [0],
      rack_daily_medium: [0],
      rack_daily_low: [0],
      // Semanales neto
      net_weekly_high: [0],
      net_weekly_medium: [0],
      net_weekly_low: [0],
      // Semanales rack
      rack_weekly_high: [0],
      rack_weekly_medium: [0],
      rack_weekly_low: [0],
    });

    // Cálculo automático de rack
    const netFields = [
      'net_daily_high', 'net_daily_medium', 'net_daily_low',
      'net_weekly_high', 'net_weekly_medium', 'net_weekly_low',
    ];
    netFields.forEach(field => {
      this.form.get(field)!.valueChanges.subscribe(() => this.calcRack());
    });
    this.form.get('commission')!.valueChanges.subscribe(() => this.calcRack());

    this.seasonForm = this.fb.group({
      grade: [null, Validators.required],
      start_date: [null, Validators.required],
      end_date: [null, Validators.required],
      net_daily_price: [0, Validators.required],
      net_weekly_price: [0, Validators.required],
    });
  }

  goToDetail(v: Vehicle) {
    this.router.navigate(['/vehiculos', v.id]);
  }

  // ── Precios por año ───────────────────────────────────────────
  /** Años a mostrar: actual + próximos 2 (igual que hoteles) */
  getSeasonYears(): number[] {
    const y = new Date().getFullYear();
    return [y, y + 1, y + 2];
  }

  private priceFromSeasonOrBase(
    v: Vehicle,
    year: number,
    grade: 'high' | 'medium' | 'low',
    kind: 'daily' | 'weekly',
  ): number | null {
    const seasonsForYearGrade: VehicleSeason[] = (v.seasons || []).filter((s) => {
      const seasonYear = new Date(s.start_date).getFullYear();
      return seasonYear === year && s.grade === grade;
    });

    if (seasonsForYearGrade.length > 0) {
      const s = seasonsForYearGrade[0];
      return kind === 'daily' ? s.net_daily_price : s.net_weekly_price;
    }

    if (kind === 'daily') {
      if (grade === 'high') return v.net_daily_high;
      if (grade === 'medium') return v.net_daily_medium;
      return v.net_daily_low;
    } else {
      if (grade === 'high') return v.net_weekly_high;
      if (grade === 'medium') return v.net_weekly_medium;
      return v.net_weekly_low;
    }
  }

  priceForYearAndGrade(
    v: Vehicle,
    year: number,
    grade: 'high' | 'medium' | 'low',
    kind: 'daily' | 'weekly',
  ): string {
    const val = this.priceFromSeasonOrBase(v, year, grade, kind);
    return val !== null && val !== undefined ? `$${val}` : '—';
  }

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.vehicleService.getAll().subscribe({
      next: (res) => { this.vehicles.set(res.items); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  calcRack() {
    const c = this.form.get('commission')!.value ?? 1.92;
    const pairs = [
      ['net_daily_high', 'rack_daily_high'],
      ['net_daily_medium', 'rack_daily_medium'],
      ['net_daily_low', 'rack_daily_low'],
      ['net_weekly_high', 'rack_weekly_high'],
      ['net_weekly_medium', 'rack_weekly_medium'],
      ['net_weekly_low', 'rack_weekly_low'],
    ];
    pairs.forEach(([net, rack]) => {
      const val = this.form.get(net)!.value ?? 0;
      this.form.get(rack)!.setValue(
        Math.round(val * c * 100) / 100,
        { emitEvent: false }
      );
    });
  }

  openCreate() {
    this.editingVehicle.set(null);
    this.form.reset({
      seats: 5, bag: 3, carryon_bag: 3, commission: 1.2,
      net_daily_high: 0, net_daily_medium: 0, net_daily_low: 0,
      rack_daily_high: 0, rack_daily_medium: 0, rack_daily_low: 0,
      net_weekly_high: 0, net_weekly_medium: 0, net_weekly_low: 0,
      rack_weekly_high: 0, rack_weekly_medium: 0, rack_weekly_low: 0,
    });
    this.showDialog.set(true);
  }

  openEdit(v: Vehicle) {
    this.editingVehicle.set(v);
    this.form.patchValue(v);
    this.showDialog.set(true);
  }

  submit() {
    if (this.form.invalid) return;
    this.saving.set(true);
    const val = this.form.value;
    const id = this.editingVehicle()?.id;

    const req = id
      ? this.vehicleService.update(id, val)
      : this.vehicleService.create(val);

    req.subscribe({
      next: () => {
        this.showDialog.set(false);
        this.saving.set(false);
        this.messageService.add({ severity: 'success', summary: id ? 'Vehículo actualizado' : 'Vehículo creado' });
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.messageService.add({ severity: 'error', summary: err.error?.detail ?? 'Error al guardar' });
      },
    });
  }

  confirmDelete(event: Event, id: string) {
    this.confirmationService.confirm({
      target: event.target as EventTarget,
      message: '¿Eliminar este vehículo?',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.vehicleService.delete(id).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Vehículo eliminado' });
            this.load();
          },
        });
      },
    });
  }

  // ── Temporadas ──────────────────────────────────────────────
  openSeasons(v: Vehicle) {
    this.seasonVehicle.set(v);
    this.seasonForm.reset({ net_daily_price: 0, net_weekly_price: 0 });
    this.showSeasonDialog.set(true);
  }

  submitSeason() {
    if (this.seasonForm.invalid) return;
    const v = this.seasonVehicle()!;
    this.savingSeason.set(true);

    const val = this.seasonForm.value;
    const body = {
      ...val,
      start_date: this.formatDate(val.start_date),
      end_date: this.formatDate(val.end_date),
    };

    this.vehicleService.addSeason(v.id, body).subscribe({
      next: () => {
        this.savingSeason.set(false);
        this.seasonForm.reset({ net_daily_price: 0, net_weekly_price: 0 });
        this.messageService.add({ severity: 'success', summary: 'Temporada agregada' });
        // Recargar para ver la temporada en la lista
        this.vehicleService.getById(v.id).subscribe(updated => {
          this.seasonVehicle.set(updated);
          this.vehicles.update(list => list.map(x => x.id === updated.id ? updated : x));
        });
      },
      error: (err) => {
        this.savingSeason.set(false);
        this.messageService.add({ severity: 'error', summary: err.error?.detail ?? 'Error al agregar temporada' });
      },
    });
  }

  deleteSeason(seasonId: string) {
    const v = this.seasonVehicle()!;
    this.vehicleService.deleteSeason(v.id, seasonId).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Temporada eliminada' });
        this.vehicleService.getById(v.id).subscribe(updated => {
          this.seasonVehicle.set(updated);
          this.vehicles.update(list => list.map(x => x.id === updated.id ? updated : x));
        });
      },
    });
  }

  formatDate(d: Date): string {
    return d.toISOString().split('T')[0];
  }

  get dialogTitle(): string {
    return this.editingVehicle() ? 'Editar Vehículo' : 'Nuevo Vehículo';
  }

  seasonsByGrade(seasons: VehicleSeason[], grade: string) {
    return seasons.filter(s => s.grade === grade);
  }
}