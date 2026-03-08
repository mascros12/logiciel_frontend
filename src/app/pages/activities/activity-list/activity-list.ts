import { Component, OnInit, signal } from '@angular/core';
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
import { RichTextPipe } from '../../../core/pipes/rich-text.pipe';

@Component({
  selector: 'app-activity-list',
  standalone: true,
  imports: [
    DecimalPipe, ReactiveFormsModule,
    TableModule, ButtonModule, DialogModule,
    InputTextModule, InputNumberModule, ToastModule,
    ConfirmDialogModule, TagModule, SelectModule,
    RichTextPipe,
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

  showDialog = signal(false);
  editingId = signal<string | null>(null);

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
      commission: [1.92],
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
    this.load();
  }

  load() {
    this.loading.set(true);
    this.activityService.getAll().subscribe({
      next: (res) => {
        this.activities.set(res.items);
        this.total.set(res.total);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  openCreate() {
    this.editingId.set(null);
    this.form.reset({ commission: 1.2, net_adult_price: 0, rack_adult_price: 0, net_child_price: 0, rack_child_price: 0 });
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
      commission: activity.commission,
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
  
    const val = this.form.getRawValue(); // ← getRawValue incluye disabled
    const id = this.editingId();
  
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
      accept: () => {
        this.activityService.delete(id).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Actividad eliminada' });
            this.load();
          },
        });
      },
    });
  }

  get dialogTitle(): string {
    return this.editingId() ? 'Editar Actividad' : 'Nueva Actividad';
  }
}