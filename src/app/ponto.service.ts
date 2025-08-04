import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class PontoService {
  private storageKey = 'marcacoes-ponto';

  registrarPonto() {
    const marcacoes = this.getMarcacoes();
    marcacoes.push({ dataHora: new Date().toISOString() });
    localStorage.setItem(this.storageKey, JSON.stringify(marcacoes));
  }

  getMarcacoes(): any[] {
    return JSON.parse(localStorage.getItem(this.storageKey) || '[]');
  }
}

