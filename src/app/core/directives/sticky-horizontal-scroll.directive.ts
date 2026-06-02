import {
  AfterViewInit,
  Directive,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  inject,
} from '@angular/core';

/**
 * Barra de scroll horizontal fija al pie del viewport cuando la tabla desborda
 * y su scroll nativo quedaría fuera de pantalla. El scroll vertical no cambia.
 */
@Directive({
  selector: '[appStickyHorizontalScroll]',
  standalone: true,
})
export class StickyHorizontalScrollDirective implements AfterViewInit, OnChanges, OnDestroy {
  private readonly hostRef = inject(ElementRef<HTMLElement>);

  /** Recalcular al cambiar pestaña, columnas, etc. (p. ej. `[stickyScrollRefresh]="fichaDetailDragBodyKey()"`). */
  @Input() stickyScrollRefresh: unknown;

  private track: HTMLDivElement | null = null;
  private trackInner: HTMLDivElement | null = null;
  private ro: ResizeObserver | null = null;
  private io: IntersectionObserver | null = null;
  private rafId = 0;
  private syncing = false;
  private visible = false;
  private trackDragging = false;
  private lastContentWidth = 0;

  private readonly onWindowScroll = () => this.scheduleLayout();
  private readonly onWindowResize = () => this.scheduleLayout();
  private readonly onHostScroll = () => this.syncHostToTrack();
  private readonly onTrackScroll = () => this.syncTrackToHost();
  private readonly onTrackPointerDown = () => {
    this.trackDragging = true;
  };
  private readonly onTrackPointerUp = () => {
    this.trackDragging = false;
  };

  ngAfterViewInit(): void {
    const host = this.hostRef.nativeElement;
    host.classList.add('sticky-h-scroll-host');

    this.track = document.createElement('div');
    this.track.className = 'sticky-h-scroll-track';
    this.track.setAttribute('aria-hidden', 'true');
    this.trackInner = document.createElement('div');
    this.trackInner.className = 'sticky-h-scroll-track-inner';
    this.track.appendChild(this.trackInner);
    document.body.appendChild(this.track);

    this.track.addEventListener('scroll', this.onTrackScroll, { passive: true });
    this.track.addEventListener('pointerdown', this.onTrackPointerDown);
    this.track.addEventListener('pointerup', this.onTrackPointerUp);
    this.track.addEventListener('pointercancel', this.onTrackPointerUp);
    this.track.addEventListener('lostpointercapture', this.onTrackPointerUp);

    host.addEventListener('scroll', this.onHostScroll, { passive: true });
    window.addEventListener('scroll', this.onWindowScroll, { passive: true });
    window.addEventListener('resize', this.onWindowResize, { passive: true });

    this.ro = new ResizeObserver(() => this.scheduleLayout());
    this.ro.observe(host);
    const table = host.querySelector('table');
    if (table) {
      this.ro.observe(table);
    }

    this.io = new IntersectionObserver(() => this.scheduleLayout(), {
      threshold: [0, 0.01, 0.1],
    });
    this.io.observe(host);

    this.scheduleLayout();
  }

  ngOnChanges(_changes: SimpleChanges): void {
    this.scheduleLayout();
  }

  ngOnDestroy(): void {
    const host = this.hostRef.nativeElement;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }
    host.removeEventListener('scroll', this.onHostScroll);
    window.removeEventListener('scroll', this.onWindowScroll);
    window.removeEventListener('resize', this.onWindowResize);
    this.ro?.disconnect();
    this.io?.disconnect();
    this.track?.removeEventListener('scroll', this.onTrackScroll);
    this.track?.removeEventListener('pointerdown', this.onTrackPointerDown);
    this.track?.removeEventListener('pointerup', this.onTrackPointerUp);
    this.track?.removeEventListener('pointercancel', this.onTrackPointerUp);
    this.track?.removeEventListener('lostpointercapture', this.onTrackPointerUp);
    this.track?.remove();
    host.classList.remove('sticky-h-scroll-host', 'sticky-h-scroll-host--mirror');
  }

  private scheduleLayout(): void {
    if (this.trackDragging) {
      return;
    }
    if (this.rafId) {
      return;
    }
    this.rafId = requestAnimationFrame(() => {
      this.rafId = 0;
      this.updateLayout();
    });
  }

  private hasHorizontalOverflow(host: HTMLElement): boolean {
    return host.scrollWidth > host.clientWidth + 1;
  }

  private shouldMirror(host: HTMLElement): boolean {
    if (!this.hasHorizontalOverflow(host)) {
      return false;
    }
    const rect = host.getBoundingClientRect();
    // Mientras la tabla sea visible en el viewport, fijar la barra al pie de pantalla.
    return rect.bottom > 0 && rect.top < window.innerHeight;
  }

  private updateContentWidth(host: HTMLElement, track: HTMLDivElement): void {
    const inner = this.trackInner;
    if (!inner) {
      return;
    }
    const w = host.scrollWidth;
    if (w === this.lastContentWidth) {
      return;
    }
    const scrollLeft = track.scrollLeft;
    inner.style.width = `${w}px`;
    track.scrollLeft = scrollLeft;
    this.lastContentWidth = w;
  }

  private updateLayout(): void {
    const host = this.hostRef.nativeElement;
    const track = this.track;
    if (!track) {
      return;
    }

    this.updateContentWidth(host, track);

    const show = this.shouldMirror(host);
    if (show) {
      const rect = host.getBoundingClientRect();
      track.style.left = `${Math.max(0, rect.left)}px`;
      track.style.width = `${rect.width}px`;
    }

    if (show !== this.visible) {
      this.visible = show;
      track.classList.toggle('sticky-h-scroll-track--visible', show);
      host.classList.toggle('sticky-h-scroll-host--mirror', show);
      if (show) {
        this.syncing = true;
        track.scrollLeft = host.scrollLeft;
        this.syncing = false;
      }
    }
  }

  private syncHostToTrack(): void {
    if (this.syncing || !this.visible) {
      return;
    }
    const track = this.track;
    if (!track) {
      return;
    }
    const host = this.hostRef.nativeElement;
    if (track.scrollLeft === host.scrollLeft) {
      return;
    }
    this.syncing = true;
    track.scrollLeft = host.scrollLeft;
    this.syncing = false;
  }

  private syncTrackToHost(): void {
    if (this.syncing) {
      return;
    }
    const host = this.hostRef.nativeElement;
    const track = this.track;
    if (!track) {
      return;
    }
    if (host.scrollLeft === track.scrollLeft) {
      return;
    }
    this.syncing = true;
    host.scrollLeft = track.scrollLeft;
    this.syncing = false;
  }
}
