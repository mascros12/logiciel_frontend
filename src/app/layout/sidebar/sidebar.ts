import { Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
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
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss'
})
export class Sidebar {
  collapsed = input(false);

  navItems: NavItem[] = [
    { label: 'Hoteles', icon: 'pi pi-building', route: '/hoteles' },
    { label: 'Vehículos', icon: 'pi pi-car', route: '/vehiculos' },
    { label: 'Actividades', icon: 'pi pi-map-marker', route: '/actividades' },
    { label: 'Cotizaciones', icon: 'pi pi-file', route: '/cotizaciones' },
    { label: 'Usuarios', icon: 'pi pi-users', route: '/usuarios', roles: ['admin'] },
  ];

  constructor(public auth: AuthService) {}

  canShowItem(item: NavItem): boolean {
    if (!item.roles?.length) return true;
    const role = this.auth.currentUser()?.role;
    return !!role && item.roles.includes(role);
  }
}