import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { Meta } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { CarnetDocument } from '../../../core/models/carnet.model';
import { CarnetService } from '../../../core/services/carnet.service';
import { documentFromPublic } from '../../../core/utils/carnet-document';
import { apiUrl } from '../../../core/config/api.config';
import { CarnetPreview } from '../carnet-preview/carnet-preview';

@Component({
  selector: 'app-carnet-public',
  standalone: true,
  imports: [CarnetPreview],
  templateUrl: './carnet-public.html',
  styleUrl: './carnet-public.scss',
})
export class CarnetPublic implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly carnets = inject(CarnetService);
  private readonly meta = inject(Meta);

  readonly loading = signal(true);
  readonly missing = signal(false);
  readonly downloading = signal(false);
  readonly pdfError = signal(false);
  readonly document = signal<CarnetDocument | null>(null);

  mediaBase(): string {
    const token = this.route.snapshot.paramMap.get('token') ?? '';
    return apiUrl(`public/carnets/${encodeURIComponent(token)}/media`);
  }

  ngOnInit(): void {
    this.meta.updateTag({ name: 'referrer', content: 'no-referrer' });
    const token = this.route.snapshot.paramMap.get('token') ?? '';
    this.carnets.published(token).subscribe({
      next: (view) => {
        this.document.set(documentFromPublic(view));
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.missing.set(true);
      },
    });
  }

  ngOnDestroy(): void {
    this.meta.removeTag('name="referrer"');
  }

  download(): void {
    const token = this.route.snapshot.paramMap.get('token') ?? '';
    this.downloading.set(true);
    this.pdfError.set(false);
    this.carnets.publishedPdf(token).subscribe({
      next: (blob) => {
        this.downloading.set(false);
        this.carnets.saveBlob(blob, 'carnet-de-route.pdf');
      },
      error: () => {
        this.downloading.set(false);
        this.pdfError.set(true);
      },
    });
  }
}
