import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    title: 'Logiciel - Inicio de sesión',
    loadComponent: () =>
      import('./pages/login/login').then(m => m.Login)
  },
  {
    path: '',
    loadComponent: () =>
      import('./layout/layout').then(m => m.Layout),
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'cotizaciones', pathMatch: 'full' },
      {
        path: 'dashboard',
        title: 'Logiciel - Panel administrativo',
        canActivate: [authGuard],
        data: { roles: ['admin'] },
        loadComponent: () =>
          import('./pages/dashboard/admin-dashboard/admin-dashboard')
            .then(m => m.AdminDashboard)
      },
      {
        path: 'cotizaciones',
        title: 'Logiciel - Cotizaciones',
        loadComponent: () =>
          import('./pages/quotations/quotation-list/quotation-list')
            .then(m => m.QuotationList)
      },
      {
        path: 'cotizaciones/:id',
        title: 'Logiciel - Cotización',
        loadComponent: () =>
          import('./pages/quotations/quotation-detail/quotation-detail')
            .then(m => m.QuotationDetail)
      },
      {
        path: 'actividades',
        title: 'Logiciel - Actividades',
        loadComponent: () =>
          import('./pages/activities/activity-list/activity-list')
            .then(m => m.ActivityList)
      },
      {
        path: 'vehiculos',
        title: 'Logiciel - Vehículos',
        loadComponent: () =>
          import('./pages/vehicles/vehicle-list/vehicle-list')
            .then(m => m.VehicleList)
      },
      {
        path: 'vehiculos/:id',
        title: 'Logiciel - Vehículo',
        canActivate: [authGuard],
        data: { roles: ['admin', 'admin_proveedores'] },
        loadComponent: () =>
          import('./pages/vehicles/vehicle-detail/vehicle-detail')
            .then(m => m.VehicleDetail)
      },
      {
        path: 'hoteles',
        title: 'Logiciel - Hoteles',
        loadComponent: () =>
          import('./pages/hotels/hotel-list/hotel-list')
            .then(m => m.HotelList)
      },
      {
        path: 'hoteles/:id',
        title: 'Logiciel - Hotel',
        loadComponent: () =>
          import('./pages/hotels/hotel-detail/hotel-detail')
            .then(m => m.HotelDetail)
      },
      {
        path: 'contactos',
        title: 'Logiciel - Contactos',
        loadComponent: () =>
          import('./pages/contacts/contact-list/contact-list')
            .then(m => m.ContactList)
      },
      {
        path: 'usuarios',
        title: 'Logiciel - Usuarios',
        canActivate: [authGuard],
        data: { roles: ['admin'] },
        loadComponent: () =>
          import('./pages/users/user-list/user-list')
            .then(m => m.UserList)
      },
      {
        path: 'configuraciones/generales',
        title: 'Logiciel - Configuración general',
        canActivate: [authGuard],
        data: { roles: ['admin'] },
        loadComponent: () =>
          import('./pages/settings/general/general-settings')
            .then(m => m.GeneralSettings)
      },
      {
        path: 'configuraciones/zonas',
        title: 'Logiciel - Zonas',
        canActivate: [authGuard],
        data: { roles: ['admin'] },
        loadComponent: () =>
          import('./pages/settings/zones/zone-list/zone-list')
            .then(m => m.ZoneList)
      },
      {
        path: 'configuraciones/proveedores',
        title: 'Logiciel - Proveedores',
        canActivate: [authGuard],
        data: { roles: ['admin'] },
        loadComponent: () =>
          import('./pages/settings/providers/provider-list/provider-list')
            .then(m => m.ProviderList)
      },
    ]
  },
  { path: '**', redirectTo: '' }
];