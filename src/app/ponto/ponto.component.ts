import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MarcacaoService } from '../services/marcacao';
import { Observable } from 'rxjs';
import { Marcacao } from '../services/marcacao.model';
import { GeolocService } from '../services/geoloc.service';
import { DEFAULT_GEOFENCE_ID } from '../geofence.config';
import { ClockService } from '../services/clock.service';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
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
  private readonly CLOCK_TOLERANCE_MS = 2 * 60 * 1000;

  constructor(private marcacaoService: MarcacaoService,
    private geoloc: GeolocService,
    private clock: ClockService,
    private http: HttpClient) {}
  
  private async syncClockWithServer(): Promise<void> {
  try {
    const base = environment.apiUrl.replace(/\/+marcacoes\/?$/i, '');
    const t = await firstValueFrom(
      this.http.get<{ serverIso: string; serverEpochMs: number }>(
        `${base}/time`,
        { params: { t: Date.now().toString() } } 
      )
    );
    const delta = t.serverEpochMs - Date.now();
    this.clock.setDeltaForTest(delta);
    (window as any).clockDeltaLast = { server: t.serverIso, serverMs: t.serverEpochMs, delta };
    console.log('[clock] sync /time:', t.serverIso, 'delta(ms):', delta);
  } catch (e) {
    console.warn('Falha ao sincronizar com /time; mantendo delta atual.', e);
  }
}



  ngOnInit(): void {
    (window as any).clock = this.clock;
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
    
    let position: GeolocationPosition | null = null;
    try {
      position = await this.geoloc.getCurrentPosition(true, 12000);
    } catch (e1) {
      // fallback sem alta precisão
      try {
        position = await this.geoloc.getCurrentPosition(false, 8000);
      } catch (e2) {
        alert('Não foi possível obter sua localização. Verifique permissões de localização.');
        return;
      }
    }
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;
    const acc = position.coords.accuracy; 
    // 3) validar cerca circular
    const { ok, distance, gf } = this.geoloc.isInsideGeofence(lat, lng, this.agrupadorId);
    if (!ok) {
      const msg = gf
        ? `Você está fora da área permitida (${Math.round(distance)} m > ${gf.radiusMeters} m).`
        : 'Configuração de cerca não encontrada.';
      alert(msg);
      return; // bloqueia marcação
    }

    // 4) checar timezone esperado (só aviso no MVP)
    const deviceTz = this.geoloc.deviceTimeZone();
    const expectedTz = gf?.expectedTimeZone;
    if (expectedTz && deviceTz !== expectedTz) {
      // Para o MVP, apenas alertar; depois podemos bloquear se desejarem
      alert(`Atenção: seu fuso é ${deviceTz}, mas o esperado é ${expectedTz}.`);
      // (se quiser bloquear, descomente a linha abaixo)
      // return;
    }
    // 5) seguir com a marcação (mantendo sua lógica atual)
    this.marcacaoService.marcarPonto(this.usuario, tipo, {
      lat, lng, accuracyMeters: acc, timeZone: deviceTz, agrupadorId: this.agrupadorId
    }); // cast só porque o método original não aceita extras ainda
    if (this.totalCliques === 0) {
      this.entrada = horaAtual;
    }

    this.totalCliques++;
    //this.calcularHorasTrabalhadas();
    //this.calcularProgresso();
    this.carregarMarcacoes()
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
          const d = new Date(m.data); // ISO -> Date
          return d.toDateString() === hojeLocal.toDateString();
        })
        .sort((a, b) => {
          const da = new Date(a.data).getTime();
          const db = new Date(b.data).getTime();
          return db - da;
        });
    },
    error: (erro) => console.error('Erro ao buscar marcações:', erro)
  });
}
}
