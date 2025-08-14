import { OrigemMarcacao } from '../enums/origem-marcacao.enum';

export interface Marcacao {
  usuario: string;
  data: string; // ISO retornado pela API (ex.: 2025-08-13T12:34:56.000Z)
  tipo: string;
  origem: OrigemMarcacao;
  // novos/optativos vindos do cliente
  lat?: number;
  lng?: number;
  accuracyMeters?: number;
  timeZone?: string;
  agrupadorId?: string;
  // legado (pode não vir mais)
  hora?: string;
}
