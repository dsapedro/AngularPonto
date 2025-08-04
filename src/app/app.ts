import { Component } from '@angular/core';
import { RouterOutlet, Routes } from '@angular/router';
import { PontoComponent } from './ponto/ponto.component';
import { PwaInstallService } from './pwa-install.service';
import { CommonModule } from '@angular/common';


@Component({
  selector: 'app-root',
  imports: [RouterOutlet,CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected title = 'ponto-app';
  showInstall = false;

  constructor(private pwaService: PwaInstallService) {
    this.pwaService.promptEvent$.subscribe(() => {
      this.showInstall = true;
    });
  }

  installPwa() {
    this.pwaService.installApp();
  }
}

export const routes: Routes = [
  { path: '', redirectTo: 'ponto', pathMatch: 'full' },
  { path: 'ponto', component: PontoComponent }
];

