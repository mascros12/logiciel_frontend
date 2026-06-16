import { Component, OnInit, signal } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ActivatedRoute, Router } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TagModule } from 'primeng/tag';
import { SelectModule } from 'primeng/select';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ActivityService } from '../../../core/services/activity.service';
import { Activity } from '../../../core/models/activity.model';
import { FormsModule } from '@angular/forms';
import { RichTextPipe } from '../../../core/pipes/rich-text.pipe';
import { AuthService } from '../../../core/auth/auth.service';
import {
  CATALOG_LIST_DEFAULT_ROWS,
  CATALOG_LIST_ROWS_OPTIONS,
  CatalogListState,
  clampCatalogListFirst,
  normalizeListStateAfterLoad,
  onCatalogSearchChange,
  onCatalogTablePage,
  readListStateFromRoute,
} from '../../../core/utils/list-url-state';
import { canEditProviderReservationEmail } from '../../../core/utils/catalog-provider-email';
import { ProviderReservationEmailDialogComponent } from '../../../shared/components/provider-reservation-email-dialog/provider-reservation-email-dialog.component';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'app-activity-list',
  standalone: true,
  imports: [
    DecimalPipe, ReactiveFormsModule, FormsModule,
    TableModule, ButtonModule, DialogModule,
    InputTextModule, InputNumberModule, ToastModule,
    ConfirmDialogModule, TagModule, SelectModule,
    RichTextPipe, ProviderReservationEmailDialogComponent, TooltipModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './activity-list.html',
  styleUrl: './activity-list.scss',
})
export class ActivityList implements OnInit {
  activities = signal<Activity[]>([]);
  total = signal(0);
  loading = signal(false);
  saving = signal(false);
  bulkDeleting = signal(false);
  selectedActivities: Activity[] = [];
  listState: CatalogListState = {
    searchTerm: '',
    first: 0,
    rows: CATALOG_LIST_DEFAULT_ROWS,
  };
  readonly rowsPerPageOptions = CATALOG_LIST_ROWS_OPTIONS;

  showDialog = signal(false);
  editingId = signal<string | null>(null);
  showProviderEmailDialog = signal(false);
  providerEmailTarget = signal<Activity | null>(null);
  savingProviderEmail = signal(false);

  form: FormGroup;

  provinces = [
    { label: 'San José', value: 'San Jose' },
    { label: 'Alajuela', value: 'Alajuela' },
    { label: 'Cartago', value: 'Cartago' },
    { label: 'Heredia', value: 'Heredia' },
    { label: 'Guanacaste', value: 'Guanacaste' },
    { label: 'Puntarenas', value: 'Puntarenas' },
    { label: 'Limón', value: 'Limon' },
  ];

