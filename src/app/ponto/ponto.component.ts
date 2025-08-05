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
  marcacoes: any[] = [];

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.carregarMarcacoes();
  }

  marcarPonto() {
    const marcacao = {
      usuario: 'Pedro',
      data: new Date().toISOString(),
      tipo: 'entrada'
    };

    this.http.post('http://localhost:3000/marcacoes', marcacao).subscribe({
      next: () => {
        alert('Marcação registrada com sucesso!');
        this.carregarMarcacoes(); // Atualiza a lista após marcar
      },
      error: (error) => {
        console.error('Erro ao registrar marcação', error);
        alert('Erro ao registrar a marcação. Tente novamente.');
      }
    });
  }

  carregarMarcacoes() {
    this.http.get<any[]>('http://localhost:3000/marcacoes').subscribe({
      next: (dados) => {
        this.marcacoes = dados;
      },
      error: (error) => {
        console.error('Erro ao carregar marcações', error);
      }
    });
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
