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
  marcacoes: Marcacao[] = [];

  constructor() {
    this.carregarMarcacoes();
  }

  marcarPonto(): void {
    const novaMarcacao = { dataHora: new Date() };
    this.marcacoes.unshift(novaMarcacao);
    this.salvarMarcacoes();
  }

  salvarMarcacoes(): void {
    localStorage.setItem('marcacoes', JSON.stringify(this.marcacoes));
  }

  carregarMarcacoes(): void {
    const dados = localStorage.getItem('marcacoes');
    if (dados) {
      const json = JSON.parse(dados);
      this.marcacoes = json.map((m: any) => ({
        dataHora: new Date(m.dataHora)
      }));
    }
  }
}
