import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MarcacaoService } from '../services/marcacao';
import { Observable, firstValueFrom } from 'rxjs';
import { Marcacao } from '../services/marcacao.model';
import { GeolocService } from '../services/geoloc.service';
import { DEFAULT_GEOFENCE_ID } from '../geofence.config';
import { ClockService } from '../services/clock.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-ponto',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ponto.component.html',
  styleUrls: ['./ponto.component.scss']
})
export class PontoComponent implements OnInit {
  entrada: string = '08:00';
  saidaPrevista: string = '17:00';
  progresso: number = 0;
  horasTrabalhadas: string = '0:00';
  marcacoes: Marcacao[] = [];
  private totalCliques: number = 0;
  marcacoes$!: Observable<Marcacao[]>;
  usuario: string = 'Henrique';
  agrupadorId = DEFAULT_GEOFENCE_ID;
  private readonly CLOCK_TOLERANCE_MS = 2 * 60 * 1000; // 2 min

  constructor(
    private marcacaoService: MarcacaoService,
    private geoloc: GeolocService,
    private clock: ClockService,
    private http: HttpClient
  ) {}

  /** Sincroniza relógio com /time usando ponto médio + mediana de 3 amostras */
  private async syncClockWithServer(): Promise<void> {
    const base = environment.apiUrl.replace(/\/+marcacoes\/?$/i, '');
    const url = `${base}/time`;

    const sampleOnce = async () => {
      const t0 = Date.now();
      const resp = await firstValueFrom(
        this.http.get<{ serverIso: string; serverEpochMs: number }>(url, {
          params: { t: String(t0) } // cache busting
        })
      );
      const t1 = Date.now();
      const server = resp.serverEpochMs;
      const midpoint = (t0 + t1) / 2; // compensa metade da latência
      return server - midpoint;       // delta estimado (ms)
    };

    try {
      const deltas: number[] = [];
      deltas.push(await sampleOnce());
      await new Promise(r => setTimeout(r, 150));
      deltas.push(await sampleOnce());
      await new Promise(r => setTimeout(r, 150));
      deltas.push(await sampleOnce());

      const median = (arr: number[]) => {
        const a = [...arr].sort((x, y) => x - y);
        return a[Math.floor(a.length / 2)];
      };
      const delta = median(deltas);

      this.clock.setDeltaForTest(delta);
      (window as any).clockDeltaLast = { deltas, chosen: delta };
      console.log('[clock] deltas(ms):', deltas, 'chosen:', delta);
    } catch (e) {
      console.warn('Falha ao sincronizar com /time; mantendo delta atual.', e);
      // Se preferir liberar quando falhar, troque a linha abaixo:
      // this.clock.setDeltaForTest(0);
    }
  }

  ngOnInit(): void {
    (window as any).clock = this.clock;

    // 1) Sync inicial (pequeno delay para evitar interferência de SW/caches)
    setTimeout(() => this.syncClockWithServer(), 250);

    // 2) Re-sync periódico (a cada 5 min)
    setInterval(() => this.syncClockWithServer(), 5 * 60 * 1000);

    // 3) Re-sync ao voltar online
    window.addEventListener('online', () => this.syncClockWithServer());

    // 4) Re-sync quando a aba voltar a ficar visível
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) this.syncClockWithServer();
    });

    // Restante da sua lógica de tela
    this.marcacoes$ = this.marcacaoService.marcacoes$;
    this.calcularProgresso();
    this.calcularHorasTrabalhadas();
    this.carregarMarcacoes();

    setInterval(() => {
      this.calcularHorasTrabalhadas();
      this.calcularProgresso();
    }, 60000);
  }

  async marcarPonto() {
    // Recalcula delta ANTES de validar/bloquear
    await this.syncClockWithServer();

    if (!this.clock.isWithin(this.CLOCK_TOLERANCE_MS)) {
      const delta = this.clock.deltaMs!;
      const deltaMin = Math.round(Math.abs(delta) / 60000);
      alert(`Relógio do dispositivo desvia ${deltaMin} min do servidor. Ajuste o relógio/fuso e tente novamente.`);
      return;
    }

    const dtAtual = new Date();
    const horaAtual = dtAtual.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const tipo = (this.totalCliques % 2 === 0) ? 'Entrada' : 'Saída';

    // Geolocalização
    let position: GeolocationPosition | null = null;
    try {
      position = await this.geoloc.getCurrentPosition(true, 12000);
    } catch {
      try {
        position = await this.geoloc.getCurrentPosition(false, 8000);
      } catch {
        alert('Não foi possível obter sua localização. Verifique permissões de localização.');
        return;
      }
    }
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;
    const acc = position.coords.accuracy;

    // Cercamento
    const { ok, distance, gf } = this.geoloc.isInsideGeofence(lat, lng, this.agrupadorId);
    if (!ok) {
      const msg = gf
        ? `Você está fora da área permitida (${Math.round(distance)} m > ${gf.radiusMeters} m).`
        : 'Configuração de cerca não encontrada.';
      alert(msg);
      return;
    }

    // Fuso (somente alerta no MVP)
    const deviceTz = this.geoloc.deviceTimeZone();
    const expectedTz = gf?.expectedTimeZone;
    if (expectedTz && deviceTz !== expectedTz) {
      alert(`Atenção: seu fuso é ${deviceTz}, mas o esperado é ${expectedTz}.`);
      // se quiser barrar, dê return aqui
    }

    // Registrar (servidor define a hora oficial)
    this.marcacaoService.marcarPonto(this.usuario, tipo, {
      lat, lng, accuracyMeters: acc, timeZone: deviceTz, agrupadorId: this.agrupadorId
    });

    if (this.totalCliques === 0) this.entrada = horaAtual;
    this.totalCliques++;
    this.carregarMarcacoes();
  }

  calcularProgresso(): void {
    const inicio = this.horaStringParaDate(this.entrada);
    const fim = this.horaStringParaDate(this.saidaPrevista);
    const agora = new Date();

    const total = fim.getTime() - inicio.getTime();
    const decorrido = agora.getTime() - inicio.getTime();

    let percentual = (decorrido / total) * 100;
    if (percentual < 0) percentual = 0;
    if (percentual > 100) percentual = 100;

    this.progresso = Math.round(percentual);
  }

  calcularHorasTrabalhadas(): void {
    const entrada = this.horaStringParaDate(this.entrada);
    const agora = new Date();

    let diffMs = agora.getTime() - entrada.getTime();
    if (diffMs < 0) diffMs = 0;

    const horas = Math.floor(diffMs / (1000 * 60 * 60));
    const minutos = Math.floor((diffMs / (1000 * 60)) % 60);

    this.horasTrabalhadas = `${horas}:${minutos.toString().padStart(2, '0')}`;
  }

  horaStringParaDate(hora: string): Date {
    const [h, m] = hora.split(':').map(Number);
    const agora = new Date();
    agora.setHours(h, m, 0, 0);
    return agora;
  }

  carregarMarcacoes(): void {
    const hojeLocal = new Date();

    this.marcacaoService.buscarMarcacoes().subscribe({
      next: (dados) => {
        this.marcacoes = (dados || [])
          .filter(m => {
            if (m.usuario !== this.usuario) return false;
            const d = new Date(m.data);
            return d.toDateString() === hojeLocal.toDateString();
          })
          .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
      },
      error: (erro) => console.error('Erro ao buscar marcações:', erro)
    });
  }
}
