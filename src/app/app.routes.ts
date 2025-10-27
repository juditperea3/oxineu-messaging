import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { MenuComponent } from './pages/menu/menu.component';
import { DetailComponent } from './pages/detail/detail.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { ErrorComponent } from './pages/error/error.component';

export const routes: Routes = [
  {
    path: '',
    component: HomeComponent
  }, {
    path: 'dashboard',
    component: DashboardComponent
  },
  {
    path: 'error',
    component: ErrorComponent
  },
  {
    path: 'menu',
    component: MenuComponent
  },
  { path: 'detall', component: DetailComponent }

];