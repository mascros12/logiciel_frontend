import { DatePipe } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { CarnetTemplate } from '../../../core/models/carnet-template.model';
import { CarnetTemplateService } from '../../../core/services/carnet-template.service';

@Component({
  selector: 'app-carnet-templates',
  standalone: true,
  imports: [FormsModule, DatePipe, ButtonModule, InputTextModule, TextareaModule, ToastModule],
  providers: [MessageService],
  templateUrl: './carnet-templates.html',
  styleUrl: './carnet-templates.scss',
})
export class CarnetTemplates implements OnInit {
  readonly loading = signal(true);
  readonly savingKey = signal<string | null>(null);
  readonly rows = signal<CarnetTemplate[]>([]);
  readonly loadError = signal('');

  constructor(
    private templates: CarnetTemplateService,
    private messages: MessageService,
  ) {}

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.loadError.set('');
    this.templates.list().subscribe({
      next: (rows) => {
        this.rows.set(rows);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.loadError.set('No se pudieron cargar las plantillas.');
      },
    });
  }

  save(row: CarnetTemplate): void {
    const title = row.title.trim();
    if (!title) {
      this.messages.add({ severity: 'warn', summary: 'El título es obligatorio' });
      return;
    }
    this.savingKey.set(row.key);
    this.templates.update(row.key, {
      title,
      body: row.body,
      active: row.active,
      version: row.version,
    }).subscribe({
      next: (saved) => {
        this.rows.update((items) => items.map((item) => item.key === saved.key ? saved : item));
        this.savingKey.set(null);
        this.messages.add({ severity: 'success', summary: 'Plantilla guardada' });
      },
      error: (error) => {
        this.savingKey.set(null);
        const status = error?.status;
        if (status === 409) {
          this.messages.add({
            severity: 'warn',
            summary: 'La plantilla cambió',
            detail: 'Otra persona la guardó. Se recarga la versión vigente.',
          });
          this.reload();
          return;
        }
        this.messages.add({
          severity: 'error',
          summary: 'No se pudo guardar',
          detail: error?.error?.detail ?? 'Revise el texto e intente de nuevo.',
        });
      },
    });
  }
}
