import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, retry, timeout, throwError } from 'rxjs';
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
    this.buscarMarcacoes().subscribe({
      next: (data) => this._marcacoes.next(data ?? []),
      error: (err) => {
        console.warn('Falha ao carregar marcações iniciais', err);
        this._marcacoes.next([]);
      },
    });
  }

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
      this.http.post<Marcacao>(this.API_URL, body).subscribe({
        next: (salva) => this._marcacoes.next([...this._marcacoes.value, salva]),
        error: (err) => {
          console.error('Erro ao enviar. Salvando localmente.', err);
          body.origem = 'offline';
          this.salvarMarcacaoLocal(body as Marcacao);
          alert('Falha ao enviar. Marcação salva localmente.');
        },
      });
    } else {
      this.salvarMarcacaoLocal(body as Marcacao);
      alert('Você está offline. Marcação salva localmente.');
    }
  }

  private salvarMarcacaoLocal(m: Marcacao) {
    const pendentes: Marcacao[] = JSON.parse(localStorage.getItem('marcacoes_pendentes') || '[]');
    pendentes.push(m);
    localStorage.setItem('marcacoes_pendentes', JSON.stringify(pendentes));
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
    const headers = new HttpHeaders({ 'Cache-Control': 'no-store' });
    const params = new HttpParams().set('t', String(Date.now())); // cache-busting
    return this.http.get<Marcacao[]>(this.API_URL, { headers, params }).pipe(
      timeout(4000),
      retry(1),
      catchError(err => {
        console.error('GET /marcacoes falhou', err);
        return throwError(() => err);
      })
    );
  }
}
