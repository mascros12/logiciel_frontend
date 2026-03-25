import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DecimalPipe } from '@angular/common';

import { ButtonModule } from 'primeng/button';
import { TabsModule } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { SkeletonModule } from 'primeng/skeleton';

import { MessageService } from 'primeng/api';
import { RichTextPipe } from '../../../core/pipes/rich-text.pipe';

import { VehicleService } from '../../../core/services/vehicle.service';
import { Vehicle, VehicleSeason, VehicleSeasonCreate } from '../../../core/models/vehicle.model';

@Component({
  selector: 'app-vehicle-detail',
  standalone: true,
  templateUrl: './vehicle-detail.html',
  styleUrl: './vehicle-detail.scss',
  imports: [
    DecimalPipe, RichTextPipe,
    ReactiveFormsModule,
    ButtonModule, TabsModule, TagModule, TableModule,
    DialogModule, ToastModule, InputNumberModule,
    SelectModule, DatePickerModule, SkeletonModule,
  ],
  providers: [MessageService],
})
export class VehicleDetail implements OnInit {
  vehicle = signal<Vehicle | null>(null);
  loading = signal(true);

  showSeasonDialog = signal(false);
  savingSeason = signal(false);

  seasonForm: FormGroup;

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
    private vehicleService: VehicleService,
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
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/vehiculos']);
      return;
    }
    this.load(id);
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
}

