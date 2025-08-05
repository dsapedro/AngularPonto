import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';
import { Marcacao } from './marcacao.model';


@Injectable({
  providedIn: 'root'
})
export class MarcacaoService {
  private readonly API_URL = 'http://localhost:3000/marcacoes';

  private _marcacoes = new BehaviorSubject<Marcacao[]>([]);
  public readonly marcacoes$ = this._marcacoes.asObservable();

  private isOnline = navigator.onLine;

  constructor(private http: HttpClient) {
    window.addEventListener('online', () => this.syncMarcacoes());
    window.addEventListener('offline', () => this.isOnline = false);

    this.carregarMarcacoesIniciais();
  }

  private carregarMarcacoesIniciais() {
    this.http.get<any[]>(this.API_URL).subscribe(data => {
      this._marcacoes.next(data);
    });
  }

  marcarPonto() {
    const novaMarcacao: Marcacao = {
      usuario: 'Pedro',
      data: new Date().toISOString(),
      tipo: 'entrada',
      origem: this.isOnline ? 'online' : 'offline'
    };


    if (this.isOnline) {
      this.enviarMarcacao(novaMarcacao);
    } else {
      this.salvarMarcacaoLocal(novaMarcacao);
      alert('Você está offline. Marcação salva localmente.');
    }

    const atual = this._marcacoes.value;
    this._marcacoes.next([...atual, novaMarcacao]);
  }

  private enviarMarcacao(marcacao: any) {
    this.http.post(this.API_URL, marcacao).subscribe({
      next: () => console.log('Marcação enviada'),
      error: () => {
        console.error('Erro ao enviar. Salvando local.');
        marcacao.origem = 'offline';
        this.salvarMarcacaoLocal(marcacao);
      }
    });
  }

  private salvarMarcacaoLocal(marcacao: any) {
    const pendentes: Marcacao[] = JSON.parse(localStorage.getItem('marcacoes_pendentes') || '[]');
    pendentes.push(marcacao);
    localStorage.setItem('marcacoes_pendentes', JSON.stringify(pendentes));
  }

  private syncMarcacoes() {
    this.isOnline = true;
    const pendentes: Marcacao[] = JSON.parse(localStorage.getItem('marcacoes_pendentes') || '[]');
    if (!pendentes.length) return;

    pendentes.forEach(m => {
      this.http.post(this.API_URL, m).subscribe({
        next: () => {
          m.origem = 'sincronizado';
          const atual = this._marcacoes.value;
          this._marcacoes.next([...atual, m]);
        },
        error: () => console.error('Falha ao sincronizar marcação')
      });
    });

    localStorage.removeItem('marcacoes_pendentes');
    alert('Marcações pendentes sincronizadas.');
  }
}
