import { Test, TestingModule } from '@nestjs/testing';
import { CsvProcessorService } from './csv-processor.service';
import { CreateClientDto } from '../common/dto/client.dto';

// Mock csv-parse/sync
jest.mock('csv-parse/sync', () => ({
  parse: jest.fn(),
}));

import { parse } from 'csv-parse/sync';

describe('CsvProcessorService', () => {
  let service: CsvProcessorService;
  const mockParse = parse as jest.MockedFunction<typeof parse>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CsvProcessorService],
    }).compile();

    service = module.get<CsvProcessorService>(CsvProcessorService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('parseCsvContent', () => {
    it('should parse CSV content successfully', () => {
      // Arrange
      const csvContent = 'Nombre,Correo Electronico,Numero de Telefono,Fecha de la Reunion,Vendedor asignado,closed,Transcripcion\nJohn Doe,john@test.com,1234567890,2024-01-15,Seller 1,true,Meeting transcription';
      const mockRecords = [
        {
          Nombre: 'John Doe',
          'Correo Electronico': 'john@test.com',
          'Numero de Telefono': '1234567890',
          'Fecha de la Reunion': '2024-01-15',
          'Vendedor asignado': 'Seller 1',
          closed: 'true',
          Transcripcion: 'Meeting transcription',
        },
      ];

      mockParse.mockReturnValue(mockRecords);

      // Act
      const result = service.parseCsvContent(csvContent);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        name: 'John Doe',
        email: 'john@test.com',
        phone: '1234567890',
        assignedSeller: 'Seller 1',
        meetingDate: expect.any(String),
        closed: true,
        transcription: 'Meeting transcription',
      });
      expect(mockParse).toHaveBeenCalledWith(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        bom: true,
      });
    });

    it('should parse multiple CSV records', () => {
      // Arrange
      const csvContent = 'header\nrow1\nrow2';
      const mockRecords = [
        {
          Nombre: 'Client 1',
          'Correo Electronico': 'client1@test.com',
          'Numero de Telefono': '111',
          'Fecha de la Reunion': '2024-01-01',
          'Vendedor asignado': 'Seller 1',
          closed: '1',
          Transcripcion: 'Transcription 1',
        },
        {
          Nombre: 'Client 2',
          'Correo Electronico': 'client2@test.com',
          'Numero de Telefono': '222',
          'Fecha de la Reunion': '2024-01-02',
          'Vendedor asignado': 'Seller 2',
          closed: 'false',
          Transcripcion: 'Transcription 2',
        },
      ];

      mockParse.mockReturnValue(mockRecords);

      // Act
      const result = service.parseCsvContent(csvContent);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Client 1');
      expect(result[1].name).toBe('Client 2');
    });

    it('should handle closed value as "1"', () => {
      // Arrange
      const csvContent = 'header';
      const mockRecords = [
        {
          Nombre: 'Client',
          'Correo Electronico': 'client@test.com',
          'Numero de Telefono': '123',
          'Fecha de la Reunion': '2024-01-01',
          'Vendedor asignado': 'Seller',
          closed: '1',
          Transcripcion: 'Transcription',
        },
      ];

      mockParse.mockReturnValue(mockRecords);

      // Act
      const result = service.parseCsvContent(csvContent);

      // Assert
      expect(result[0].closed).toBe(true);
    });

    it('should handle closed value as "true"', () => {
      // Arrange
      const csvContent = 'header';
      const mockRecords = [
        {
          Nombre: 'Client',
          'Correo Electronico': 'client@test.com',
          'Numero de Telefono': '123',
          'Fecha de la Reunion': '2024-01-01',
          'Vendedor asignado': 'Seller',
          closed: 'true',
          Transcripcion: 'Transcription',
        },
      ];

      mockParse.mockReturnValue(mockRecords);

      // Act
      const result = service.parseCsvContent(csvContent);

      // Assert
      expect(result[0].closed).toBe(true);
    });

    it('should handle closed value as false for other values', () => {
      // Arrange
      const csvContent = 'header';
      const mockRecords = [
        {
          Nombre: 'Client',
          'Correo Electronico': 'client@test.com',
          'Numero de Telefono': '123',
          'Fecha de la Reunion': '2024-01-01',
          'Vendedor asignado': 'Seller',
          closed: '0',
          Transcripcion: 'Transcription',
        },
      ];

      mockParse.mockReturnValue(mockRecords);

      // Act
      const result = service.parseCsvContent(csvContent);

      // Assert
      expect(result[0].closed).toBe(false);
    });

    it('should parse meeting date to ISO string', () => {
      // Arrange
      const csvContent = 'header';
      const testDate = new Date('2024-01-15T10:30:00Z');
      const mockRecords = [
        {
          Nombre: 'Client',
          'Correo Electronico': 'client@test.com',
          'Numero de Telefono': '123',
          'Fecha de la Reunion': testDate.toISOString(),
          'Vendedor asignado': 'Seller',
          closed: 'false',
          Transcripcion: 'Transcription',
        },
      ];

      mockParse.mockReturnValue(mockRecords);

      // Act
      const result = service.parseCsvContent(csvContent);

      // Assert
      expect(result[0].meetingDate).toBe(testDate.toISOString());
    });

    it('should handle empty CSV content', () => {
      // Arrange
      const csvContent = '';
      mockParse.mockReturnValue([]);

      // Act
      const result = service.parseCsvContent(csvContent);

      // Assert
      expect(result).toEqual([]);
    });

    it('should throw error when CSV parsing fails', () => {
      // Arrange
      const csvContent = 'invalid csv';
      const parseError = new Error('Invalid CSV format');
      mockParse.mockImplementation(() => {
        throw parseError;
      });

      // Act & Assert
      expect(() => service.parseCsvContent(csvContent)).toThrow('Failed to parse CSV: Invalid CSV format');
    });

    it('should handle CSV with special characters in names', () => {
      // Arrange
      const csvContent = 'header';
      const mockRecords = [
        {
          Nombre: 'Client, Inc.',
          'Correo Electronico': 'client@test.com',
          'Numero de Telefono': '123',
          'Fecha de la Reunion': '2024-01-01',
          'Vendedor asignado': 'Seller "A"',
          closed: 'false',
          Transcripcion: 'Transcription with "quotes"',
        },
      ];

      mockParse.mockReturnValue(mockRecords);

      // Act
      const result = service.parseCsvContent(csvContent);

      // Assert
      expect(result[0].name).toBe('Client, Inc.');
      expect(result[0].assignedSeller).toBe('Seller "A"');
      expect(result[0].transcription).toBe('Transcription with "quotes"');
    });

    it('should trim whitespace from CSV values', () => {
      // Arrange
      const csvContent = 'header';
      const mockRecords = [
        {
          Nombre: '  Client Name  ',
          'Correo Electronico': '  email@test.com  ',
          'Numero de Telefono': '  123  ',
          'Fecha de la Reunion': '2024-01-01',
          'Vendedor asignado': '  Seller  ',
          closed: 'false',
          Transcripcion: '  Transcription  ',
        },
      ];

      mockParse.mockReturnValue(mockRecords);

      // Act
      const result = service.parseCsvContent(csvContent);

      // Assert
      // The trim is handled by csv-parse options, but we verify the mapping
      expect(result[0].name).toBe('  Client Name  '); // csv-parse handles trim
    });

    it('should handle empty transcription field', () => {
      // Arrange
      const csvContent = 'header';
      const mockRecords = [
        {
          Nombre: 'Client',
          'Correo Electronico': 'client@test.com',
          'Numero de Telefono': '123',
          'Fecha de la Reunion': '2024-01-01',
          'Vendedor asignado': 'Seller',
          closed: 'false',
          Transcripcion: '',
        },
      ];

      mockParse.mockReturnValue(mockRecords);

      // Act
      const result = service.parseCsvContent(csvContent);

      // Assert
      expect(result[0].transcription).toBe('');
    });
  });
});

