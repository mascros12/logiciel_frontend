import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
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
        canActivate: [authGuard],
        data: { roles: ['admin'] },
        loadComponent: () =>
          import('./pages/dashboard/admin-dashboard/admin-dashboard')
            .then(m => m.AdminDashboard)
      },
      {
        path: 'cotizaciones',
        loadComponent: () =>
          import('./pages/quotations/quotation-list/quotation-list')
            .then(m => m.QuotationList)
      },
      {
        path: 'cotizaciones/:id',
        loadComponent: () =>
          import('./pages/quotations/quotation-detail/quotation-detail')
            .then(m => m.QuotationDetail)
      },
      {
        path: 'actividades',
        loadComponent: () =>
          import('./pages/activities/activity-list/activity-list')
            .then(m => m.ActivityList)
      },
      {
        path: 'vehiculos',
        loadComponent: () =>
          import('./pages/vehicles/vehicle-list/vehicle-list')
            .then(m => m.VehicleList)
      },
      {
        path: 'vehiculos/:id',
        canActivate: [authGuard],
        data: { roles: ['admin', 'admin_proveedores'] },
        loadComponent: () =>
          import('./pages/vehicles/vehicle-detail/vehicle-detail')
            .then(m => m.VehicleDetail)
      },
      {
        path: 'hoteles',
        loadComponent: () =>
          import('./pages/hotels/hotel-list/hotel-list')
            .then(m => m.HotelList)
      },
      { 
        path: 'hoteles/:id', 
        loadComponent: () => 
          import('./pages/hotels/hotel-detail/hotel-detail')
            .then(m => m.HotelDetail) 
      },
      {
        path: 'contactos',
        loadComponent: () =>
          import('./pages/contacts/contact-list/contact-list')
            .then(m => m.ContactList)
      },
      {
        path: 'usuarios',
        canActivate: [authGuard],
        data: { roles: ['admin'] },
        loadComponent: () =>
          import('./pages/users/user-list/user-list')
            .then(m => m.UserList)
      },
    ]
  },
  { path: '**', redirectTo: '' }
];