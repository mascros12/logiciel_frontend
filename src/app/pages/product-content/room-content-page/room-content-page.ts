import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { RichTextPipe } from '../../../core/pipes/rich-text.pipe';
import { ProductContentService, httpErrorText } from '../../../core/services/product-content.service';
import { RoomContentDetail } from '../../../core/models/product-content.model';
import { CAPACITY_OPTIONS } from '../../../core/utils/product-content-labels';
import {
  ClassificationDraft,
  buildClassificationWrite,
} from '../../../core/utils/product-content-payload';
import { ContentEditor } from '../content-editor/content-editor';

@Component({
  selector: 'app-room-content-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    ButtonModule,
    InputTextModule,
    SelectModule,
    SkeletonModule,
    ToastModule,
    RichTextPipe,
    ContentEditor,
  ],
  providers: [MessageService],
  templateUrl: './room-content-page.html',
  styleUrls: ['../content-shared.scss'],
})
export class RoomContentPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(ProductContentService);
  private readonly messages = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);

  readonly capacityOptions = CAPACITY_OPTIONS;
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly room = signal<RoomContentDetail | null>(null);

  readonly classification = this.fb.nonNullable.group({
    capacity_type: this.fb.nonNullable.control('unknown'),
    room_class: this.fb.nonNullable.control('', Validators.maxLength(151)),
  });

  private baseline: ClassificationDraft = { capacity_type: 'unknown', room_class: '' };

  ngOnInit(): void {
    this.route.paramMap.pipe(
      switchMap((params) => {
        const id = params.get('id');
        this.loading.set(true);
        this.error.set(null);
        this.room.set(null);
        if (!id) {
          this.error.set('Habitación no encontrada');
          return of<RoomContentDetail | null>(null);
        }
        return this.service.getRoom(id).pipe(
          catchError((err: unknown) => {
            this.error.set(httpErrorText(err));
            return of<RoomContentDetail | null>(null);
          }),
        );
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe((room) => {
      this.room.set(room);
      if (room) this.setClassification(room.capacity_type ?? 'unknown', room.room_class ?? '');
      this.loading.set(false);
    });
  }

  hasClassificationChanges(): boolean {
    return buildClassificationWrite(this.baseline, this.classification.getRawValue()) !== null;
  }

  saveClassification(): void {
    const room = this.room();
    const body = buildClassificationWrite(this.baseline, this.classification.getRawValue());
    if (!room || !body || this.classification.invalid) return;
    this.saving.set(true);
    this.service.saveRoomClassification(room.id, body).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (view) => {
        this.room.update((current) => current
          ? { ...current, capacity_type: view.capacity_type, room_class: view.room_class }
          : current);
        this.setClassification(view.capacity_type ?? 'unknown', view.room_class ?? '');
        this.saving.set(false);
        this.messages.add({ severity: 'success', summary: 'Clasificación guardada' });
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.messages.add({
          severity: 'error',
          summary: 'No se pudo guardar',
          detail: httpErrorText(err),
        });
      },
    });
  }

  private setClassification(capacityType: string, roomClass: string): void {
    this.classification.setValue({ capacity_type: capacityType, room_class: roomClass });
    this.baseline = this.classification.getRawValue();
  }
}
