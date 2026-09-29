import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs/operators';

@Component({
  selector: 'app-content-shell',
  standalone: true,
  imports: [RouterLink, RouterOutlet],
  templateUrl: './content-shell.html',
  styleUrl: './content-shell.scss',
})
export class ContentShell {
  private readonly router = inject(Router);

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  readonly section = computed(() => {
    const url = this.url();
    if (url.includes('/contenido/actividades')) return 'actividades';
    if (url.includes('/contenido/vehiculos')) return 'vehiculos';
    return 'hoteles';
  });
}
