import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MarcacaoService } from '../services/marcacao';
import { Observable } from 'rxjs';
import { Marcacao } from '../services/marcacao.model';

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
  marcacoes: { usuario: string, data:string, hora: string, tipo: string, origem: string } [] = [];
  private totalCliques: number = 0;
  marcacoes$!: Observable<Marcacao[]>;
  usuario: string = 'Henrique';

  constructor(private marcacaoService: MarcacaoService) {}

  ngOnInit(): void {
    this.marcacoes$ = this.marcacaoService.marcacoes$;
    this.calcularProgresso();
    this.calcularHorasTrabalhadas();
    this.carregarMarcacoes();

    setInterval(() => {
      this.calcularHorasTrabalhadas();
      this.calcularProgresso();
    }, 60000);
  }

  marcarPonto() {
    const dtAtual = new Date();
    const horaAtual = dtAtual.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const tipo = (this.totalCliques % 2 === 0) ? 'Entrada' : 'Saída';

    this.marcacaoService.marcarPonto(this.usuario, dtAtual.toDateString(), horaAtual, tipo);
    
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
    const dtAtual = new Date();
    this.marcacaoService.buscarMarcacoes().subscribe(
      (dados) => {
        this.marcacoes = dados.map(m => ({
          ...m,
        }))
        .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()).filter(m => m.usuario == this.usuario && m.data == dtAtual.toDateString());
      },
      (erro) => {
        console.error('Erro ao buscar marcações:', erro);
      }
    );
  }
}
