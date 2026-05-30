import { Component, OnInit, signal } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ActivatedRoute, Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { MessageService, ConfirmationService } from 'primeng/api';
import { HotelService } from '../../../core/services/hotel.service';
import { Hotel, HotelCategory } from '../../../core/models/hotel.model';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { RichTextPipe } from '../../../core/pipes/rich-text.pipe';
import { AuthService } from '../../../core/auth/auth.service';
import {
  CATALOG_LIST_DEFAULT_ROWS,
  CATALOG_LIST_ROWS_OPTIONS,
  CatalogListState,
  clampCatalogListFirst,
  handleCatalogRowNav,
  normalizeListStateAfterLoad,
  onCatalogSearchChange,
  onCatalogTablePage,
  readListStateFromRoute,
} from '../../../core/utils/list-url-state';

@Component({
  selector: 'app-hotel-list',
  standalone: true,
  imports: [
    ReactiveFormsModule, FormsModule,
    TableModule, ButtonModule, DialogModule,
    InputTextModule, InputNumberModule, ToastModule,
    ConfirmDialogModule, SelectModule, TagModule,
    DecimalPipe, RichTextPipe,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './hotel-list.html',
  styleUrl: './hotel-list.scss',
})
export class HotelList implements OnInit {
  hotels = signal<Hotel[]>([]);
  loading = signal(false);
  saving = signal(false);
  bulkDeleting = signal(false);
  /** Selección múltiple (p-table) */
  selectedHotels: Hotel[] = [];
  showDialog = signal(false);
  editingHotel = signal<Hotel | null>(null);
  listState: CatalogListState = {
    searchTerm: '',
    first: 0,
    rows: CATALOG_LIST_DEFAULT_ROWS,
  };
  readonly rowsPerPageOptions = CATALOG_LIST_ROWS_OPTIONS;

  form: FormGroup;

  categoryOptions = [
    { label: 'Gama Alta', value: 'high' as const },
    { label: 'Gama Media', value: 'medium' as const },
    { label: 'Gama Baja', value: 'low' as const },
  ];

  provinces = [
    { label: 'San José',    value: 'San Jose' },
    { label: 'Alajuela',    value: 'Alajuela' },
    { label: 'Cartago',     value: 'Cartago' },
    { label: 'Heredia',     value: 'Heredia' },
    { label: 'Guanacaste',  value: 'Guanacaste' },
    { label: 'Puntarenas',  value: 'Puntarenas' },
    { label: 'Limón',       value: 'Limon' },
  ];

  constructor(
    private hotelService: HotelService,
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private auth: AuthService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      province: [null],
      address: [''],
      category: [null as HotelCategory | null],
      commission: [1.2],
      reservation_email: [''],
    });
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
      this.filteredHotels().length,
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
    this.hotelService.getAll().subscribe({
      next: (res) => {
        this.hotels.set(res.items);
        this.listState = normalizeListStateAfterLoad(
          this.listState,
          this.filteredHotels().length,
          this.router,
          this.route,
        );
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  openCreate() {
    this.editingHotel.set(null);
    this.form.reset({ commission: 1.2, reservation_email: '', category: null });
    this.showDialog.set(true);
  }

  openEdit(h: Hotel, event: Event) {
    event.stopPropagation();
    this.editingHotel.set(h);
    this.form.patchValue({
      name: h.name,
      province: h.province,
      address: h.address ?? '',
      category: this.parseCategory(h.category),
      commission: h.commission,
      reservation_email: h.reservation_email ?? '',
    });
    this.showDialog.set(true);
  }

  private parseCategory(v: string | null | undefined): HotelCategory | null {
    if (v === 'high' || v === 'medium' || v === 'low') return v;
    return null;
  }

  submit() {
    if (this.form.invalid) return;
    this.saving.set(true);
    const id = this.editingHotel()?.id;
    const req = id
      ? this.hotelService.update(id, this.form.value)
      : this.hotelService.create(this.form.value);

    req.subscribe({
      next: (h) => {
        this.showDialog.set(false);
        this.saving.set(false);
        this.messageService.add({ severity: 'success', summary: id ? 'Hotel actualizado' : 'Hotel creado' });
        if (!id) this.router.navigate(['/hoteles', h.id]);
        else this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.messageService.add({ severity: 'error', summary: err.error?.detail ?? 'Error al guardar' });
      },
    });
  }

  confirmDelete(event: Event, id: string) {
    event.stopPropagation();
    this.confirmationService.confirm({
      target: event.target as EventTarget,
      message: '¿Eliminar este hotel?',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí',
      rejectLabel: 'No',
      accept: () => {
        this.hotelService.delete(id).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Hotel eliminado' });
            this.selectedHotels = [];
            this.load();
          },
        });
      },
    });
  }

  confirmBulkDelete(event?: Event) {
    const rows = this.selectedHotels.filter((h) => !!h?.id);
    if (!rows.length) {
      this.messageService.add({ severity: 'warn', summary: 'Seleccione al menos un hotel' });
      return;
    }
    this.confirmationService.confirm({
      target: (event?.target as EventTarget) ?? undefined,
      message: `¿Eliminar ${rows.length} hotel(es)? Esta acción no se puede deshacer.`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.bulkDeleting.set(true);
        forkJoin(
          rows.map((h) =>
            this.hotelService.delete(h.id).pipe(
              map(() => true),
              catchError(() => of(false)),
            ),
          ),
        ).subscribe({
          next: (results) => {
            this.bulkDeleting.set(false);
            const ok = results.filter(Boolean).length;
            this.selectedHotels = [];
            this.load();
            if (ok === rows.length) {
              this.messageService.add({ severity: 'success', summary: `${ok} hotel(es) eliminado(s)` });
            } else {
              this.messageService.add({
                severity: 'warn',
                summary: `Eliminados: ${ok} de ${rows.length}. Revise los que fallaron.`,
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

  onRowNav(event: MouseEvent, id: string): void {
    handleCatalogRowNav(event, this.router, ['/hoteles', id]);
  }

  get dialogTitle() {
    return this.editingHotel() ? 'Editar Hotel' : 'Nuevo Hotel';
  }

  canManageHotels(): boolean {
    const role = this.auth.currentUser()?.role;
    return role === 'admin' || role === 'admin_proveedores';
  }

  filteredHotels(): Hotel[] {
    return this.filterBySearch(this.hotels(), this.searchTerm);
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