import { Injectable } from '@angular/core';
import { GEOFENCES, DEFAULT_GEOFENCE_ID } from '../geofence.config';

@Injectable({ providedIn: 'root' })
export class GeolocService {
  getCurrentPosition(highAccuracy = true, timeoutMs = 10000): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!('geolocation' in navigator)) {
        return reject(new Error('Geolocalização não suportada neste dispositivo/navegador.'));
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: highAccuracy,
        maximumAge: 0,
        timeout: timeoutMs,
      });
    });
  }

  /** Distância em metros entre dois pontos (Haversine) */
  distanceMeters(a: {lat:number;lng:number}, b: {lat:number;lng:number}): number {
    const R = 6371000; // raio da Terra em metros
    const toRad = (x: number) => (x * Math.PI) / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);

    const sinDlat = Math.sin(dLat / 2);
    const sinDlng = Math.sin(dLng / 2);
    const h = sinDlat * sinDlat + Math.cos(lat1) * Math.cos(lat2) * sinDlng * sinDlng;
    const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
    return R * c;
  }

  /** Verifica se (lat,lng) está dentro do raio do agrupador */
  isInsideGeofence(lat: number, lng: number, agrupadorId = DEFAULT_GEOFENCE_ID) {
    const gf = GEOFENCES.find(g => g.id === agrupadorId);
    if (!gf) return { ok: false, distance: Infinity, gf: null };
    const distance = this.distanceMeters({lat, lng}, gf.center);
    return { ok: distance <= gf.radiusMeters, distance, gf };
  }

  /** Timezone IANA do dispositivo (do SO/navegador) */
  deviceTimeZone(): string {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC';
    } catch {
      return 'UTC';
    }
  }
}
