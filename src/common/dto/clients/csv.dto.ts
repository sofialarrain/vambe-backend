import { IsString } from 'class-validator';

export class CsvRowDto {
  @IsString()
  Nombre: string;

  @IsString()
  'Correo Electronico': string;

  @IsString()
  'Numero de Telefono': string;

  @IsString()
  'Fecha de la Reunion': string;

  @IsString()
  'Vendedor asignado': string;

  @IsString()
  closed: string;

  @IsString()
  Transcripcion: string;
}

