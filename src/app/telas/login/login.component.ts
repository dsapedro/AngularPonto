import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  imports: [],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})

export class LoginComponent {
  constructor(private router: Router) {}

  entrar() {
    //Valida login/senha
    this.router.navigate(['/home']);
  }
}