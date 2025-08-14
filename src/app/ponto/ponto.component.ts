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
import { OrigemMarcacao } from '../enums/origem-marcacao.enum';

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
  OrigemMarcacao = OrigemMarcacao

  // tolerância de 2 minutos
  private readonly CLOCK_TOLERANCE_MS = 2 * 60 * 1000;

  // guarda pra evitar múltiplos syncs simultâneos
  private syncing = false;

  constructor(
    private marcacaoService: MarcacaoService,
    private geoloc: GeolocService,
    private clock: ClockService,
    private http: HttpClient
  ) {}

  private sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

  /** Medida ultrarrápida (1 requisição) do delta. Atualiza o ClockService. */
  private async fastEstimateDelta(): Promise<number> {
    const base = environment.apiUrl.replace(/\/+marcacoes\/?$/i, '');
    const url = `${base}/time`;

    const t0 = Date.now();
    const resp = await firstValueFrom(
      this.http.get<{ serverIso: string; serverEpochMs: number }>(url, {
        params: { t: String(t0) } // cache-busting
      })
    );
    const t1 = Date.now();
    const midpoint = (t0 + t1) / 2;
    const delta = resp.serverEpochMs - midpoint;
    this.clock.setDeltaForTest(delta);
    (window as any).clockDeltaLast = { deltas: [delta], chosen: delta, mode: 'fast' };
    return delta;
  }

  /** Medida “estável”: 3 amostras + mediana. Atualiza o ClockService. */
  private async syncClockWithServer(): Promise<number> {
    const base = environment.apiUrl.replace(/\/+marcacoes\/?$/i, '');
    const url = `${base}/time`;

    const sampleOnce = async () => {
      const t0 = Date.now();
      const resp = await firstValueFrom(
        this.http.get<{ serverIso: string; serverEpochMs: number }>(url, {
          params: { t: String(t0) }
        })
      );
      const t1 = Date.now();
      const midpoint = (t0 + t1) / 2;
      return resp.serverEpochMs - midpoint;
    };

    const median = (arr: number[]) => {
      const a = [...arr].sort((x, y) => x - y);
      return a[Math.floor(a.length / 2)];
    };

    try {
      const deltas: number[] = [];
      deltas.push(await sampleOnce());
      await this.sleep(150);
      deltas.push(await sampleOnce());
      await this.sleep(150);
      deltas.push(await sampleOnce());

      const delta = median(deltas);
      this.clock.setDeltaForTest(delta);
      (window as any).clockDeltaLast = { deltas, chosen: delta, mode: 'stable' };
      console.log('[clock] deltas(ms):', deltas, 'chosen:', delta);
      return delta;
    } catch (e) {
      console.warn('Falha ao sincronizar com /time; mantendo delta atual.', e);
      return this.clock.deltaMs ?? 0;
    }
  }

  /**
   * Estabiliza por até maxWaitMs, mas com guarda anti-concorrência.
   * Retorna assim que a variação entre medições cair < jitterMs.
   */
  private async stabilizeDelta(maxWaitMs = 1500, jitterMs = 800): Promise<number> {
    if (this.syncing) return this.clock.deltaMs ?? 0;
    this.syncing = true;
    try {
      const start = performance.now();
      let last = await this.syncClockWithServer();

      while (performance.now() - start < maxWaitMs) {
        await this.sleep(250);
        const cur = await this.syncClockWithServer();
        if (Math.abs(cur - last) < jitterMs) return cur;
        last = cur;
      }
      return last;
    } finally {
      this.syncing = false;
    }
  }

  ngOnInit(): void {
    (window as any).clock = this.clock;

    // Sync inicial rápido (evita delay de cold start)
    setTimeout(() => this.fastEstimateDelta().catch(() => {}), 250);

    // Re-sync ao voltar online e ao focar a aba
    window.addEventListener('online', () => this.fastEstimateDelta().catch(() => {}));
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) this.fastEstimateDelta().catch(() => {});
    });

    // UI
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
    // 1) Medida rápida
    const estimate = await this.fastEstimateDelta().catch(() => this.clock.deltaMs ?? 0);

    // 2) Se parecer ruim, estabiliza curtinho (1.5s máx)
    if (Math.abs(estimate) > this.CLOCK_TOLERANCE_MS / 2) {
      await this.stabilizeDelta(1500, 800);
    }

    // 3) Valida
    if (!this.clock.isWithin(this.CLOCK_TOLERANCE_MS)) {
      const delta = this.clock.deltaMs!;
      const deltaMin = Math.round(Math.abs(delta) / 60000);
      alert(`Relógio do dispositivo desvia ${deltaMin} min do servidor. Ajuste o relógio/fuso e tente novamente.`);
      return;
    }

    // Hora local só pra UI (servidor define a hora oficial)
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

    // Fuso (apenas alerta no MVP)
    const deviceTz = this.geoloc.deviceTimeZone();
    const expectedTz = gf?.expectedTimeZone;
    if (expectedTz && deviceTz !== expectedTz) {
      alert(`Atenção: seu fuso é ${deviceTz}, mas o esperado é ${expectedTz}.`);
    }

    // Registrar (servidor define horário)
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
