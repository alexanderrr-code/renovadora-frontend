import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./features/dashboard/dashboard.component')
      .then(m => m.DashboardComponent)
  },
  {
    path: 'ordenes',
    loadComponent: () => import('./features/ordenes/ordenes-list/ordenes-list.component')
      .then(m => m.OrdenesListComponent)
  },
  {
    path: 'clientes',
    loadComponent: () => import('./features/clientes/clientes-list/clientes-list.component')
      .then(m => m.ClientesListComponent)
  },
  {
    path: '**',
    redirectTo: '/dashboard'
  }
];
