import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { Meta } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { CarnetDocument } from '../../../core/models/carnet.model';
import { CarnetPdfStyle, CarnetService } from '../../../core/services/carnet.service';
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
  readonly downloading = signal<CarnetPdfStyle | null>(null);
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

  download(style: CarnetPdfStyle): void {
    const token = this.route.snapshot.paramMap.get('token') ?? '';
    if (this.downloading()) return;
    this.downloading.set(style);
    this.pdfError.set(false);
    const filename =
      style === 'simple' ? 'carnet-de-route-simple.pdf' : 'carnet-de-route.pdf';
    this.carnets.publishedPdf(token, style).subscribe({
      next: (blob) => {
        this.downloading.set(null);
        this.carnets.saveBlob(blob, filename);
      },
      error: () => {
        this.downloading.set(null);
        this.pdfError.set(true);
      },
    });
  }
}
