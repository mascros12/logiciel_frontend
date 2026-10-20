import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { TagModule } from 'primeng/tag';
import {
  BlockType,
  CarnetBlock,
  CarnetView,
  CarnetWarning,
  PublicationView,
  RevisionItem,
} from '../../../core/models/carnet.model';
import { CarnetService } from '../../../core/services/carnet.service';
import {
  ADDABLE_TYPES,
  BLOCK_LABELS,
  EditorState,
  addBlock,
  attachBlockToDay,
  blockById,
  blockTitle,
  blockWasEdited,
  coordsOf,
  dateOf,
  entriesOf,
  flightsOf,
  intOf,
  isEditedField,
  keepLocalAfterConflict,
  keepLocalAfterNetworkError,
  listOf,
  loadEditor,
  markRemoved,
  publicationLabel,
  moveDayEntry,
  pointsOf,
  reorderVisible,
  roomsOf,
  setCoords,
  setDate,
  setAges,
  setDates,
  setFlightDate,
  setFlightText,
  setInt,
  setPoints,
  setRoomText,
  sectionPending,
  setText,
  setVisible,
  shouldWarnOnLeave,
  sourceStatusLabel,
  textOf,
  toDraftWrite,
  validateDocument,
  visibleBlocks,
  warningText,
  withDocument,
} from '../../../core/utils/carnet-document';
import { CarnetPreview } from '../carnet-preview/carnet-preview';
import { CarnetSyncPanel } from '../carnet-sync/carnet-sync';

