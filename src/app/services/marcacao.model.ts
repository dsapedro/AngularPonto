export interface Marcacao {
  usuario: string;
  data: string;
  hora: string;
  tipo: string;
  origem: 'online' | 'offline' | 'sincronizado';
}
