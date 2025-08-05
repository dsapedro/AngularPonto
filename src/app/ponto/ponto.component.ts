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
  marcacoes$!: Observable<Marcacao[]>;

  constructor(private marcacaoService: MarcacaoService) {}

  ngOnInit(): void {
    this.marcacoes$ = this.marcacaoService.marcacoes$;
  }

  marcarPonto() {
    this.marcacaoService.marcarPonto();
  }
}
