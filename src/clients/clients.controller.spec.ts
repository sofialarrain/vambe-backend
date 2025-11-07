import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';
import { CsvProcessorService } from './csv-processor.service';
import { OverviewService } from '../analytics/overview/overview.service';
import { Client } from '@prisma/client';

describe('ClientsController', () => {
  let controller: ClientsController;
  let clientsService: jest.Mocked<ClientsService>;
  let csvProcessorService: jest.Mocked<CsvProcessorService>;
  let overviewService: jest.Mocked<OverviewService>;

  const mockClientsService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    createManyClients: jest.fn(),
    getUniqueValues: jest.fn(),
    deleteAll: jest.fn(),
  };

  const mockCsvProcessorService = {
    parseCsvContent: jest.fn(),
  };

  const mockOverviewService = {
    getOverview: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClientsController],
      providers: [
        {
          provide: ClientsService,
          useValue: mockClientsService,
        },
        {
          provide: CsvProcessorService,
          useValue: mockCsvProcessorService,
        },
        {
          provide: OverviewService,
          useValue: mockOverviewService,
        },
      ],
    }).compile();

    controller = module.get<ClientsController>(ClientsController);
    clientsService = module.get(ClientsService);
    csvProcessorService = module.get(CsvProcessorService);
    overviewService = module.get(OverviewService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadCsv', () => {
    it('should upload and process CSV file successfully', async () => {
      const mockFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'clients.csv',
        encoding: '7bit',
        mimetype: 'text/csv',
        buffer: Buffer.from('name,email,phone\nClient 1,client1@test.com,1234567890'),
        size: 100,
        destination: '',
        filename: '',
        path: '',
        stream: null as any,
      };

      const mockClients = [
        {
          name: 'Client 1',
          email: 'client1@test.com',
          phone: '1234567890',
          assignedSeller: 'Seller 1',
          meetingDate: '2024-01-01',
          closed: false,
          transcription: '',
        },
      ];

      const mockUpdatedMetrics = {
        totalClients: 101,
        totalClosed: 40,
        totalOpen: 61,
        conversionRate: 39.6,
        processedClients: 57,
        unprocessedClients: 44,
      };

      mockCsvProcessorService.parseCsvContent.mockReturnValue(mockClients);
      mockClientsService.createManyClients.mockResolvedValue({ count: 1 });
      mockOverviewService.getOverview.mockResolvedValue(mockUpdatedMetrics);

      const result = await controller.uploadCsv(mockFile);

      expect(result).toEqual({
        message: 'CSV uploaded and processed successfully',
        clientsCreated: 1,
        metrics: mockUpdatedMetrics,
      });
      expect(csvProcessorService.parseCsvContent).toHaveBeenCalledWith(mockFile.buffer.toString('utf-8'));
      expect(clientsService.createManyClients).toHaveBeenCalledWith(mockClients);
      expect(overviewService.getOverview).toHaveBeenCalledTimes(1);
    });

    it('should throw BadRequestException when no file is uploaded', async () => {
      const mockFile = undefined as any;

      await expect(controller.uploadCsv(mockFile)).rejects.toThrow(BadRequestException);
      await expect(controller.uploadCsv(mockFile)).rejects.toThrow('No file uploaded');
      expect(csvProcessorService.parseCsvContent).not.toHaveBeenCalled();
      expect(clientsService.createManyClients).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when file is not CSV', async () => {
      const mockFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'clients.txt',
        encoding: '7bit',
        mimetype: 'text/plain',
        buffer: Buffer.from('test content'),
        size: 100,
        destination: '',
        filename: '',
        path: '',
        stream: null as any,
      };

      await expect(controller.uploadCsv(mockFile)).rejects.toThrow(BadRequestException);
      await expect(controller.uploadCsv(mockFile)).rejects.toThrow('Only CSV files are allowed');
      expect(csvProcessorService.parseCsvContent).not.toHaveBeenCalled();
      expect(clientsService.createManyClients).not.toHaveBeenCalled();
    });
  });

  describe('getUniqueValues', () => {
    it('should return unique values successfully', async () => {
      const mockUniqueValues = {
        sellers: ['Seller 1', 'Seller 2'],
        industries: ['Technology', 'Finance'],
        sentiments: ['positive', 'neutral'],
        urgencyLevels: ['immediate', 'planned'],
      };

      mockClientsService.getUniqueValues.mockResolvedValue(mockUniqueValues);

      const result = await controller.getUniqueValues();

      expect(result).toEqual(mockUniqueValues);
      expect(clientsService.getUniqueValues).toHaveBeenCalledTimes(1);
      expect(clientsService.getUniqueValues).toHaveBeenCalledWith();
    });
  });

  describe('findAll', () => {
    it('should return all clients with default filters', async () => {
      const mockClients: Client[] = [
        {
          id: '1',
          name: 'Client 1',
          email: 'client1@test.com',
          phone: '1234567890',
          assignedSeller: 'Seller 1',
          meetingDate: new Date('2024-01-01'),
          closed: false,
          transcription: 'Test transcription',
          industry: null,
          operationSize: null,
          interactionVolume: null,
          discoverySource: null,
          mainMotivation: null,
          urgencyLevel: null,
          painPoints: [],
          technicalRequirements: [],
          sentiment: null,
          processed: false,
          processedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const mockResponse = {
        clients: mockClients,
        total: 1,
        page: 1,
        limit: 20,
      };

      mockClientsService.findAll.mockResolvedValue(mockResponse);

      const result = await controller.findAll({});

      expect(result).toEqual(mockResponse);
      expect(clientsService.findAll).toHaveBeenCalledTimes(1);
      expect(clientsService.findAll).toHaveBeenCalledWith({});
    });

    it('should return clients with filters applied', async () => {
      const filters = {
        seller: 'Seller 1',
        industry: 'Technology',
        closed: true,
        page: 1,
        limit: 10,
      };

      const mockResponse = {
        clients: [],
        total: 0,
        page: 1,
        limit: 10,
      };

      mockClientsService.findAll.mockResolvedValue(mockResponse);

      const result = await controller.findAll(filters);

      expect(result).toEqual(mockResponse);
      expect(clientsService.findAll).toHaveBeenCalledWith(filters);
    });
  });

  describe('findOne', () => {
    it('should return a single client by ID', async () => {
      const mockClient: Client = {
        id: 'client-1',
        name: 'Client 1',
        email: 'client1@test.com',
        phone: '1234567890',
        assignedSeller: 'Seller 1',
        meetingDate: new Date('2024-01-01'),
        closed: false,
        transcription: 'Test transcription',
        industry: 'Technology',
        operationSize: 'large',
        interactionVolume: 150,
        discoverySource: 'Website',
        mainMotivation: 'Efficiency',
        urgencyLevel: 'immediate',
        painPoints: ['High workload'],
        technicalRequirements: ['API integration'],
        sentiment: 'positive',
        processed: true,
        processedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockClientsService.findOne.mockResolvedValue(mockClient);

      const result = await controller.findOne('client-1');

      expect(result).toEqual(mockClient);
      expect(clientsService.findOne).toHaveBeenCalledWith('client-1');
    });
  });

  describe('deleteAll', () => {
    it('should delete all clients successfully', async () => {
      const mockResult = { count: 10 };
      mockClientsService.deleteAll.mockResolvedValue(mockResult);

      const result = await controller.deleteAll();

      expect(result).toEqual(mockResult);
      expect(clientsService.deleteAll).toHaveBeenCalledTimes(1);
      expect(clientsService.deleteAll).toHaveBeenCalledWith();
    });
  });
});

