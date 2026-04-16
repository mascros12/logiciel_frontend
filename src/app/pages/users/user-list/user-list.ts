import { Component, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { User, UserRole } from '../../../core/models/user.model';
import { UserService } from '../../../core/services/user.service';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    FormsModule,
    DatePipe,
    TableModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    PasswordModule,
    SelectModule,
    TagModule,
    ToastModule,
    ConfirmDialogModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './user-list.html',
  styleUrl: './user-list.scss',
})
export class UserList implements OnInit {
  users = signal<User[]>([]);
  loading = signal(false);
  saving = signal(false);
  showDialog = signal(false);
  editing = signal<User | null>(null);

  form: FormGroup;
  searchTerm = '';

  readonly roleOptions: { label: string; value: UserRole }[] = [
    { label: 'Administrador', value: 'admin' },
    { label: 'Operaciones', value: 'operaciones' },
    { label: 'Comercial', value: 'comercial' },
    { label: 'Admin proveedores', value: 'admin_proveedores' },
  ];

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
  ) {
    this.form = this.fb.group({
      full_name: ['', Validators.required],
      email: ['', [Validators.required]],
      role: ['comercial', Validators.required],
      password: [''],
      is_active: [true],
    });
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.userService.getAll().subscribe({
      next: (res) => {
        this.users.set(res.items);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  openCreate(): void {
    this.editing.set(null);
    this.form.reset({
      full_name: '',
      email: '',
      role: 'comercial',
      password: '',
      is_active: true,
    });
    this.form.get('password')?.setValidators([Validators.required, Validators.minLength(8)]);
    this.form.get('password')?.updateValueAndValidity();
    this.showDialog.set(true);
  }

  openEdit(user: User): void {
    this.editing.set(user);
    this.form.reset({
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      password: '',
      is_active: user.is_active,
    });
    this.form.get('password')?.clearValidators();
    this.form.get('password')?.updateValueAndValidity();
    this.showDialog.set(true);
  }

  submit(): void {
    if (this.form.invalid) return;
    const current = this.editing();
    const values = this.form.value;
    this.saving.set(true);

    if (!current) {
      this.userService
        .create({
          full_name: values.full_name,
          email: values.email,
          role: values.role,
          password: values.password,
        })
        .subscribe({
          next: () => {
            this.saving.set(false);
            this.showDialog.set(false);
            this.messageService.add({ severity: 'success', summary: 'Usuario creado' });
            this.load();
          },
          error: (err) => {
            this.saving.set(false);
            this.messageService.add({
              severity: 'error',
              summary: typeof err.error?.detail === 'string' ? err.error.detail : 'No se pudo crear el usuario',
            });
          },
        });
      return;
    }

    this.userService
      .update(current.id, {
        full_name: values.full_name,
        email: values.email,
        role: values.role,
        is_active: values.is_active,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.showDialog.set(false);
          this.messageService.add({ severity: 'success', summary: 'Usuario actualizado' });
          this.load();
        },
        error: (err) => {
          this.saving.set(false);
          this.messageService.add({
            severity: 'error',
            summary: typeof err.error?.detail === 'string' ? err.error.detail : 'No se pudo actualizar el usuario',
          });
        },
      });
  }

  confirmDeactivate(event: Event, user: User): void {
    this.confirmationService.confirm({
      target: event.target as EventTarget,
      message: `¿Desactivar a ${user.full_name}?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Desactivar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.userService.deactivate(user.id).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Usuario desactivado' });
            this.load();
          },
          error: (err) => {
            this.messageService.add({
              severity: 'error',
              summary:
                typeof err.error?.detail === 'string'
                  ? err.error.detail
                  : 'No se pudo desactivar el usuario',
            });
          },
        });
      },
    });
  }

  roleLabel(role: UserRole): string {
    return this.roleOptions.find((r) => r.value === role)?.label ?? role;
  }
}
