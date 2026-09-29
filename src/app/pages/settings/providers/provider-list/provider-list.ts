import { DatePipe } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { Provider, ProviderWrite } from '../../../../core/models/providers.model';
import { ProvidersService } from '../../../../core/services/providers.service';
import { FieldErrorComponent } from '../../../../shared/components/field-error/field-error.component';
import {
  apiErrorSummary,
  controlErrorMessage,
  validateForm,
  warnInvalidForm,
} from '../../../../core/utils/form-validation.util';
import {
  formatCoordinate,
  latitudeValidator,
  longitudeValidator,
} from '../../../../core/utils/coordinate.util';

function optionalEmail(control: AbstractControl) {
  const value = String(control.value ?? '').trim();
  if (!value) return null;
  return Validators.email(control);
}

@Component({
  selector: 'app-provider-list',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    FormsModule,
    DatePipe,
    TableModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    ToastModule,
    ConfirmDialogModule,
    FieldErrorComponent,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './provider-list.html',
  styleUrl: './provider-list.scss',
})
export class ProviderList implements OnInit {
  providers = signal<Provider[]>([]);
  loading = signal(false);
  saving = signal(false);
  showDialog = signal(false);
  editing = signal<Provider | null>(null);
  searchTerm = '';
  readonly rowsPerPage = 25;
  readonly rowsPerPageOptions = [25, 50, 100];

  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private providersService: ProvidersService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(150)]],
      phone: ['', Validators.maxLength(25)],
      reservation_email: ['', [optionalEmail, Validators.maxLength(255)]],
      branches: this.fb.array([]),
    });
  }

  ngOnInit(): void {
    this.load();
  }

  get branches(): FormArray {
    return this.form.get('branches') as FormArray;
  }

  branchGroups(): FormGroup[] {
    return this.branches.controls as FormGroup[];
  }

  load(): void {
    this.loading.set(true);
    this.providersService.getAll().subscribe({
      next: (res) => {
        this.providers.set(res.items);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: apiErrorSummary(err, 'No se pudieron cargar los proveedores'),
        });
      },
    });
  }

  openCreate(): void {
    this.editing.set(null);
    this.branches.clear();
    this.form.reset({ name: '', phone: '', reservation_email: '' });
    this.showDialog.set(true);
  }

  openEdit(provider: Provider): void {
    this.editing.set(provider);
    this.branches.clear();
    this.form.reset({
      name: provider.name,
      phone: provider.phone ?? '',
      reservation_email: provider.reservation_email ?? '',
    });
    for (const branch of provider.branches ?? []) {
      this.branches.push(this.branchGroup(branch));
    }
    this.showDialog.set(true);
  }

  addBranch(): void {
    this.branches.push(this.branchGroup());
  }

  removeBranch(index: number): void {
    this.branches.removeAt(index);
  }

  submit(): void {
    const messages = this.collectErrors();
    if (messages.length) {
      warnInvalidForm(this.messageService, messages);
      return;
    }

    const current = this.editing();
    const body = this.payload();
    this.saving.set(true);
    const req = current
      ? this.providersService.update(current.id, body)
      : this.providersService.create(body);

    req.subscribe({
      next: () => {
        this.saving.set(false);
        this.showDialog.set(false);
        this.messageService.add({
          severity: 'success',
          summary: current ? 'Proveedor actualizado' : 'Proveedor creado',
        });
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.messageService.add({
          severity: 'error',
          summary: apiErrorSummary(err, 'No se pudo guardar el proveedor'),
        });
      },
    });
  }

  confirmDelete(event: Event, provider: Provider): void {
    this.confirmationService.confirm({
      target: event.target as EventTarget,
      message: `¿Eliminar el proveedor "${provider.name}" y sus sucursales?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.providersService.delete(provider.id).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Proveedor eliminado' });
            this.load();
          },
          error: (err) => {
            this.messageService.add({
              severity: 'error',
              summary: apiErrorSummary(err, 'No se pudo eliminar el proveedor'),
            });
          },
        });
      },
    });
  }

  filteredProviders(): Provider[] {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) return this.providers();
    return this.providers().filter((provider) => {
      const haystack = [
        provider.name,
        provider.phone ?? '',
        provider.reservation_email ?? '',
        ...(provider.branches ?? []).map((branch) => branch.name),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });
  }

  private branchGroup(branch?: Provider['branches'][number]): FormGroup {
    return this.fb.group({
      id: [branch?.id ?? null],
      name: [branch?.name ?? '', [Validators.required, Validators.maxLength(150)]],
      longitude: [
        branch ? formatCoordinate(branch.longitude) : '',
        [Validators.required, longitudeValidator],
      ],
      latitude: [
        branch ? formatCoordinate(branch.latitude) : '',
        [Validators.required, latitudeValidator],
      ],
    });
  }

  private payload(): ProviderWrite {
    const raw = this.form.getRawValue() as {
      name: string;
      phone: string;
      reservation_email: string;
      branches: { id: string | null; name: string; longitude: string; latitude: string }[];
    };
    return {
      name: raw.name.trim(),
      phone: raw.phone.trim() || null,
      reservation_email: raw.reservation_email.trim() || null,
      branches: raw.branches.map((branch) => ({
        id: branch.id,
        name: branch.name.trim(),
        longitude: String(branch.longitude ?? '').trim().replace(',', '.'),
        latitude: String(branch.latitude ?? '').trim().replace(',', '.'),
      })),
    };
  }

  private collectErrors(): string[] {
    const messages = validateForm(this.form, {
      name: 'Nombre',
      phone: 'Teléfono',
      reservation_email: 'Correo de reservas',
    });
    this.branchGroups().forEach((group, index) => {
      const label = `sucursal ${index + 1}`;
      for (const [key, field] of [
        ['name', `Nombre de la ${label}`],
        ['longitude', `Longitud de la ${label}`],
        ['latitude', `Latitud de la ${label}`],
      ] as const) {
        const message = controlErrorMessage(group.get(key), field);
        if (message) messages.push(message);
      }
    });
    return messages;
  }
}
