import { Component, OnInit, signal } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { DatePipe, CurrencyPipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { DatePickerModule } from 'primeng/datepicker';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { TooltipModule } from 'primeng/tooltip';

import { QuotationService } from '../../../core/services/quotation.service';
import { Quotation, QuotationVersion } from '../../../core/models/quotation.model';
import { ContactService } from '../../../core/services/contact.service';
import { ContactSource, ContactBudget, TravellerType, Ritm } from '../../../core/models/contact.model';
import { SelectModule } from 'primeng/select';
import { AuthService } from '../../../core/auth/auth.service';
import { formatQuotationVersionLabel } from '../../../core/utils/quotation-version-label';
import {
  apiErrorSummary,
  fieldStyleClass,
  validateForm,
  warnInvalidForm,
} from '../../../core/utils/form-validation.util';
import { FieldErrorComponent } from '../../../shared/components/field-error/field-error.component';
import { AbstractControl } from '@angular/forms';
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

const CREATE_FORM_LABELS: Record<string, string> = {
  name: 'Nombre / Familia',
  arrival_date: 'Fecha de llegada',
  departure_date: 'Fecha de salida',
  notes: 'Notas internas',
  source: 'Origen',
};


@Component({
  selector: 'app-quotation-list',
  standalone: true,
  imports: [
    TableModule, ButtonModule, TagModule, DialogModule,
    InputTextModule, TextareaModule, DatePickerModule, ReactiveFormsModule, FormsModule,
    ToastModule, ConfirmDialogModule, DatePipe, CurrencyPipe,
    SelectModule, TooltipModule,
    FieldErrorComponent,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './quotation-list.html',
  styleUrl: './quotation-list.scss',
})
export class QuotationList implements OnInit {
  quotations = signal<Quotation[]>([]);
  total = signal(0);
  loading = signal(false);
  bulkDeleting = signal(false);
  selectedQuotations: Quotation[] = [];
  showCreateDialog = signal(false);
  creating = signal(false);
  showingArchived = signal(false);
  versionsCache = signal<Record<string, QuotationVersion[]>>({});
  expandedRows: { [key: string]: boolean } = {};
  listState: CatalogListState = {
    searchTerm: '',
    first: 0,
    rows: CATALOG_LIST_DEFAULT_ROWS,
  };
  readonly rowsPerPageOptions = CATALOG_LIST_ROWS_OPTIONS;
  readonly fetchPageSize = 5000;

  sources: { label: string, value: ContactSource }[] = [
    { label: 'Evaneos', value: 'Evaneos' },
    { label: 'Directo', value: 'Directo' },
  ];

  budgets: { label: string, value: ContactBudget }[] = [
    { label: 'Básico', value: 'Básico' },
    { label: 'Normal', value: 'Normal' },
    { label: 'Alto', value: 'Alto' },
  ];

  travellerTypes: { label: string, value: TravellerType }[] = [
    { label: 'Aventurero', value: 'Aventurero' },
    { label: 'Cauteloso', value: 'Cauteloso' },
  ];

  ritms: { label: string, value: Ritm }[] = [
    { label: '2 noches por etapa', value: '2 noches por etapa' },
    { label: '1 noche por etapa', value: '1 noche por etapa' },
    { label: 'Otro', value: 'Otro' },
  ];

  createForm: FormGroup;

  constructor(
    private quotationService: QuotationService,
    private contactService: ContactService,
    private fb: FormBuilder,
    public router: Router,
    private route: ActivatedRoute,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private authService: AuthService,
  ) {
    this.createForm = this.fb.group({
      name: ['', Validators.required],
      arrival_date: [null, Validators.required],
      departure_date: [null, Validators.required],
      from_date: [null, Validators.required],
      to_date: [null, Validators.required],
      notes: ['', Validators.required],
      commission: [1.92],
      email: [''],
      source: [null, Validators.required],
      budget: [null],
      traveller_type: [null],
      ritm: [null],
    });

    this.createForm.get('arrival_date')?.valueChanges.subscribe((arrivalDate: Date | null) => {
      this.createForm.patchValue({ from_date: arrivalDate }, { emitEvent: false });
    });
    this.createForm.get('departure_date')?.valueChanges.subscribe((departureDate: Date | null) => {
      this.createForm.patchValue({ to_date: departureDate }, { emitEvent: false });
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
      this.filteredQuotations().length,
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
    this.quotationService.getAll(1, this.fetchPageSize, {
      onlyDeleted: this.showingArchived(),
    }).subscribe({
      next: res => {
        this.quotations.set(res.items);
        this.total.set(res.total);
        this.listState = normalizeListStateAfterLoad(
          this.listState,
          this.filteredQuotations().length,
          this.router,
          this.route,
        );
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  openCreate() {
    this.createForm.reset({ commission: 1.92, notes: '' });
    this.showCreateDialog.set(true);
  }

  fieldStyleClass(control: AbstractControl | null | undefined): string {
    return fieldStyleClass(control);
  }

  submitCreate() {
    const val = this.createForm.value;
    const departure = val.departure_date ? new Date(val.departure_date) : null;
    const arrival = val.arrival_date ? new Date(val.arrival_date) : null;
    if (arrival && departure && departure < arrival) {
      this.createForm.get('departure_date')?.setErrors({ dateRangeEnd: true });
    } else {
      const depCtrl = this.createForm.get('departure_date');
      if (depCtrl?.hasError('dateRangeEnd')) {
        const errs = { ...depCtrl.errors };
        delete errs['dateRangeEnd'];
        depCtrl.setErrors(Object.keys(errs).length ? errs : null);
      }
    }

    const errors = validateForm(this.createForm, CREATE_FORM_LABELS);
    if (errors.length) {
      warnInvalidForm(this.messageService, errors);
      return;
    }
    this.creating.set(true);

    this.contactService.create({
      full_name: val.name,
      email: val.email || undefined,
      source: val.source,
      budget: val.budget || undefined,
      traveller_type: val.traveller_type || undefined,
      ritm: val.ritm || undefined,
    }).subscribe({
      next: (contact) => {
        this.quotationService.create({
          name: val.name,
          from_date: this.formatDate(val.from_date),
          to_date: this.formatDate(val.to_date),
          arrival_date: this.formatDate(val.arrival_date),
          departure_date: this.formatDate(val.departure_date),
          notes: val.notes?.trim(),
          commission: val.commission,
          contact_id: contact.id,
        }).subscribe({
          next: (q) => {
            this.showCreateDialog.set(false);
            this.creating.set(false);
            this.messageService.add({ severity: 'success', summary: 'Cotización creada' });
            this.router.navigate(['/cotizaciones', q.id]);
          },
          error: (err) => {
            this.creating.set(false);
            this.messageService.add({
              severity: 'error',
              summary: apiErrorSummary(err, 'Error al crear cotización'),
            });
          }
        });
      },
      error: (err) => {
        this.creating.set(false);
        this.messageService.add({
          severity: 'error',
          summary: apiErrorSummary(err, 'Error al crear contacto'),
        });
      }
    });
  }

  confirmDelete(event: Event, id: string) {
    event.stopPropagation();
    this.confirmationService.confirm({
      target: event.target as EventTarget,
      message: '¿Eliminar esta cotización?',
      acceptLabel: 'Sí',
      rejectLabel: 'No',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.quotationService.delete(id).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Cotización eliminada' });
            this.selectedQuotations = [];
            this.load();
          }
        });
      }
    });
  }

  confirmBulkDelete(event?: Event) {
    const rows = this.selectedQuotations.filter((q) => !!q?.id && this.canModifyQuotation(q));
    if (!rows.length) {
      this.messageService.add({ severity: 'warn', summary: 'Seleccione al menos una cotización propia' });
      return;
    }
    this.confirmationService.confirm({
      target: (event?.target as EventTarget) ?? undefined,
      message: `¿Eliminar ${rows.length} cotización(es)?`,
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.bulkDeleting.set(true);
        forkJoin(
          rows.map((q) =>
            this.quotationService.delete(q.id).pipe(
              map(() => true),
              catchError(() => of(false)),
            ),
          ),
        ).subscribe({
          next: (results) => {
            this.bulkDeleting.set(false);
            const ok = results.filter(Boolean).length;
            this.selectedQuotations = [];
            this.load();
            if (ok === rows.length) {
              this.messageService.add({ severity: 'success', summary: `${ok} cotización(es) eliminada(s)` });
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

  confirmRestore(event: Event, id: string) {
    event.stopPropagation();
    this.confirmationService.confirm({
      target: event.target as EventTarget,
      message: '¿Restaurar esta cotización archivada?',
      acceptLabel: 'Sí',
      rejectLabel: 'No',
      icon: 'pi pi-history',
      accept: () => {
        this.quotationService.restore(id).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Cotización restaurada' });
            this.selectedQuotations = [];
            this.load();
          }
        });
      }
    });
  }

  confirmBulkRestore(event?: Event) {
    const rows = this.selectedQuotations.filter((q) => !!q?.id && this.canModifyQuotation(q));
    if (!rows.length) {
      this.messageService.add({ severity: 'warn', summary: 'Seleccione al menos una cotización propia' });
      return;
    }
    this.confirmationService.confirm({
      target: (event?.target as EventTarget) ?? undefined,
      message: `¿Restaurar ${rows.length} cotización(es) archivada(s)?`,
      acceptLabel: 'Restaurar',
      rejectLabel: 'Cancelar',
      icon: 'pi pi-history',
      accept: () => {
        this.bulkDeleting.set(true);
        forkJoin(
          rows.map((q) =>
            this.quotationService.restore(q.id).pipe(
              map(() => true),
              catchError(() => of(false)),
            ),
          ),
        ).subscribe({
          next: (results) => {
            this.bulkDeleting.set(false);
            const ok = results.filter(Boolean).length;
            this.selectedQuotations = [];
            this.load();
            if (ok === rows.length) {
              this.messageService.add({ severity: 'success', summary: `${ok} cotización(es) restaurada(s)` });
            } else {
              this.messageService.add({
                severity: 'warn',
                summary: `Restauradas: ${ok} de ${rows.length}`,
              });
            }
          },
          error: () => {
            this.bulkDeleting.set(false);
            this.messageService.add({ severity: 'error', summary: 'Error al restaurar en lote' });
          },
        });
      },
    });
  }

  toggleArchivedView() {
    this.showingArchived.update(v => !v);
    this.expandedRows = {};
    this.selectedQuotations = [];
    this.load();
  }

  canDeleteQuotations(): boolean {
    const role = this.authService.currentUser()?.role;
    return role === 'admin' || role === 'operaciones' || role === 'comercial';
  }

  canRestoreQuotations(): boolean {
    return this.canDeleteQuotations();
  }

  /** Comercial solo modifica las propias; admin/ops todas. */
  canModifyQuotation(q: Quotation): boolean {
    const user = this.authService.currentUser();
    if (!user) return false;
    if (user.role === 'admin' || user.role === 'operaciones') return true;
    if (user.role === 'comercial') {
      return q.created_by_id === user.id;
    }
    return false;
  }

  showSelectionColumn(): boolean {
    return (this.canDeleteQuotations() && !this.showingArchived())
      || (this.canRestoreQuotations() && this.showingArchived());
  }

  tableColspan(): number {
    // expand + name + dates + version + creator + created + actions (+ selection)
    return 7 + (this.showSelectionColumn() ? 1 : 0);
  }

  tripDatesLabel(q: Quotation): string {
    if (q.from_date && q.to_date) {
      return `${this.formatIsoDateEs(q.from_date)} – ${this.formatIsoDateEs(q.to_date)}`;
    }
    if (q.from_date) return this.formatIsoDateEs(q.from_date);
    if (q.to_date) return this.formatIsoDateEs(q.to_date);
    return '—';
  }

  private formatIsoDateEs(iso: string): string {
    const d = new Date(iso + 'T12:00:00');
    if (isNaN(d.getTime())) return iso;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}/${d.getFullYear()}`;
  }

  onRowNav(event: MouseEvent, q: Quotation): void {
    if (this.showingArchived()) return;
    handleCatalogRowNav(event, this.router, ['/cotizaciones', q.id]);
  }

  readonly formatQuotationVersionLabel = formatQuotationVersionLabel;

  getCurrentVersion(versions: QuotationVersion[]): QuotationVersion | null {
    return versions.find(v => v.is_current) ?? null;
  }

  private formatDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  onRowExpand(event: { data: Quotation }) {
    const id = event.data.id;
    if (this.versionsCache()[id]) return;

    this.quotationService.getById(id).subscribe({
      next: (q) => {
        this.versionsCache.update(cache => ({
          ...cache,
          [id]: q.versions
        }));
      }
    });
  }

  filteredQuotations(): Quotation[] {
    return this.filterBySearch(this.quotations(), this.searchTerm);
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
