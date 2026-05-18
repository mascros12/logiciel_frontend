import {
  AfterViewInit,
  Directive,
  ElementRef,
  OnDestroy,
  inject,
} from '@angular/core';

/**
 * Mantiene una barra de scroll horizontal fija al pie del viewport cuando la tabla
 * es más ancha que el contenedor y el scroll nativo quedaría fuera de pantalla.
 * El scroll vertical de la página no se modifica.
 */
@Directive({
  selector: '[appStickyHorizontalScroll]',
  standalone: true,
})
export class StickyHorizontalScrollDirective implements AfterViewInit, OnDestroy {
  private readonly hostRef = inject(ElementRef<HTMLElement>);

  private track: HTMLDivElement | null = null;
  private trackInner: HTMLDivElement | null = null;
  private ro: ResizeObserver | null = null;
  private syncing = false;
  private visible = false;

  private readonly onWindowScroll = () => this.refresh();
  private readonly onWindowResize = () => this.refresh();
  private readonly onHostScroll = () => this.syncHostToTrack();
  private readonly onTrackScroll = () => this.syncTrackToHost();

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
    host.addEventListener('scroll', this.onHostScroll, { passive: true });
    window.addEventListener('scroll', this.onWindowScroll, { passive: true, capture: true });
    window.addEventListener('resize', this.onWindowResize, { passive: true });

    this.ro = new ResizeObserver(() => this.refresh());
    this.ro.observe(host);
    const table = host.querySelector('table');
    if (table) {
      this.ro.observe(table);
    }

    queueMicrotask(() => this.refresh());
  }

  ngOnDestroy(): void {
    const host = this.hostRef.nativeElement;
    host.removeEventListener('scroll', this.onHostScroll);
    window.removeEventListener('scroll', this.onWindowScroll, true);
    window.removeEventListener('resize', this.onWindowResize);
    this.ro?.disconnect();
    this.track?.removeEventListener('scroll', this.onTrackScroll);
    this.track?.remove();
    host.classList.remove('sticky-h-scroll-host', 'sticky-h-scroll-host--mirror');
  }

  private hasHorizontalOverflow(host: HTMLElement): boolean {
    return host.scrollWidth > host.clientWidth + 1;
  }

  private shouldMirror(host: HTMLElement): boolean {
    if (!this.hasHorizontalOverflow(host)) {
      return false;
    }
    const rect = host.getBoundingClientRect();
    if (rect.bottom <= 0 || rect.top >= window.innerHeight) {
      return false;
    }
    // El scroll horizontal nativo está al final del contenedor: si el borde
    // inferior de la tabla queda bajo el viewport, mostramos la barra fija.
    return rect.bottom > window.innerHeight;
  }

  private refresh(): void {
    const host = this.hostRef.nativeElement;
    const track = this.track;
    const inner = this.trackInner;
    if (!track || !inner) {
      return;
    }

    inner.style.width = `${host.scrollWidth}px`;

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
    }

    if (show && !this.syncing) {
      this.syncing = true;
      track.scrollLeft = host.scrollLeft;
      this.syncing = false;
    }
  }

  private syncHostToTrack(): void {
    if (this.syncing || !this.visible) {
      return;
    }
    const host = this.hostRef.nativeElement;
    const track = this.track;
    if (!track) {
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
    this.syncing = true;
    host.scrollLeft = track.scrollLeft;
    this.syncing = false;
  }
}
