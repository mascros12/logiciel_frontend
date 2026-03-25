import { Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NgClass } from '@angular/common';
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
  ];

  constructor(public auth: AuthService) {}
}