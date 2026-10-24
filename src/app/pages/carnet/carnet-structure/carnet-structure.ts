import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ButtonModule } from 'primeng/button';
import { ConfirmationService } from 'primeng/api';
import { CarnetService } from '../../../core/services/carnet.service';
import { CarnetView, StructureChange, StructureProposal } from '../../../core/models/carnet.model';

const ACTION_LABEL: Record<StructureChange['action'], string> = {
  add: 'Se incorpora',
  move: 'Se reubica',
  retitle: 'Cambia el título generado',
  hide: 'Se oculta, sin borrar',
  unplaced: 'Se conserva al final',
};

@Component({
  selector: 'app-carnet-structure',
  standalone: true,
  imports: [ButtonModule],
  templateUrl: './carnet-structure.html',
  styleUrl: './carnet-structure.scss',
})
export class CarnetStructurePanel implements OnInit {
  private readonly carnets = inject(CarnetService);
  private readonly confirmation = inject(ConfirmationService);

  readonly carnetId = input.required<string>();
  readonly lockVersion = input.required<number>();
  readonly applied = output<CarnetView>();
  readonly closed = output<void>();

  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly proposal = signal<StructureProposal | null>(null);
  readonly actionLabel = ACTION_LABEL;

  ngOnInit(): void {
    this.carnets.structureProposal(this.carnetId()).subscribe({
      next: (proposal) => {
        this.proposal.set(proposal);
        this.loading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.error.set(this.message(error));
        this.loading.set(false);
      },
    });
  }

  askApply(): void {
    const proposal = this.proposal();
    if (!proposal || this.busy() || proposal.changes.length === 0) return;
    if (proposal.lock_version !== this.lockVersion()) {
      this.error.set('El borrador cambió. Cierre y vuelva a abrir la vista previa.');
      return;
    }
    this.confirmation.confirm({
      header: 'Actualizar estructura',
      message:
        'Se reorganiza el borrador. Los servicios, los textos escritos y el contenido sin lugar se conservan. La revisión publicada no cambia.',
      acceptLabel: 'Actualizar borrador',
      rejectLabel: 'Cancelar',
      accept: () => this.apply(proposal.lock_version),
    });
  }

  private apply(lockVersion: number): void {
    this.busy.set(true);
    this.error.set(null);
    this.carnets.applyStructure(this.carnetId(), lockVersion).subscribe({
      next: (view) => {
        this.busy.set(false);
        this.applied.emit(view);
      },
      error: (error: HttpErrorResponse) => {
        this.busy.set(false);
        this.error.set(this.message(error));
      },
    });
  }

  private message(error: HttpErrorResponse): string {
    const detail = error.error?.detail;
    if (typeof detail === 'string' && detail.trim()) return detail;
    return 'No se pudo actualizar la estructura.';
  }
}
