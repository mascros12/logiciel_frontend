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
        path: 'hoteles',
        loadComponent: () =>
          import('./pages/hotels/hotel-list/hotel-list')
            .then(m => m.HotelList)
      },
      {
        path: 'contactos',
        loadComponent: () =>
          import('./pages/contacts/contact-list/contact-list')
            .then(m => m.ContactList)
      },
    ]
  },
  { path: '**', redirectTo: '' }
];