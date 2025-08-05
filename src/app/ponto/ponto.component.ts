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
  }
}