  constructor(
    private activityService: ActivityService,
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      name_es: ['', Validators.required],
      province: [null],
      address: [''],
      category: [''],
      provider: [''],
      commission: [1.92],
      reservation_email: [''],
      net_adult_price: [0, Validators.required],
      rack_adult_price: [0, Validators.required],  // ← calculado
      net_child_price: [0, Validators.required],
      rack_child_price: [0, Validators.required], // ← calculado
    });

    this.form.get('net_adult_price')!.valueChanges.subscribe(() => this.calcRackFromNet());
    this.form.get('net_child_price')!.valueChanges.subscribe(() => this.calcRackFromNet());
    this.form.get('commission')!.valueChanges.subscribe(() => this.calcRackFromNet());
  }

  ngOnInit() {
    this.listState = readListStateFromRoute(this.route);
    this.load();
  }

  get searchTerm(): string {
    return this.listState.searchTerm;
  }

  set searchTerm(value: string) {
    this.listState = { ...this.listState, searchTerm: value };
  }

  get tableFirst(): number {
    return clampCatalogListFirst(
      this.listState.first,
      this.filteredActivities().length,
      this.listState.rows,
    );
  }

  get tableRows(): number {
    return this.listState.rows;
  }

  onSearchChange(): void {
    this.listState = onCatalogSearchChange(
      this.listState.searchTerm,
      this.listState,
      this.router,
      this.route,
    );
  }

  onTablePage(event: Parameters<typeof onCatalogTablePage>[0]): void {
    this.listState = onCatalogTablePage(event, this.listState, this.router, this.route);
  }

  load() {
    this.loading.set(true);
    this.activityService.getAll().subscribe({
      next: (res) => {
        this.activities.set(res.items);
        this.total.set(res.total);
        this.listState = normalizeListStateAfterLoad(
          this.listState,
          this.filteredActivities().length,
          this.router,
          this.route,
        );
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  openCreate() {
    this.editingId.set(null);
    this.form.reset({
      commission: 1.2,
      net_adult_price: 0,
      rack_adult_price: 0,
      net_child_price: 0,
      rack_child_price: 0,
      reservation_email: '',
      provider: '',
    });
    this.showDialog.set(true);
  }

  calcRack() {
    const commission = this.form.get('commission')!.value ?? 1.92;
    const netAdult = this.form.get('net_adult_price')!.value ?? 0;
    const netChild = this.form.get('net_child_price')!.value ?? 0;
  
    this.form.get('rack_adult_price')!.setValue(
      Math.round(netAdult * commission * 100) / 100,
      { emitEvent: false }
    );
    this.form.get('rack_child_price')!.setValue(
      Math.round(netChild * commission * 100) / 100,
      { emitEvent: false }
    );
  }

  calcRackFromNet() {
    const commission = this.form.get('commission')!.value ?? 1.92;
    const netAdult = this.form.get('net_adult_price')!.value ?? 0;
    const netChild = this.form.get('net_child_price')!.value ?? 0;
  
    this.form.patchValue({
      rack_adult_price: Math.round(netAdult * commission * 100) / 100,
      rack_child_price: Math.round(netChild * commission * 100) / 100,
    }, { emitEvent: false });
  }

  openEdit(activity: Activity) {
    this.editingId.set(activity.id);
    this.form.patchValue({
      name: activity.name,
      name_es: activity.name_es,
      province: activity.province,
      address: activity.address,
      category: activity.category,
      provider: activity.provider ?? '',
      commission: activity.commission,
      reservation_email: activity.reservation_email ?? '',
      net_adult_price: activity.net_adult_price,
      rack_adult_price: activity.rack_adult_price,
      net_child_price: activity.net_child_price,
      rack_child_price: activity.rack_child_price,
    });
    this.showDialog.set(true);
  }

  submit() {
    if (this.form.invalid) return;
    this.saving.set(true);
  
    const raw = this.form.getRawValue();
    const id = this.editingId();
    const val = {
      ...raw,
      provider:
        raw.provider != null && String(raw.provider).trim() !== ''
          ? String(raw.provider).trim()
          : null,
    };

    const request = id
      ? this.activityService.update(id, val)
      : this.activityService.create(val);
  
    request.subscribe({
      next: () => {
        this.showDialog.set(false);
        this.saving.set(false);
        this.messageService.add({
          severity: 'success',
          summary: id ? 'Actividad actualizada' : 'Actividad creada',
        });
        this.load();
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

  confirmDelete(event: Event, id: string) {
    this.confirmationService.confirm({
      target: event.target as EventTarget,
      message: '¿Eliminar esta actividad?',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí',
      rejectLabel: 'No',
      accept: () => {
        this.activityService.delete(id).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Actividad eliminada' });
            this.selectedActivities = [];
            this.load();
          },
        });
      },
    });
  }

  confirmBulkDelete(event?: Event) {
    const rows = this.selectedActivities.filter((a) => !!a?.id);
    if (!rows.length) {
      this.messageService.add({ severity: 'warn', summary: 'Seleccione al menos una actividad' });
      return;
    }
    this.confirmationService.confirm({
      target: (event?.target as EventTarget) ?? undefined,
      message: `¿Eliminar ${rows.length} actividad(es)?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.bulkDeleting.set(true);
        forkJoin(
          rows.map((a) =>
            this.activityService.delete(a.id).pipe(
              map(() => true),
              catchError(() => of(false)),
            ),
          ),
        ).subscribe({
          next: (results) => {
            this.bulkDeleting.set(false);
            const ok = results.filter(Boolean).length;
            this.selectedActivities = [];
            this.load();
            if (ok === rows.length) {
              this.messageService.add({ severity: 'success', summary: `${ok} actividad(es) eliminada(s)` });
            } else {
              this.messageService.add({
                severity: 'warn',
                summary: `Eliminadas: ${ok} de ${rows.length}`,
              });
            }
          },
          error: () => {
            this.bulkDeleting.set(false);
            this.messageService.add({ severity: 'error', summary: 'Error al eliminar en lote' });
          },
        });
      },
    });
  }

  get dialogTitle(): string {
    return this.editingId() ? 'Editar Actividad' : 'Nueva Actividad';
  }

  canManageActivities(): boolean {
    const role = this.auth.currentUser()?.role;
    return role === 'admin' || role === 'admin_proveedores';
  }

  canEditProviderEmail(): boolean {
    return canEditProviderReservationEmail(this.auth.currentUser()?.role);
  }

  showActionsColumn(): boolean {
    return this.canManageActivities() || this.canEditProviderEmail();
  }

  openProviderEmail(activity: Activity, event: Event): void {
    event.stopPropagation();
    this.providerEmailTarget.set(activity);
    this.showProviderEmailDialog.set(true);
  }

  providerEmailEntityLabel(activity: Activity | null): string {
    if (!activity) return '';
    return activity.name_es || activity.name || '';
  }

  submitProviderEmail(email: string | null): void {
    const target = this.providerEmailTarget();
    if (!target) return;
    this.savingProviderEmail.set(true);
    this.activityService.updateReservationEmail(target.id, email).subscribe({
      next: () => {
        this.savingProviderEmail.set(false);
        this.showProviderEmailDialog.set(false);
        this.providerEmailTarget.set(null);
        this.messageService.add({ severity: 'success', summary: 'Correo actualizado' });
        this.load();
      },
      error: (err) => {
        this.savingProviderEmail.set(false);
        this.messageService.add({
          severity: 'error',
          summary: err.error?.detail ?? 'Error al guardar el correo',
        });
      },
    });
  }

  filteredActivities(): Activity[] {
    return this.filterBySearch(this.activities(), this.searchTerm);
  }

  private filterBySearch<T>(items: T[], term: string): T[] {
    const normalizedTerm = term.trim().toLowerCase();
    if (!normalizedTerm) return items;
    return items.filter((item) => this.stringifyForSearch(item).includes(normalizedTerm));
  }

  private stringifyForSearch(value: unknown): string {
    if (value === null || value === undefined) return '';
    if (Array.isArray(value)) return value.map((v) => this.stringifyForSearch(v)).join(' ');
    if (typeof value === 'object') return Object.values(value).map((v) => this.stringifyForSearch(v)).join(' ');
    return String(value).toLowerCase();
  }
}