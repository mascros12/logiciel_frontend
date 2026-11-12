import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Province, Zone, ZoneListResponse } from '../../../../core/models/zone.model';
import { ZoneService } from '../../../../core/services/zone.service';

@Component({
  selector: 'app-zone-list',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    FormsModule,
    DatePipe,
    TableModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    SelectModule,
    ToastModule,
    ConfirmDialogModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './zone-list.html',
  styleUrl: './zone-list.scss',
})
export class ZoneList implements OnInit, OnDestroy {
  zones = signal<Zone[]>([]);
  loading = signal(false);
  saving = signal(false);
  showDialog = signal(false);
  editing = signal<Zone | null>(null);
  searchTerm = '';
  readonly imagePreview = signal<string | null>(null);
  private pendingImage: File | null = null;
  private imageObjectUrl: string | null = null;
  readonly rowsPerPage = 25;
  readonly rowsPerPageOptions = [25, 50, 100];

  form: FormGroup;

  readonly provinces: { label: string; value: Province }[] = [
    { label: 'San José', value: 'San Jose' },
    { label: 'Alajuela', value: 'Alajuela' },
    { label: 'Cartago', value: 'Cartago' },
    { label: 'Heredia', value: 'Heredia' },
    { label: 'Guanacaste', value: 'Guanacaste' },
    { label: 'Puntarenas', value: 'Puntarenas' },
    { label: 'Limón', value: 'Limon' },
  ];

  constructor(
    private fb: FormBuilder,
    private zoneService: ZoneService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      province: [null as Province | null, Validators.required],
    });
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.zoneService.getAll().subscribe({
      next: (res: ZoneListResponse) => {
        this.zones.set(res.items);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.messageService.add({ severity: 'error', summary: 'No se pudieron cargar las zonas' });
      },
    });
  }

  ngOnDestroy(): void {
    this.releaseImage();
  }

  openCreate(): void {
    this.editing.set(null);
    this.pendingImage = null;
    this.releaseImage();
    this.form.reset({ name: '', province: null });
    this.showDialog.set(true);
  }

  openEdit(zone: Zone): void {
    this.editing.set(zone);
    this.pendingImage = null;
    this.releaseImage();
    this.form.reset({
      name: zone.name,
      province: zone.province,
    });
    this.showDialog.set(true);
    if (zone.image_id) this.loadImage(zone.id);
  }

  onImage(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    input.value = '';
    this.pendingImage = file;
    this.releaseImage();
    if (!file) return;
    this.imageObjectUrl = URL.createObjectURL(file);
    this.imagePreview.set(this.imageObjectUrl);
  }

  clearImage(): void {
    const current = this.editing();
    this.pendingImage = null;
    this.releaseImage();
    if (!current?.image_id) return;
    this.zoneService.clearImage(current.id).subscribe({
      next: (zone) => {
        this.editing.set(zone);
        this.load();
      },
      error: () => this.messageService.add({
        severity: 'error',
        summary: 'No se pudo quitar la imagen',
      }),
    });
  }

  submit(): void {
    if (this.form.invalid) return;
    const current = this.editing();
    const values = this.form.getRawValue() as { name: string; province: Province };
    this.saving.set(true);

    const req = current
      ? this.zoneService.update(current.id, values)
      : this.zoneService.create(values);

    req.subscribe({
      next: (saved) => {
        const file = this.pendingImage;
        const finish = () => {
          this.saving.set(false);
          this.pendingImage = null;
          this.showDialog.set(false);
          this.messageService.add({
            severity: 'success',
            summary: current ? 'Zona actualizada' : 'Zona creada',
          });
          this.load();
        };
        if (!file) {
          finish();
          return;
        }
        this.zoneService.uploadImage(saved.id, file).subscribe({
          next: () => finish(),
          error: (err: { error?: { detail?: string } }) => {
            this.saving.set(false);
            this.messageService.add({
              severity: 'error',
              summary: typeof err.error?.detail === 'string'
                ? err.error.detail
                : 'La zona se guardó, pero la imagen no',
            });
            this.load();
          },
        });
      },
      error: (err: { error?: { detail?: string } }) => {
        this.saving.set(false);
        this.messageService.add({
          severity: 'error',
          summary:
            typeof err.error?.detail === 'string' ? err.error.detail : 'No se pudo guardar la zona',
        });
      },
    });
  }

  confirmDelete(event: Event, zone: Zone): void {
    this.confirmationService.confirm({
      target: event.target as EventTarget,
      message: `¿Eliminar la zona "${zone.name}"?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.zoneService.delete(zone.id).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Zona eliminada' });
            this.load();
          },
          error: (err: { error?: { detail?: string } }) => {
            this.messageService.add({
              severity: 'error',
              summary:
                typeof err.error?.detail === 'string'
                  ? err.error.detail
                  : 'No se pudo eliminar la zona',
            });
          },
        });
      },
    });
  }

  filteredZones(): Zone[] {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) return this.zones();
    return this.zones().filter((z) => {
      const name = z.name.toLowerCase();
      const province = z.province.toLowerCase();
      return name.includes(term) || province.includes(term);
    });
  }

  private loadImage(id: string): void {
    this.zoneService.image(id).subscribe({
      next: (blob) => {
        this.releaseImage();
        this.imageObjectUrl = URL.createObjectURL(blob);
        this.imagePreview.set(this.imageObjectUrl);
      },
    });
  }

  private releaseImage(): void {
    if (this.imageObjectUrl) URL.revokeObjectURL(this.imageObjectUrl);
    this.imageObjectUrl = null;
    this.imagePreview.set(null);
  }

  provinceLabel(province: Province): string {
    return this.provinces.find((p) => p.value === province)?.label ?? province;
  }
}
