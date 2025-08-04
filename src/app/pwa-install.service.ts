// src/app/pwa-install.service.ts
import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class PwaInstallService {
  private deferredPrompt: any;
  public promptEvent$ = new Subject<void>();

  constructor() {
    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault(); // Impede o Chrome de mostrar o banner automático
      this.deferredPrompt = event;
      this.promptEvent$.next(); // Notifica que pode instalar
    });
  }

  async installApp(): Promise<void> {
    if (this.deferredPrompt) {
      this.deferredPrompt.prompt();
      const choiceResult = await this.deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        console.log('Usuário aceitou a instalação');
      } else {
        console.log('Usuário recusou a instalação');
      }
      this.deferredPrompt = null;
    }
  }
}
