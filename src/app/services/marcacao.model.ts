export interface Marcacao {
  usuario: string;
  data: string;
  hora: string;
  tipo: string;
  origem: 'online' | 'offline' | 'sincronizado';
  lat?: number;
  lng?: number;
  accuracyMeters?: number;
  timeZone?: string;
  agrupadorId?: string;
}
