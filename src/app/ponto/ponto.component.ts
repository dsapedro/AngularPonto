import { Component, OnInit } from '@angular/core';
import { PontoService } from '../ponto.service';
import { CommonModule, DatePipe } from '@angular/common';

interface Marcacao {
  dataHora: Date;
}

@Component({
  selector: 'app-ponto',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ponto.component.html',
  styleUrls: ['./ponto.component.scss']
})

export class PontoComponent {
  entrada: string = '08:00'; // ponto batido - a ser puxado do banco
  saidaPrevista: string = '17:00'; // horário final do expediente - a ser puxado do banco
  progresso: number = 0;
  horasTrabalhadas: string = '0:00';  
  marcacoes: { tipo: string, hora: string, periodo: number, origem: string } [] = [];
  private totalCliques: number = 0;

  ngOnInit(): void {
    this.calcularProgresso();
    this.calcularHorasTrabalhadas();

    // Atualiza a cada minuto
    setInterval(() => {
      this.calcularProgresso();
      this.calcularHorasTrabalhadas();
    }, 60000);
  }

  marcarPonto(): void {
    const agora = new Date();
    const horaAtual = agora.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const tipo = (this.totalCliques % 2 === 0) ? 'Entrada' : 'Saída';
    const periodo = Math.floor(this.totalCliques / 2) + 1;

    const novaMarcacao = {
      tipo: `${periodo}ª ${tipo}`,
      hora: horaAtual,
      periodo: periodo,
      origem: this.totalCliques % 2 === 0 ? 'Integrada' : 'Local'
    };
    
    this.marcacoes.push(novaMarcacao);
    this.salvarMarcacoes();
    
    if (this.totalCliques === 0) {
      this.entrada = horaAtual;
    }

    this.totalCliques++;
    this.calcularHorasTrabalhadas();
  }

  salvarMarcacoes(): void {
    localStorage.setItem('marcacoes', JSON.stringify(this.marcacoes));
  }

  calcularProgresso(): void {
    const inicio = this.horaStringParaDate('08:00');
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
