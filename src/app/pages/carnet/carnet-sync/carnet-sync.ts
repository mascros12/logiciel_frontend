import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ButtonModule } from 'primeng/button';
import { ConfirmationService } from 'primeng/api';
import { CarnetService } from '../../../core/services/carnet.service';
import {
  CarnetDocument,
  CarnetView,
  SyncAction,
  SyncProposal,
} from '../../../core/models/carnet.model';
import { acceptIds, syncKindLabel } from '../../../core/utils/carnet-sync';
import { CarnetPreview } from '../carnet-preview/carnet-preview';

@Component({
  selector: 'app-carnet-sync',
  standalone: true,
  imports: [ButtonModule, CarnetPreview],
  templateUrl: './carnet-sync.html',
  styleUrl: './carnet-sync.scss',
})
export class CarnetSyncPanel implements OnInit {
  private readonly carnets = inject(CarnetService);
  private readonly confirmation = inject(ConfirmationService);

  readonly carnetId = input.required<string>();
  readonly lockVersion = input.required<number>();
  readonly applied = output<CarnetView>();
  readonly closed = output<void>();

  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly proposal = signal<SyncProposal | null>(null);
  readonly picked = signal<Readonly<Record<string, boolean>>>({});
  readonly safeGroup = signal(false);
  readonly preview = signal<CarnetDocument | null>(null);
  readonly previewPending = signal<number | null>(null);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.preview.set(null);
    this.carnets.syncProposal(this.carnetId()).subscribe({
      next: (proposal) => {
        const picked: Record<string, boolean> = {};
        for (const action of proposal.actions) {
          picked[action.id] = action.safe;
        }
        this.proposal.set(proposal);
        this.picked.set(picked);
        this.safeGroup.set(proposal.actions.some((action) => action.safe));
        this.loading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.error.set(this.message(error));
        this.loading.set(false);
      },
    });
  }

  groups(): { title: string; actions: SyncAction[] }[] {
    const proposal = this.proposal();
    if (!proposal) return [];
    const buckets: { title: string; kinds: string[] }[] = [
      { title: 'Servicios nuevos', kinds: ['add_service', 'add_room'] },
      { title: 'Servicios eliminados', kinds: ['hide_service', 'remove_service', 'remove_room'] },
      { title: 'Servicios modificados', kinds: ['update_field', 'realign_days'] },
    ];
    return buckets
      .map((bucket) => ({
        title: bucket.title,
        actions: proposal.actions.filter((action) => bucket.kinds.includes(action.kind)),
      }))
      .filter((bucket) => bucket.actions.length > 0);
  }

  conflicts(): SyncAction[] {
    return (this.proposal()?.actions ?? []).filter((action) => action.state === 'conflict');
  }

  label(action: SyncAction): string {
    const field = action.field ? ` · ${action.field}` : '';
    return `${syncKindLabel(action.kind)}${field}`;
  }

  checked(id: string): boolean {
    return Boolean(this.picked()[id]);
  }

  toggle(id: string, checked: boolean): void {
    this.picked.update((current) => ({ ...current, [id]: checked }));
    const action = this.proposal()?.actions.find((item) => item.id === id);
    if (action?.safe && !checked) this.safeGroup.set(false);
    this.preview.set(null);
  }

  toggleSafeGroup(checked: boolean): void {
    this.safeGroup.set(checked);
    if (checked) {
      this.picked.update((current) => {
        const next = { ...current };
        for (const action of this.proposal()?.actions ?? []) {
          if (action.safe) next[action.id] = true;
        }
        return next;
      });
    }
    this.preview.set(null);
  }

  askReplaceAll(): void {
    this.confirmation.confirm({
      header: 'Reemplazar el borrador con la Ficha AA',
      message:
        'Se marcarán todos los cambios, incluidos los conflictos que sustituyen valores personalizados. Hay que ver el resultado y pulsar Aplicar. El Carnet publicado no cambia.',
      acceptLabel: 'Marcar todos',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        const next: Record<string, boolean> = {};
        for (const action of this.proposal()?.actions ?? []) next[action.id] = true;
        this.picked.set(next);
        this.safeGroup.set(false);
        this.preview.set(null);
      },
    });
  }

  showPreview(): void {
    const proposal = this.proposal();
    if (!proposal) return;
    this.busy.set(true);
    this.error.set(null);
    this.carnets
      .previewSync(this.carnetId(), {
        lock_version: this.lockVersion(),
        source_fingerprint: proposal.source_fingerprint,
        accept: this.selection(),
        dry_run: true,
      })
      .subscribe({
        next: (preview) => {
          this.preview.set(preview.document);
          this.previewPending.set(preview.pending);
          this.busy.set(false);
        },
        error: (error: HttpErrorResponse) => {
          this.error.set(this.message(error));
          this.busy.set(false);
        },
      });
  }

  apply(): void {
    const proposal = this.proposal();
    if (!proposal || !this.preview()) return;
    this.busy.set(true);
    this.error.set(null);
    this.carnets
      .applySync(this.carnetId(), {
        lock_version: this.lockVersion(),
        source_fingerprint: proposal.source_fingerprint,
        accept: this.selection(),
        dry_run: false,
      })
      .subscribe({
        next: (view) => {
          this.busy.set(false);
          this.applied.emit(view);
        },
        error: (error: HttpErrorResponse) => {
          this.error.set(this.message(error));
          this.busy.set(false);
        },
      });
  }

  private selection(): string[] {
    const proposal = this.proposal();
    if (!proposal) return [];
    const picked = new Set(
      Object.entries(this.picked())
        .filter(([, selected]) => selected)
        .map(([id]) => id),
    );
    return acceptIds(proposal.actions, picked, this.safeGroup());
  }

  private message(error: HttpErrorResponse): string {
    const detail = error.error?.detail;
    if (typeof detail === 'string') return detail;
    return 'No se pudo comparar la Ficha AA.';
  }
}
