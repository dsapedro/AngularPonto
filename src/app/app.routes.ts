import { Routes } from '@angular/router';
import { PontoComponent } from './ponto/ponto.component';

export const routes: Routes = [
  { path: '', redirectTo: 'ponto', pathMatch: 'full' },
  { path: 'ponto', component: PontoComponent }
];