@Component({
  selector: 'app-carnet-editor',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    DatePipe,
    NgTemplateOutlet,
    DragDropModule,
    ButtonModule,
    ConfirmDialogModule,
    InputTextModule,
    TextareaModule,
    SelectModule,
    ToastModule,
    TagModule,
    CarnetPreview,
    CarnetSyncPanel,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './carnet-editor.html',
  styleUrl: './carnet-editor.scss',
})
export class CarnetEditor implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly carnets = inject(CarnetService);
  private readonly messages = inject(MessageService);
  private readonly confirmation = inject(ConfirmationService);

  readonly labels = BLOCK_LABELS;
  readonly addable = ADDABLE_TYPES.map((type) => ({ label: BLOCK_LABELS[type], value: type }));

  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly saving = signal(false);
  readonly previewing = signal(false);
  readonly state = signal<EditorState | null>(null);
  readonly warnings = signal<CarnetWarning[]>([]);
  readonly sourceStatus = signal('unavailable');
  readonly examining = signal(false);
  readonly selectedId = signal<string | null>(null);
  readonly collapsedDays = signal<ReadonlySet<string>>(new Set());
  readonly addChoice = signal<BlockType | null>(null);
  readonly updatedAt = signal('');
  readonly fileAaId = signal('');
  readonly status = signal('draft');
  readonly publication = signal<PublicationView | null>(null);
  readonly revisions = signal<RevisionItem[]>([]);
  readonly publicPath = signal<string | null>(null);
  readonly publishing = signal(false);
  readonly downloading = signal(false);
  quotationId = '';
  carnetId = '';

  readonly document = computed(() => this.state()?.document ?? null);
  readonly dirty = computed(() => this.state()?.dirty ?? false);
  readonly conflict = computed(() => this.state()?.conflict ?? false);
  readonly structure = computed(() => (this.document() ? visibleBlocks(this.document()!) : []));
  readonly days = computed(() => this.structure().filter((block) => block.type === 'day'));
  readonly dayDropIds = computed(() => this.days().map((block) => `day-${block.id}`));
  readonly selected = computed(() =>
    this.document() ? blockById(this.document()!, this.selectedId()) : null,
  );
  readonly validation = computed(() =>
    this.document() ? validateDocument(this.document()!) : [],
  );
  readonly phaseLabel = computed(() => publicationLabel(this.dirty(), this.publication()));

  ngOnInit(): void {
    this.quotationId = this.route.snapshot.paramMap.get('quotationId') ?? '';
    this.carnetId = this.route.snapshot.paramMap.get('carnetId') ?? '';
    this.reload();
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent): void {
    const current = this.state();
    if (current && shouldWarnOnLeave(current)) {
      event.preventDefault();
    }
  }

  canDeactivate(): boolean {
    const current = this.state();
    if (!current || !shouldWarnOnLeave(current)) return true;
    return window.confirm('Hay cambios sin guardar en el Carnet. ¿Salir de todas formas?');
  }

  reload(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.carnets.get(this.carnetId).subscribe({
      next: (view) => {
        this.applyServer(view);
        this.loading.set(false);
        this.loadSource();
      },
      error: () => {
        this.loading.set(false);
        this.loadError.set('No se pudo cargar el Carnet.');
      },
    });
  }

  save(): void {
    const current = this.state();
    if (!current || this.validation().length) return;
    this.saving.set(true);
    this.carnets.save(this.carnetId, toDraftWrite(current.document, current.lockVersion)).subscribe({
      next: (view) => {
        this.saving.set(false);
        this.applyServer(view);
        this.messages.add({ severity: 'success', summary: 'Carnet guardado' });
      },
      error: (err: { status?: number }) => {
        this.saving.set(false);
        if (err.status === 409) {
          this.state.set(keepLocalAfterConflict(current));
          this.messages.add({
            severity: 'warn',
            summary: 'Otro usuario modificó el Carnet',
            detail: 'Los cambios de esta pantalla se conservan.',
          });
          return;
        }
        this.messages.add({
          severity: 'error',
          summary: 'No se pudo guardar',
          detail: 'Los cambios locales siguen en el editor.',
        });
        this.state.set(keepLocalAfterNetworkError(current));
      },
    });
  }

  recoverServer(): void {
    this.carnets.get(this.carnetId).subscribe({
      next: (view) => {
        this.applyServer(view);
        this.messages.add({ severity: 'info', summary: 'Se cargó la versión del servidor' });
      },
      error: () => {
        this.messages.add({ severity: 'error', summary: 'No se pudo recuperar el Carnet' });
      },
    });
  }

  add(type: BlockType | null): void {
    const current = this.document();
    if (!current || !type) return;
    const created = addBlock(current, type);
    this.edit(created.document);
    this.selectedId.set(created.id);
    this.addChoice.set(null);
  }

  dismissConflict(): void {
    const current = this.state();
    if (!current) return;
    this.state.set({ ...current, conflict: false });
  }

  heading(): string {
    const cover = this.document()?.blocks.find((block) => block.type === 'cover' && !block.removed);
    return cover ? blockTitle(cover) : 'Carnet';
  }

  inputValue(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  numberValue(event: Event): number {
    return Number((event.target as HTMLInputElement).value) || 0;
  }

  isDayOpen(id: string): boolean {
    return !this.collapsedDays().has(id);
  }

  toggleDay(id: string): void {
    const next = new Set(this.collapsedDays());
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this.collapsedDays.set(next);
  }

  select(id: string): void {
    this.selectedId.set(id);
    this.previewing.set(false);
  }

  dropStructure(event: CdkDragDrop<CarnetBlock[]>): void {
    const current = this.document();
    if (!current || event.previousIndex === event.currentIndex) return;
    this.edit(reorderVisible(current, event.previousIndex, event.currentIndex));
  }

  dropEntry(event: CdkDragDrop<string>): void {
    const current = this.document();
    if (!current) return;
    this.edit(moveDayEntry(
      current,
      event.previousContainer.data,
      event.previousIndex,
      event.container.data,
      event.currentIndex,
    ));
  }

  placeOnDay(dayId: string): void {
    const current = this.document();
    const selected = this.selectedId();
    if (!current || !selected || !dayId) return;
    if (selected.startsWith('new-')) {
      this.messages.add({
        severity: 'info',
        summary: 'Guarde el Carnet antes de colocar este bloque en un día',
      });
      return;
    }
    this.edit(attachBlockToDay(current, dayId, selected));
  }

  toggleVisible(block: CarnetBlock): void {
    const current = this.document();
    if (!current) return;
    this.edit(setVisible(current, block.id, !block.visible));
  }

  askRemove(block: CarnetBlock): void {
    this.confirmation.confirm({
      header: 'Eliminar bloque',
      message: `¿Eliminar «${blockTitle(block)}» de este Carnet? La Ficha AA no cambia.`,
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      accept: () => {
        const current = this.document();
        if (!current) return;
        this.edit(markRemoved(current, block.id));
        if (this.selectedId() === block.id) this.selectedId.set(null);
      },
    });
  }

  onText(blockId: string, field: string, value: string): void {
    const current = this.document();
    if (!current) return;
    this.edit(setText(current, blockId, field, value));
  }

  onDate(blockId: string, field: string, value: string): void {
    const current = this.document();
    if (!current) return;
    this.edit(setDate(current, blockId, field, value));
  }

  onInt(blockId: string, field: string, value: number): void {
    const current = this.document();
    if (!current) return;
    this.edit(setInt(current, blockId, field, Number(value) || 0));
  }

  onCoords(blockId: string, field: string, latitude: string, longitude: string): void {
    const current = this.document();
    if (!current) return;
    this.edit(setCoords(current, blockId, field, latitude, longitude));
  }

  onPoints(blockId: string, field: string, value: string): void {
    const current = this.document();
    if (!current) return;
    this.edit(setPoints(current, blockId, field, value.split('\n')));
  }

  onAges(blockId: string, value: string): void {
    const current = this.document();
    if (!current) return;
    const ages = value.split(/[,\s]+/).map((item) => item.trim()).filter(Boolean).map(Number);
    this.edit(setAges(current, blockId, ages.filter((age) => !Number.isNaN(age))));
  }

  onDates(blockId: string, value: string): void {
    const current = this.document();
    if (!current) return;
    const dates = value.split('\n').map((item) => item.trim()).filter(Boolean);
    this.edit(setDates(current, blockId, dates));
  }

  onRoom(blockId: string, roomId: string, field: 'public_name' | 'description_fr' | 'recommendation_fr', value: string): void {
    const current = this.document();
    if (!current) return;
    this.edit(setRoomText(current, blockId, roomId, field, value));
  }

  onFlight(blockId: string, flightId: string, field: 'flight_number' | 'at_time', value: string): void {
    const current = this.document();
    if (!current) return;
    this.edit(setFlightText(current, blockId, flightId, field, value));
  }

  onFlightDate(blockId: string, flightId: string, value: string): void {
    const current = this.document();
    if (!current) return;
    this.edit(setFlightDate(current, blockId, flightId, value));
  }

  text(block: CarnetBlock, field: string): string {
    return textOf(block.content, field);
  }

  date(block: CarnetBlock, field: string): string {
    return dateOf(block.content, field);
  }

  number(block: CarnetBlock, field: string): number {
    return intOf(block.content, field);
  }

  coords(block: CarnetBlock, field: string) {
    return coordsOf(block.content, field);
  }

  points(block: CarnetBlock, field: string): string {
    return pointsOf(block.content, field).join('\n');
  }

  ages(block: CarnetBlock): string {
    return listOf(block.content, 'children_ages').join(', ');
  }

  dates(block: CarnetBlock): string {
    return listOf(block.content, 'dates').join('\n');
  }

  rooms(block: CarnetBlock) {
    return roomsOf(block).filter((room) => !room.removed);
  }

  flights(block: CarnetBlock) {
    return flightsOf(block).filter((flight) => !flight.removed);
  }

  entries(block: CarnetBlock) {
    return entriesOf(block);
  }

  titleOf(block: CarnetBlock): string {
    return blockTitle(block);
  }

  pending(block: CarnetBlock): boolean {
    return sectionPending(block);
  }

  edited(block: CarnetBlock, field?: string): boolean {
    if (!field) return blockWasEdited(block);
    return isEditedField(block.content, field);
  }

  entryTitle(blockId: string): string {
    const block = this.document()?.blocks.find((item) => item.id === blockId);
    return block ? blockTitle(block) : 'Servicio';
  }

  entryRole(role: string): string {
    if (role === 'included') return 'Incluido';
    if (role === 'stay') return 'Estadía';
    if (role === 'transport') return 'Transporte';
    return 'Actividad';
  }

  warningLabel(warning: CarnetWarning): string {
    return warningText(warning.code, warning.message);
  }

  statusLabel(): string {
    return sourceStatusLabel(this.sourceStatus());
  }

  private edit(document: EditorState['document']): void {
    const current = this.state();
    if (!current) return;
    this.state.set(withDocument(current, document));
  }

  private applyServer(view: CarnetView): void {
    const next = loadEditor(view);
    this.state.set(next);
    this.warnings.set(view.draft.warnings ?? []);
    this.updatedAt.set(view.draft.updated_at || view.updated_at);
    this.fileAaId.set(view.file_aa_id);
    this.status.set(view.status);
    this.publication.set(view.publication);
    this.loadPublicationExtras();
    if (this.selectedId() && !next.document.blocks.some((block) => block.id === this.selectedId())) {
      this.selectedId.set(next.document.blocks[0]?.id ?? null);
    }
  }

  onSynced(view: CarnetView): void {
    this.applyServer(view);
    this.examining.set(false);
    this.loadSource();
    this.messages.add({
      severity: 'info',
      summary: 'Borrador actualizado',
      detail: 'Hay cambios pendientes de publicación. El Carnet publicado no cambió.',
    });
  }

  askPublish(): void {
    if (this.dirty() || this.validation().length || this.publishing()) return;
    const sourceNote = this.sourceStatus() === 'changed'
      ? ' La Ficha AA tiene cambios posteriores. Publicar no los mezcla ni reescribe el borrador.'
      : '';
    this.confirmation.confirm({
      header: 'Publicar Carnet',
      message: `Se creará una revisión nueva. El viajero verá esa versión hasta la siguiente publicación.${sourceNote}`,
      acceptLabel: 'Publicar',
      rejectLabel: 'Cancelar',
      accept: () => this.publish(),
    });
  }

  publish(): void {
    const current = this.state();
    if (!current) return;
    this.publishing.set(true);
    this.carnets.publish(this.carnetId, current.lockVersion).subscribe({
      next: (view) => {
        this.publishing.set(false);
        this.applyServer(view);
        this.messages.add({ severity: 'success', summary: 'Carnet publicado' });
      },
      error: (err: { status?: number; error?: { detail?: { errors?: string[] } } }) => {
        this.publishing.set(false);
        if (err.status === 409) {
          this.state.set(keepLocalAfterConflict(current));
          this.messages.add({
            severity: 'warn',
            summary: 'Otro usuario modificó el Carnet',
            detail: 'No se publicó. Los cambios de esta pantalla se conservan.',
          });
          return;
        }
        const errors = err.error?.detail?.errors ?? [];
        this.messages.add({
          severity: 'error',
          summary: 'No se pudo publicar',
          detail: errors[0] ?? 'Revise el contenido visible.',
        });
      },
    });
  }

  copyLink(): void {
    const path = this.publicPath();
    if (!path) return;
    const url = `${window.location.origin}${path}`;
    void navigator.clipboard.writeText(url).then(() => {
      this.messages.add({ severity: 'success', summary: 'Enlace copiado' });
    });
  }

  openPublished(): void {
    const path = this.publicPath();
    if (path) window.open(path, '_blank', 'noopener,noreferrer');
  }

  downloadDraft(): void {
    if (!this.carnetId || this.downloading()) return;
    this.downloading.set(true);
    this.carnets.draftPdf(this.carnetId).subscribe({
      next: (blob) => {
        this.downloading.set(false);
        this.carnets.saveBlob(blob, 'carnet-brouillon.pdf');
      },
      error: () => {
        this.downloading.set(false);
        this.messages.add({ severity: 'error', summary: 'No se pudo generar el PDF' });
      },
    });
  }

  downloadRevision(revisionNumber: number): void {
    this.carnets.revisionPdf(this.carnetId, revisionNumber).subscribe({
      next: (blob) => this.carnets.saveBlob(blob, `carnet-revision-${revisionNumber}.pdf`),
      error: () => this.messages.add({ severity: 'error', summary: 'No se pudo descargar la revisión' }),
    });
  }

  askRevoke(): void {
    this.confirmation.confirm({
      header: 'Revocar enlace',
      message: 'El enlace actual dejará de abrir el Carnet. La revisión publicada se conserva.',
      acceptLabel: 'Revocar',
      rejectLabel: 'Cancelar',
      accept: () => this.revoke(),
    });
  }

  askRotate(): void {
    this.confirmation.confirm({
      header: 'Rotar enlace',
      message: 'El enlace anterior dejará de funcionar. El nuevo permanece hasta que lo rote de nuevo.',
      acceptLabel: 'Rotar',
      rejectLabel: 'Cancelar',
      accept: () => this.rotate(),
    });
  }

  private revoke(): void {
    this.carnets.revokeLink(this.carnetId).subscribe({
      next: (publication) => {
        this.publication.set(publication);
        this.publicPath.set(null);
        this.messages.add({ severity: 'success', summary: 'Enlace revocado' });
      },
      error: () => this.messages.add({ severity: 'error', summary: 'No se pudo revocar el enlace' }),
    });
  }

  private rotate(): void {
    this.carnets.rotateLink(this.carnetId).subscribe({
      next: (link) => {
        this.publicPath.set(link.state === 'active' ? link.path : null);
        const current = this.publication();
        if (current) this.publication.set({ ...current, link_state: link.state });
        this.messages.add({ severity: 'success', summary: 'Enlace actualizado' });
      },
      error: () => this.messages.add({ severity: 'error', summary: 'No se pudo rotar el enlace' }),
    });
  }

  private loadPublicationExtras(): void {
    this.carnets.revisions(this.carnetId).subscribe({
      next: (body) => this.revisions.set(body.items),
      error: () => this.revisions.set([]),
    });
    this.carnets.publicLink(this.carnetId).subscribe({
      next: (link) => this.publicPath.set(link.state === 'active' ? link.path : null),
      error: () => this.publicPath.set(null),
    });
  }

  private loadSource(): void {
    this.carnets.sourceStatus(this.carnetId).subscribe({
      next: (status) => this.sourceStatus.set(status.status),
      error: () => this.sourceStatus.set('unavailable'),
    });
  }
}
