import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { DatePipe } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import {
  LAYOUT_KINDS,
  LAYOUT_SOURCES,
  LayoutKind,
  LayoutNode,
  LayoutState,
} from '../../../core/models/carnet-template.model';
import { apiUrl } from '../../../core/config/api.config';
import { CarnetTemplateService } from '../../../core/services/carnet-template.service';
import { FullPageImage } from '../../carnet/full-page-image/full-page-image';

@Component({
  selector: 'app-carnet-templates',
  standalone: true,
  imports: [
    FormsModule,
    DatePipe,
    DragDropModule,
    ButtonModule,
    InputTextModule,
    TextareaModule,
    ToastModule,
    FullPageImage,
  ],
  providers: [MessageService],
  templateUrl: './carnet-templates.html',
  styleUrl: './carnet-templates.scss',
})
export class CarnetTemplates implements OnInit {
  readonly kinds = LAYOUT_KINDS;
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly dirty = signal(false);
  readonly loadError = signal('');
  readonly state = signal<LayoutState | null>(null);
  readonly nodes = signal<LayoutNode[]>([]);
  readonly selectedId = signal<string | null>(null);

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
    this.templates.load().subscribe({
      next: (state) => this.apply(state),
      error: () => {
        this.loading.set(false);
        this.loadError.set('No se pudo cargar la plantilla.');
      },
    });
  }

  selected(): LayoutNode | null {
    const id = this.selectedId();
    if (!id) return null;
    for (const node of this.nodes()) {
      if (node.id === id) return node;
      const child = node.children.find((item) => item.id === id);
      if (child) return child;
    }
    return null;
  }

  childOf(): LayoutNode | null {
    const id = this.selectedId();
    if (!id) return null;
    return this.nodes().find((node) => node.children.some((child) => child.id === id)) ?? null;
  }

  kindLabel(kind: LayoutKind): string {
    return this.kinds.find((item) => item.id === kind)?.label ?? kind;
  }

  readonly templateMediaBase = apiUrl('carnet-templates/media');

  sourceLabel(node: LayoutNode): string {
    if (node.kind === 'full_page_image') {
      return 'Página A4 vertical completa, sin márgenes ni texto automático.';
    }
    return LAYOUT_SOURCES[node.config.source] ?? node.config.source;
  }

  kindChoices(node: LayoutNode): typeof LAYOUT_KINDS {
    if (this.childOf()?.id && this.selected()?.id === node.id) {
      return this.kinds.filter((item) => !item.anchor);
    }
    return this.kinds;
  }

  canAddChild(node: LayoutNode): boolean {
    return node.kind !== 'cover'
      && node.kind !== 'table_of_contents'
      && node.kind !== 'full_page_image';
  }

  dropRoot(event: CdkDragDrop<LayoutNode[]>): void {
    const nodes = [...this.nodes()];
    moveItemInArray(nodes, event.previousIndex, event.currentIndex);
    this.nodes.set(nodes);
    this.dirty.set(true);
  }

  dropChild(parent: LayoutNode, event: CdkDragDrop<LayoutNode[]>): void {
    moveItemInArray(parent.children, event.previousIndex, event.currentIndex);
    this.nodes.set([...this.nodes()]);
    this.dirty.set(true);
  }

  addSection(): void {
    const node = this.blank('rich_text_section', 'Nouvelle section');
    this.nodes.set([...this.nodes(), node]);
    this.selectedId.set(node.id);
    this.dirty.set(true);
  }

  addChild(parent: LayoutNode): void {
    if (!this.canAddChild(parent)) return;
    const child = this.blank('rich_text_section', 'Nouvelle sous-section');
    parent.children = [...parent.children, child];
    this.nodes.set([...this.nodes()]);
    this.selectedId.set(child.id);
    this.dirty.set(true);
  }

  removeSelected(): void {
    const id = this.selectedId();
    if (!id) return;
    const nodes = this.nodes()
      .filter((node) => node.id !== id)
      .map((node) => ({ ...node, children: node.children.filter((child) => child.id !== id) }));
    this.nodes.set(nodes);
    this.selectedId.set(nodes[0]?.id ?? null);
    this.dirty.set(true);
  }

  changeKind(node: LayoutNode, kind: LayoutKind): void {
    node.kind = kind;
    if (kind !== 'full_page_image') {
      node.config = { ...node.config, asset_id: null };
    }
    if (!this.canAddChild(node)) node.children = [];
    this.nodes.set([...this.nodes()]);
    this.dirty.set(true);
  }

  onImage(node: LayoutNode, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.busy.set(true);
    this.templates.upload(file).subscribe({
      next: (asset) => {
        node.config = { ...node.config, asset_id: asset.id };
        this.nodes.set([...this.nodes()]);
        this.dirty.set(true);
        this.busy.set(false);
        this.messages.add(
          asset.warning
            ? { severity: 'warn', summary: 'Imagen cargada', detail: asset.warning }
            : { severity: 'success', summary: 'Imagen cargada en el borrador' },
        );
      },
      error: (error: { error?: { detail?: string } }) => {
        this.busy.set(false);
        const detail = typeof error.error?.detail === 'string'
          ? error.error.detail
          : 'No se pudo cargar la imagen';
        this.messages.add({ severity: 'error', summary: detail });
      },
    });
  }

  clearImage(node: LayoutNode): void {
    node.config = { ...node.config, asset_id: null };
    this.nodes.set([...this.nodes()]);
    this.dirty.set(true);
  }

  touch(): void {
    this.dirty.set(true);
  }

  save(): void {
    const current = this.state();
    if (!current || this.invalid()) return;
    this.busy.set(true);
    this.templates.saveDraft({
      lock_version: current.draft_lock_version,
      nodes: this.nodes(),
    }).subscribe({
      next: (state) => {
        this.apply(state);
        this.messages.add({ severity: 'success', summary: 'Borrador guardado' });
      },
      error: (error) => this.fail(error, 'No se pudo guardar el borrador'),
    });
  }

  publish(): void {
    if (this.dirty() || !this.state()) return;
    this.busy.set(true);
    this.templates.publish().subscribe({
      next: (state) => {
        this.apply(state);
        const number = state.versions[0]?.version_number;
        this.messages.add({
          severity: 'success',
          summary: number ? `Versión ${number} publicada` : 'Versión publicada',
          detail: 'Todavía no se usa en los Carnets nuevos hasta que se active.',
        });
      },
      error: (error) => this.fail(error, 'No se pudo publicar'),
    });
  }

  activate(versionId: string): void {
    const current = this.state();
    if (!current) return;
    this.busy.set(true);
    this.templates.activate(versionId, current.lock_version).subscribe({
      next: (state) => {
        this.apply(state);
        this.messages.add({
          severity: 'success',
          summary: 'Versión activada',
          detail: 'Los Carnets ya creados conservan la versión con la que se generaron.',
        });
      },
      error: (error) => this.fail(error, 'No se pudo activar'),
    });
  }

  private apply(state: LayoutState): void {
    this.state.set(state);
    this.nodes.set(state.nodes.map((node) => ({ ...node, children: [...node.children] })));
    if (!this.selected() && state.nodes[0]) this.selectedId.set(state.nodes[0].id);
    this.dirty.set(false);
    this.busy.set(false);
    this.loading.set(false);
  }

  private invalid(): boolean {
    const titles = this.walk().map((node) => node.title.trim());
    if (titles.some((title) => !title)) {
      this.messages.add({ severity: 'warn', summary: 'Cada sección necesita un título' });
      this.busy.set(false);
      return true;
    }
    return false;
  }

  private walk(): LayoutNode[] {
    return this.nodes().flatMap((node) => [node, ...node.children]);
  }

  private blank(kind: LayoutKind, title: string): LayoutNode {
    return {
      id: crypto.randomUUID(),
      kind,
      title,
      position: 0,
      visible: true,
      body: '',
      config: { source: 'none', asset_id: null },
      children: [],
    };
  }

  private fail(error: { status?: number; error?: { detail?: string } }, summary: string): void {
    this.busy.set(false);
    if (error?.status === 409) {
      this.messages.add({
        severity: 'warn',
        summary: 'La plantilla cambió',
        detail: 'Otra persona la guardó. Se recarga la versión vigente.',
      });
      this.reload();
      return;
    }
    const detail = error?.error?.detail;
    this.messages.add({
      severity: 'error',
      summary,
      detail: typeof detail === 'string' ? detail : 'Revise la estructura e intente de nuevo.',
    });
  }
}
