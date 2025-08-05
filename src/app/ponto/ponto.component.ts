import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-ponto',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  templateUrl: './ponto.component.html',
  styleUrls: ['./ponto.component.scss']
})

export class PontoComponent implements OnInit {
  entrada: string = '08:00';
  saidaPrevista: string = '17:00';
  progresso: number = 0;
  horasTrabalhadas: string = '0:00';
  marcacoes: { usuario: string, tipo: string, hora: string, periodo: number, origem: string } [] = [];
  private totalCliques: number = 0;
  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.carregarMarcacoes();
    this.calcularProgresso();
    this.calcularHorasTrabalhadas();

    setInterval(() => {
      this.calcularHorasTrabalhadas();
      this.calcularProgresso();
    }, 60000);
  }

  marcarPonto() {
    const agora = new Date();
    const horaAtual = agora.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const tipo = (this.totalCliques % 2 === 0) ? 'Entrada' : 'Saída';
    const periodo = Math.floor(this.totalCliques / 2) + 1;

    const marcacao = {
      usuario: 'Henrique',
      data: horaAtual,
      hora: horaAtual,
      tipo: tipo
    };

    const novaMarcacao = {
      usuario: 'Henrique',
      tipo: `${periodo}ª ${tipo}`,
      hora: horaAtual,
      periodo: periodo,
      origem: this.totalCliques % 2 === 0 ? 'Integrada' : 'Local'
    };
    
    this.http.post('https://apimock-oaip.onrender.com/marcacoes', marcacao).subscribe({
      next: () => {
        alert('Marcação registrada com sucesso!');
        this.carregarMarcacoes(); // Atualiza a lista após marcar
      },
      error: (error) => {
        console.error('Erro ao registrar marcação', error);
        alert('Erro ao registrar a marcação. Tente novamente.');
      }
    });

    this.marcacoes.push(novaMarcacao);

    if (this.totalCliques === 0) {
      this.entrada = horaAtual;
    }

    this.totalCliques++;
    this.calcularHorasTrabalhadas();
  }

  carregarMarcacoes() {
    this.http.get<any[]>('https://apimock-oaip.onrender.com/marcacoes').subscribe({
      next: (dados) => {
        this.marcacoes = dados.filter(a => a.usuario === 'Henrique');
      },
      error: (error) => {
        console.error('Erro ao carregar marcações', error);
      }
    });
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
}
