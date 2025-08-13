import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { Marcacao } from './marcacao.model';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class MarcacaoService {
  private readonly API_URL = environment.apiUrl; // ex.: https://sua-api/marcacoes

  private _marcacoes = new BehaviorSubject<Marcacao[]>([]);
  public readonly marcacoes$ = this._marcacoes.asObservable();

  private isOnline = navigator.onLine;

  constructor(private http: HttpClient) {
    window.addEventListener('online', () => this.syncMarcacoes());
    window.addEventListener('offline', () => (this.isOnline = false));
    this.carregarMarcacoesIniciais();
  }

  private carregarMarcacoesIniciais() {
    this.http.get<Marcacao[]>(this.API_URL).subscribe({
      next: (data) => this._marcacoes.next(data ?? []),
      error: (err) => {
        console.warn('Falha ao carregar marcações iniciais', err);
        this._marcacoes.next([]);
      },
    });
  }

  /**
   * Registrar marcação.
   * Agora NÃO recebe mais data/hora do cliente (o servidor define o horário oficial).
   * Envie apenas usuario, tipo e (opcionais) lat/lng/accuracy/timeZone/agrupadorId.
   */
  marcarPonto(
    usuario: string,
    tipo: string,
    extras?: Partial<Pick<Marcacao, 'lat' | 'lng' | 'accuracyMeters' | 'timeZone' | 'agrupadorId'>>
  ) {
    const body: Partial<Marcacao> = {
      usuario,
      tipo,
      origem: this.isOnline ? 'online' : 'offline',
      ...(extras ?? {}),
    };

    if (this.isOnline) {
      // POST e usa a RESPOSTA do servidor para atualizar a lista
      this.http.post<Marcacao>(this.API_URL, body).subscribe({
        next: (salva) => {
          this._marcacoes.next([...this._marcacoes.value, salva]);
        },
        error: (err) => {
          console.error('Erro ao enviar. Salvando localmente.', err);
          // Marca como offline e persiste local
          body.origem = 'offline';
          this.salvarMarcacaoLocal(body as Marcacao);
          alert('Falha ao enviar. Marcação salva localmente.');
        },
      });
    } else {
      // Offline: salva local e reflete na UI
      this.salvarMarcacaoLocal(body as Marcacao);
      alert('Você está offline. Marcação salva localmente.');
    }
  }

  private salvarMarcacaoLocal(m: Marcacao) {
    const pendentes: Marcacao[] = JSON.parse(localStorage.getItem('marcacoes_pendentes') || '[]');
    pendentes.push(m);
    localStorage.setItem('marcacoes_pendentes', JSON.stringify(pendentes));
    // Reflete na UI imediatamente (sem horário oficial do servidor)
    this._marcacoes.next([...this._marcacoes.value, m]);
  }

  private syncMarcacoes() {
    this.isOnline = true;
    const pendentes: Marcacao[] = JSON.parse(localStorage.getItem('marcacoes_pendentes') || '[]');
    if (!pendentes.length) return;

    const restantes: Marcacao[] = [];

    pendentes.forEach((m) => {
      this.http.post<Marcacao>(this.API_URL, m).subscribe({
        next: (salva) => {
          // Usa a resposta do servidor para normalizar o registro
          this._marcacoes.next([...this._marcacoes.value, salva]);
        },
        error: (err) => {
          console.error('Falha ao sincronizar uma marcação', err);
          restantes.push(m);
        },
      });
    });

    if (restantes.length) {
      localStorage.setItem('marcacoes_pendentes', JSON.stringify(restantes));
    } else {
      localStorage.removeItem('marcacoes_pendentes');
      alert('Marcações pendentes sincronizadas.');
    }
  }

  buscarMarcacoes(): Observable<Marcacao[]> {
    return this.http.get<Marcacao[]>(this.API_URL);
  }
}
