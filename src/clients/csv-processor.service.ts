import { Injectable, Logger } from '@nestjs/common';
import { parse } from 'csv-parse/sync';
import { CreateClientDto } from '../common/dto/client.dto';
import { CsvRowDto } from '../common/dto/clients';

@Injectable()
export class CsvProcessorService {
  private readonly logger = new Logger(CsvProcessorService.name);

  parseCsvContent(csvContent: string): CreateClientDto[] {
    try {
      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        bom: true,
      }) as CsvRowDto[];

      this.logger.log(`Parsed ${records.length} records from CSV`);

      return records.map((record) => this.mapCsvRowToDto(record));
    } catch (error) {
      this.logger.error('Error parsing CSV:', error);
      throw new Error(`Failed to parse CSV: ${error.message}`);
    }
  }

  private mapCsvRowToDto(row: CsvRowDto): CreateClientDto {
    return {
      name: row.Nombre,
      email: row['Correo Electronico'],
      phone: row['Numero de Telefono'],
      assignedSeller: row['Vendedor asignado'],
      meetingDate: this.parseMeetingDate(row['Fecha de la Reunion']),
      closed: row.closed === '1' || row.closed === 'true',
      transcription: row.Transcripcion,
    };
  }

  private parseMeetingDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toISOString();
  }
}

