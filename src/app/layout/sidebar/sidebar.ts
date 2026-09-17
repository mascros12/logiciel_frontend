import { Component, computed, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { MenuModule } from 'primeng/menu';
import { filter, map, startWith } from 'rxjs/operators';
import { AuthService } from '../../core/auth/auth.service';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  roles?: string[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, MenuModule],
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
  settingsMenuItems: MenuItem[] = [
    {
      label: 'Zonas',
      icon: 'pi pi-map',
      command: () => this.router.navigate(['/configuraciones/zonas']),
    },
  ];

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  readonly settingsActive = computed(() => this.url().startsWith('/configuraciones'));

  canShowItem(item: NavItem): boolean {
    if (!item.roles?.length) return true;
    const role = this.auth.currentUser()?.role;
    return !!role && item.roles.includes(role);
  }

  canShowSettings(): boolean {
    return this.auth.currentUser()?.role === 'admin';
  }
}
