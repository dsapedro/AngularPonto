export interface Marcacao {
  usuario: string;
  data: string;
  tipo: string;
  origem: 'online' | 'offline' | 'sincronizado';
}
