import { Component, DestroyRef, effect, inject, input, signal, untracked } from '@angular/core';
import { FormArray, FormBuilder, FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { TabsModule } from 'primeng/tabs';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { ProductContentService, httpErrorText } from '../../../core/services/product-content.service';
import { ProductContentView, ProductEntityPath } from '../../../core/models/product-content.model';
import { ATTRIBUTE_FIELDS, AttributeKind } from '../../../core/utils/product-content-labels';
import {
  ContentDraft,
  buildContentWrite,
  contentDraftsDiffer,
  draftFromContent,
} from '../../../core/utils/product-content-payload';

@Component({
  selector: 'app-content-editor',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    TextareaModule,
    TabsModule,
    SelectModule,
    TooltipModule,
    ToastModule,
  ],
  providers: [MessageService],
  templateUrl: './content-editor.html',
  styleUrl: './content-editor.scss',
})
export class ContentEditor {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(ProductContentService);
  private readonly messages = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  readonly entityType = input.required<ProductEntityPath>();
  readonly entityId = input.required<string>();
  readonly content = input<ProductContentView | null>(null);
  readonly attributeKind = input.required<AttributeKind>();
  readonly pending = input(false);

  readonly localeTab = signal<'es' | 'fr'>('es');
  readonly ready = signal(false);
  readonly saving = signal(false);

  readonly form = this.fb.group({
    es: this.localeGroup(),
    fr: this.localeGroup(),
    attributes: this.fb.group({}),
  });

  private baseline: ContentDraft = draftFromContent('none', null);
  private loadedId = '';

  constructor() {
    effect(() => {
      const id = this.entityId();
      const kind = this.attributeKind();
      const content = this.content();
      untracked(() => this.apply(id, kind, content));
    });
  }

  fields() {
    const kind = this.attributeKind();
    return kind === 'none' ? [] : ATTRIBUTE_FIELDS[kind];
  }

  points(locale: 'es' | 'fr'): FormArray<FormControl<string>> {
    return this.form.controls[locale].controls.selling_points;
  }

  hasChanges(): boolean {
    return contentDraftsDiffer(this.baseline, this.currentDraft(), this.attributeKind());
  }

  validationError(): string | null {
    if (!this.hasChanges()) return null;
    return buildContentWrite(this.baseline, this.currentDraft(), this.attributeKind()).error;
  }

  onLocaleTab(value: string | number | undefined): void {
    this.localeTab.set(value === 'fr' ? 'fr' : 'es');
  }

  addPoint(locale: 'es' | 'fr'): void {
    this.points(locale).push(this.fb.nonNullable.control(''));
  }

  removePoint(locale: 'es' | 'fr', index: number): void {
    this.points(locale).removeAt(index);
  }

  movePoint(locale: 'es' | 'fr', index: number, delta: -1 | 1): void {
    const target = index + delta;
    const points = this.points(locale);
    if (target < 0 || target >= points.length) return;
    const control = points.at(index);
    points.removeAt(index);
    points.insert(target, control);
  }

  save(): void {
    const result = buildContentWrite(this.baseline, this.currentDraft(), this.attributeKind());
    if (result.error || !result.body) return;
    this.saving.set(true);
    this.form.disable({ emitEvent: false });
    this.service
      .saveContent(this.entityType(), this.entityId(), result.body)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (view) => {
          this.apply(this.entityId(), this.attributeKind(), view);
          this.saving.set(false);
          this.messages.add({ severity: 'success', summary: 'Contenido guardado' });
        },
        error: (err: unknown) => {
          this.form.enable({ emitEvent: false });
          this.saving.set(false);
          this.messages.add({
            severity: 'error',
            summary: 'No se pudo guardar',
            detail: httpErrorText(err),
          });
        },
      });
  }

  private apply(id: string, kind: AttributeKind, content: ProductContentView | null): void {
    if (id !== this.loadedId) {
      this.localeTab.set('es');
      this.loadedId = id;
    }
    this.ensureAttributes(kind);
    const draft = draftFromContent(kind, content);
    this.patchLocale('es', draft.es);
    this.patchLocale('fr', draft.fr);
    for (const [key, value] of Object.entries(draft.attributes)) {
      this.form.controls.attributes.get(key)?.setValue(value, { emitEvent: false });
    }
    this.baseline = draft;
    this.form.enable({ emitEvent: false });
    this.ready.set(true);
  }

  private patchLocale(locale: 'es' | 'fr', draft: ContentDraft['es']): void {
    const group = this.form.controls[locale];
    group.patchValue(
      {
        short_description: draft.short_description,
        description: draft.description,
        recommendation: draft.recommendation,
      },
      { emitEvent: false },
    );
    const points = group.controls.selling_points;
    points.clear({ emitEvent: false });
    for (const point of draft.selling_points) {
      points.push(this.fb.nonNullable.control(point), { emitEvent: false });
    }
  }

  private ensureAttributes(kind: AttributeKind): void {
    const group = this.form.controls.attributes;
    for (const key of Object.keys(group.controls)) {
      group.removeControl(key);
    }
    if (kind === 'none') return;
    for (const field of ATTRIBUTE_FIELDS[kind]) {
      group.addControl(field.key, this.fb.nonNullable.control('unknown'));
    }
  }

  private currentDraft(): ContentDraft {
    const raw = this.form.getRawValue();
    return {
      es: {
        short_description: raw.es.short_description,
        description: raw.es.description,
        recommendation: raw.es.recommendation,
        selling_points: [...raw.es.selling_points],
      },
      fr: {
        short_description: raw.fr.short_description,
        description: raw.fr.description,
        recommendation: raw.fr.recommendation,
        selling_points: [...raw.fr.selling_points],
      },
      attributes: { ...(raw.attributes as Record<string, string>) },
    };
  }

  private localeGroup() {
    return this.fb.nonNullable.group({
      short_description: '',
      description: '',
      recommendation: '',
      selling_points: this.fb.nonNullable.array<string>([]),
    });
  }
}
