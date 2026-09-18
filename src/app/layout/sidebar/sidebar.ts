import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter, map, startWith } from 'rxjs/operators';
import { AuthService } from '../../core/auth/auth.service';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  roles?: string[];
}

interface SettingsNavItem {
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss'
})
export class Sidebar {
  collapsed = input(false);

  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  navItems: NavItem[] = [
    { label: 'Hoteles', icon: 'pi pi-building', route: '/hoteles' },
    { label: 'Vehículos', icon: 'pi pi-car', route: '/vehiculos' },
    { label: 'Actividades', icon: 'pi pi-map-marker', route: '/actividades' },
    { label: 'Cotizaciones', icon: 'pi pi-file', route: '/cotizaciones' },
    { label: 'Usuarios', icon: 'pi pi-users', route: '/usuarios', roles: ['admin'] },
  ];

  /** Ítems del menú Configuraciones — ampliar aquí al agregar más módulos. */
  settingsItems: SettingsNavItem[] = [
    { label: 'Generales', icon: 'pi pi-sliders-h', route: '/configuraciones/generales' },
    { label: 'Zonas', icon: 'pi pi-map', route: '/configuraciones/zonas' },
  ];

  private readonly settingsExpandedManual = signal<boolean | null>(null);

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  readonly settingsActive = computed(() => this.url().startsWith('/configuraciones'));

  readonly settingsExpanded = computed(() => {
    const manual = this.settingsExpandedManual();
    if (manual !== null) return manual;
    return this.settingsActive();
  });

  constructor() {
    effect(() => {
      // Al colapsar el sidebar, cerramos el submenú manual para no dejarlo a medias.
      if (this.collapsed()) {
        this.settingsExpandedManual.set(null);
      }
    });
  }

  toggleSettings(): void {
    if (this.collapsed()) {
      this.router.navigate(['/configuraciones/generales']);
      return;
    }
    this.settingsExpandedManual.set(!this.settingsExpanded());
  }

  canShowItem(item: NavItem): boolean {
    if (!item.roles?.length) return true;
    const role = this.auth.currentUser()?.role;
    return !!role && item.roles.includes(role);
  }

  canShowSettings(): boolean {
    return this.auth.currentUser()?.role === 'admin';
  }
}
