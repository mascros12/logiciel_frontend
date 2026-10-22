import { HttpClient } from '@angular/common/http';
import { Component, OnDestroy, effect, inject, input, signal } from '@angular/core';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-full-page-image',
  standalone: true,
  templateUrl: './full-page-image.html',
  styleUrl: './full-page-image.scss',
})
export class FullPageImage implements OnDestroy {
  readonly assetId = input<string | null>(null);
  readonly publicBase = input<string | null>(null);
  readonly privateBase = input<string | null>(null);

  readonly src = signal<string | null>(null);

  private readonly http = inject(HttpClient);
  private request = 0;
  private objectUrl: string | null = null;
  private subscription: Subscription | null = null;

  constructor() {
    effect(() => {
      const id = this.assetId();
      const pub = this.publicBase();
      const priv = this.privateBase();
      const ticket = ++this.request;
      this.release();
      if (!id) {
        this.src.set(null);
        return;
      }
      if (pub) {
        this.src.set(`${pub.replace(/\/$/, '')}/${id}`);
        return;
      }
      if (!priv) {
        this.src.set(null);
        return;
      }
      const url = `${priv.replace(/\/$/, '')}/${id}`;
      this.subscription = this.http.get(url, { responseType: 'blob' }).subscribe({
        next: (blob) => {
          if (ticket !== this.request) return;
          this.objectUrl = URL.createObjectURL(blob);
          this.src.set(this.objectUrl);
        },
        error: () => {
          if (ticket === this.request) this.src.set(null);
        },
      });
    });
  }

  ngOnDestroy(): void {
    this.request += 1;
    this.release();
  }

  private release(): void {
    this.subscription?.unsubscribe();
    this.subscription = null;
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }
  }
}
