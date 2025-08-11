export interface AgrupadorGeofence {
  id: string;
  nome: string;
  center: { lat: number; lng: number };   // ponto central
  radiusMeters: number;                    // raio em metros
  expectedTimeZone: string;                // IANA tz, ex.: 'America/Sao_Paulo'
}

export const GEOFENCES: AgrupadorGeofence[] = [
  {
    id: 'empresa-matriz',
    nome: 'Matriz',
    center: { lat: -23.55052, lng: -46.63331 }, // AJUSTE: coordenadas do ponto autorizado
    radiusMeters: 250,                           // AJUSTE: raio permitido (m)
    expectedTimeZone: 'America/Sao_Paulo'
  },
  // pode adicionar outros agrupadores aqui
];

// escolha padrão (MVP): usar a Matriz
export const DEFAULT_GEOFENCE_ID = 'empresa-matriz';
