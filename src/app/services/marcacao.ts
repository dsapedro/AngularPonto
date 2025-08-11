import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { Marcacao } from './marcacao.model';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class MarcacaoService {
  private readonly API_URL = environment.apiUrl;

  private _marcacoes = new BehaviorSubject<Marcacao[]>([]);
  public readonly marcacoes$ = this._marcacoes.asObservable();

  private isOnline = navigator.onLine;

  constructor(private http: HttpClient) {
    window.addEventListener('online', () => this.syncMarcacoes());
    window.addEventListener('offline', () => this.isOnline = false);
    this.carregarMarcacoesIniciais();
  }

  private carregarMarcacoesIniciais() {
    this.http.get<Marcacao[]>(this.API_URL).subscribe(data => {
      this._marcacoes.next(
        data.map(m => ({ ...m, data: m.data })) // ajuste aqui se usar dataUtc no futuro
      );
    });
  }

  marcarPonto(
  usuario: string,
  data: string,
  hora: string,
  tipo: string,
  extras?: Partial<Pick<Marcacao, 'lat' | 'lng' | 'accuracyMeters' | 'timeZone' | 'agrupadorId'>>
) {
  const novaMarcacao: Marcacao = {
    usuario,
    data,
    hora,
    tipo,
    origem: this.isOnline ? 'online' : 'offline',
    ...(extras ?? {})
  };

  if (this.isOnline) {
    this.enviarMarcacao(novaMarcacao);
  } else {
    this.salvarMarcacaoLocal(novaMarcacao);
    alert('Você está offline. Marcação salva localmente.');
  }

  this._marcacoes.next([...this._marcacoes.value, novaMarcacao]);
}

  private enviarMarcacao(marcacao: Marcacao) {
    this.http.post(this.API_URL, marcacao).subscribe({
      next: () => console.log('Marcação enviada'),
      error: () => {
        console.error('Erro ao enviar. Salvando local.');
        marcacao.origem = 'offline';
        this.salvarMarcacaoLocal(marcacao);
      }
    });
  }

  private salvarMarcacaoLocal(m: Marcacao) {
    const pendentes: Marcacao[] = JSON.parse(localStorage.getItem('marcacoes_pendentes') || '[]');
    pendentes.push(m);
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
          this._marcacoes.next([...this._marcacoes.value, m]);
        },
        error: () => console.error('Falha ao sincronizar marcação')
      });
    });

    localStorage.removeItem('marcacoes_pendentes');
    alert('Marcações pendentes sincronizadas.');
  }
  buscarMarcacoes(): Observable<Marcacao[]> {
    return this.http.get<Marcacao[]>(this.API_URL);
  }
}
