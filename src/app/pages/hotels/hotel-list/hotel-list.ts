import { Component, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
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
import { HotelFilterPipe } from './hotel-filter.pipe';
import { DecimalPipe } from '@angular/common';
import { RichTextPipe } from '../../../core/pipes/rich-text.pipe';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-hotel-list',
  standalone: true,
  imports: [
    ReactiveFormsModule, FormsModule,
    TableModule, ButtonModule, DialogModule,
    InputTextModule, InputNumberModule, ToastModule,
    ConfirmDialogModule, SelectModule, TagModule,
    HotelFilterPipe, DecimalPipe, RichTextPipe,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './hotel-list.html',
  styleUrl: './hotel-list.scss',
})
export class HotelList implements OnInit {
  hotels = signal<Hotel[]>([]);
  searchTerm = '';
  loading = signal(false);
  saving = signal(false);
  showDialog = signal(false);
  editingHotel = signal<Hotel | null>(null);

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

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.hotelService.getAll().subscribe({
      next: (res) => { this.hotels.set(res.items); this.loading.set(false); },
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
      accept: () => {
        this.hotelService.delete(id).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Hotel eliminado' });
            this.load();
          },
        });
      },
    });
  }

  goToDetail(id: string) {
    this.router.navigate(['/hoteles', id]);
  }

  get dialogTitle() {
    return this.editingHotel() ? 'Editar Hotel' : 'Nuevo Hotel';
  }

  canManageHotels(): boolean {
    const role = this.auth.currentUser()?.role;
    return role === 'admin' || role === 'admin_proveedores';
  }
}