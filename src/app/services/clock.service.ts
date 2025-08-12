import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

const LS_KEY = 'server_clock_delta_ms';

@Injectable({ providedIn: 'root' })
export class ClockService {
  private _deltaMs$ = new BehaviorSubject<number | null>(this.loadDelta());
  readonly deltaMs$ = this._deltaMs$.asObservable();

  get deltaMs(): number | null { return this._deltaMs$.value; }

  /** Atualiza delta a partir de uma string de data do servidor (RFC1123, ex: 'Tue, 08 Aug 2025 15:42:10 GMT') */
  setFromServerDateHeader(dateHeader: string | null): void {
    if (!dateHeader) return;
    const server = new Date(dateHeader);
    if (isNaN(server.getTime())) return;
    const deviceNow = new Date();
    const delta = server.getTime() - deviceNow.getTime();
    this._deltaMs$.next(delta);
    try { localStorage.setItem(LS_KEY, String(delta)); } catch {}
  }
  setDeltaForTest(ms: number) {
    this._deltaMs$.next(ms);
    try { localStorage.setItem('server_clock_delta_ms', String(ms)); } catch {}
  }

  isWithin(msTolerance: number): boolean {
    const d = this.deltaMs;
    if (d === null || d === undefined) return true; // sem referência -> não bloquear
    return Math.abs(d) <= msTolerance;
  }

  private loadDelta(): number | null {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw === null) return null;
      const n = Number(raw);
      return Number.isFinite(n) ? n : null;
    } catch { return null; }
  }
}
