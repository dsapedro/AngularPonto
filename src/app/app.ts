import { Component } from '@angular/core';
import { RouterOutlet, Routes} from '@angular/router';
import { LoginComponent } from './telas/login/login.component';
import { PontoComponent } from './ponto/ponto.component';
import { HomeComponent } from './telas/home/home.component';
import { PwaInstallService } from './pwa-install.service';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet,CommonModule,HttpClientModule],
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
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'ponto', component: PontoComponent },
  { path: 'home', component: HomeComponent }
];

