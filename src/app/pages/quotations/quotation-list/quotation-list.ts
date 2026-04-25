import { Component, OnInit, signal } from '@angular/core';
import { DatePipe, CurrencyPipe } from '@angular/common';
import { Router } from '@angular/router';
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

import { QuotationService } from '../../../core/services/quotation.service';
import { Quotation, QuotationVersion } from '../../../core/models/quotation.model';
import { ContactService } from '../../../core/services/contact.service';
import { ContactSource, ContactBudget, TravellerType, Ritm } from '../../../core/models/contact.model';
import { SelectModule } from 'primeng/select';
import { AuthService } from '../../../core/auth/auth.service';


@Component({
  selector: 'app-quotation-list',
  standalone: true,
  imports: [
    TableModule, ButtonModule, TagModule, DialogModule,
    InputTextModule, TextareaModule, DatePickerModule, ReactiveFormsModule, FormsModule,
    ToastModule, ConfirmDialogModule, DatePipe, CurrencyPipe,
    SelectModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './quotation-list.html',
  styleUrl: './quotation-list.scss',
})
export class QuotationList implements OnInit {
  quotations = signal<Quotation[]>([]);
  total = signal(0);
  loading = signal(false);
  showCreateDialog = signal(false);
  creating = signal(false);
  showingArchived = signal(false);
  versionsCache = signal<Record<string, QuotationVersion[]>>({});
  expandedRows: { [key: string]: boolean } = {};
  searchTerm = '';
  readonly rowsPerPage = 25;
  readonly rowsPerPageOptions = [25, 50, 100];
  readonly fetchPageSize = 5000;

  // Agrega las opciones de los selects
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
      // Contacto
      email: [''],
      source: [null],
      budget: [null],
      traveller_type: [null],
      ritm: [null],
    });

    // La llegada/salida alimentan automáticamente inicio/fin del viaje.
    this.createForm.get('arrival_date')?.valueChanges.subscribe((arrivalDate: Date | null) => {
      this.createForm.patchValue({ from_date: arrivalDate }, { emitEvent: false });
    });
    this.createForm.get('departure_date')?.valueChanges.subscribe((departureDate: Date | null) => {
      this.createForm.patchValue({ to_date: departureDate }, { emitEvent: false });
    });
  }

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.quotationService.getAll(1, this.fetchPageSize, {
      onlyDeleted: this.showingArchived(),
    }).subscribe({
      next: res => {
        this.quotations.set(res.items);
        this.total.set(res.items.length);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  openCreate() {
    this.createForm.reset({ commission: 1.92, notes: '' });
    this.showCreateDialog.set(true);
  }

  submitCreate() {
    if (this.createForm.invalid) return;
    this.creating.set(true);
  
    const val = this.createForm.value;
  
    // Paso 1 — crear contacto
    this.contactService.create({
      full_name: val.name,
      email: val.email || undefined,
      source: val.source || undefined,
      budget: val.budget || undefined,
      traveller_type: val.traveller_type || undefined,
      ritm: val.ritm || undefined,
    }).subscribe({
      next: (contact) => {
        // Paso 2 — crear cotización con el contact_id
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
          error: () => {
            this.creating.set(false);
            this.messageService.add({ severity: 'error', summary: 'Error al crear cotización' });
          }
        });
      },
      error: () => {
        this.creating.set(false);
        this.messageService.add({ severity: 'error', summary: 'Error al crear contacto' });
      }
    });
  }

  confirmDelete(event: Event, id: string) {
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
            this.load();
          }
        });
      }
    });
  }

  confirmRestore(event: Event, id: string) {
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
            this.load();
          }
        });
      }
    });
  }

  toggleArchivedView() {
    this.showingArchived.update(v => !v);
    this.expandedRows = {};
    this.load();
  }

  canDeleteQuotations(): boolean {
    const role = this.authService.currentUser()?.role;
    return role === 'admin' || role === 'operaciones' || role === 'comercial';
  }

  canRestoreQuotations(): boolean {
    return this.canDeleteQuotations();
  }

  getCurrentVersion(versions: QuotationVersion[]): QuotationVersion | null {
    return versions.find(v => v.is_current) ?? null;
  }

  private formatDate(d: Date): string {
    return d.toISOString().split('T')[0];
  }

  onRowExpand(event: { data: Quotation }) {
    const id = event.data.id;
    if (this.versionsCache()[id]) return; // ya cargado
  
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