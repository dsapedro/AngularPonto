import { Injectable } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpResponse } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { ClockService } from '../services/clock.service';

@Injectable()
export class ServerClockInterceptor implements HttpInterceptor {
  constructor(private clock: ClockService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const started = Date.now();

    return next.handle(req).pipe(
      tap(evt => {
        if (evt instanceof HttpResponse) {
          // Header pode vir como 'Date' ou 'date' dependendo do servidor/navegador
          const dateHeader = evt.headers.get('Date') ?? evt.headers.get('date');
          // Atualiza delta; (opcional) poderia compensar latência com (started + now)/2
          this.clock.setFromServerDateHeader(dateHeader);
        }
      })
    );
  }
}
