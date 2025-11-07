import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClientDto } from '../common/dto/client.dto';
import { Client } from '@prisma/client';
import { API_CONSTANTS } from '../common/constants';

describe('ClientsService', () => {
  let service: ClientsService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockPrismaService = {
    client: {
      create: jest.fn(),
      createMany: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
    analysisLog: {
      deleteMany: jest.fn(),
    },
    processingBatch: {
      deleteMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ClientsService>(ClientsService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createClient', () => {
    it('should create a client successfully', async () => {
      const createClientDto: CreateClientDto = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '123456789',
        assignedSeller: 'Seller 1',
        meetingDate: '2024-01-15T10:00:00Z',
        closed: false,
        transcription: 'Test transcription',
      };

      const expectedClient: Client = {
        id: '1',
        ...createClientDto,
        meetingDate: new Date(createClientDto.meetingDate),
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
      };

      mockPrismaService.client.create.mockResolvedValue(expectedClient);

      const result = await service.createClient(createClientDto);

      expect(result).toEqual(expectedClient);
      expect(mockPrismaService.client.create).toHaveBeenCalledWith({
        data: {
          name: createClientDto.name,
          email: createClientDto.email,
          phone: createClientDto.phone,
          assignedSeller: createClientDto.assignedSeller,
          meetingDate: new Date(createClientDto.meetingDate),
          closed: createClientDto.closed,
          transcription: createClientDto.transcription,
        },
      });
    });
  });

  describe('createManyClients', () => {
    it('should create multiple clients successfully', async () => {
      const clients: CreateClientDto[] = [
        {
          name: 'Client 1',
          email: 'client1@example.com',
          phone: '111',
          assignedSeller: 'Seller 1',
          meetingDate: '2024-01-15T10:00:00Z',
          closed: false,
          transcription: 'Transcription 1',
        },
        {
          name: 'Client 2',
          email: 'client2@example.com',
          phone: '222',
          assignedSeller: 'Seller 2',
          meetingDate: '2024-01-16T10:00:00Z',
          closed: true,
          transcription: 'Transcription 2',
        },
      ];

      const expectedResult = { count: 2 };
      mockPrismaService.client.createMany.mockResolvedValue(expectedResult);

      const result = await service.createManyClients(clients);

      expect(result).toEqual(expectedResult);
      expect(mockPrismaService.client.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            name: 'Client 1',
            email: 'client1@example.com',
          }),
          expect.objectContaining({
            name: 'Client 2',
            email: 'client2@example.com',
          }),
        ]),
        skipDuplicates: true,
      });
    });
  });

  describe('findAll', () => {
    it('should return clients with default pagination when no filters provided', async () => {
      const mockClients: Client[] = [
        {
          id: '1',
          name: 'Client 1',
          email: 'client1@example.com',
          phone: '111',
          assignedSeller: 'Seller 1',
          meetingDate: new Date('2024-01-15'),
          closed: false,
          transcription: 'Transcription 1',
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

      mockPrismaService.client.findMany.mockResolvedValue(mockClients);
      mockPrismaService.client.count.mockResolvedValue(1);

      const result = await service.findAll();

      expect(result.clients).toEqual(mockClients);
      expect(result.total).toBe(1);
      expect(result.page).toBe(API_CONSTANTS.PAGINATION.DEFAULT_PAGE);
      expect(result.limit).toBe(API_CONSTANTS.PAGINATION.DEFAULT_LIMIT);
      expect(mockPrismaService.client.findMany).toHaveBeenCalledWith({
        where: {},
        skip: 0,
        take: API_CONSTANTS.PAGINATION.DEFAULT_LIMIT,
        orderBy: { meetingDate: 'desc' },
      });
    });

    it('should apply pagination correctly', async () => {
      const filters = { page: 2, limit: 10 };
      mockPrismaService.client.findMany.mockResolvedValue([]);
      mockPrismaService.client.count.mockResolvedValue(25);

      const result = await service.findAll(filters);

      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
      expect(mockPrismaService.client.findMany).toHaveBeenCalledWith({
        where: {},
        skip: 10,
        take: 10,
        orderBy: { meetingDate: 'desc' },
      });
    });

    it('should filter by assignedSeller', async () => {
      const filters = { assignedSeller: 'Seller 1' };
      mockPrismaService.client.findMany.mockResolvedValue([]);
      mockPrismaService.client.count.mockResolvedValue(0);

      await service.findAll(filters);

      expect(mockPrismaService.client.findMany).toHaveBeenCalledWith({
        where: { assignedSeller: 'Seller 1' },
        skip: 0,
        take: API_CONSTANTS.PAGINATION.DEFAULT_LIMIT,
        orderBy: { meetingDate: 'desc' },
      });
    });

    it('should filter by industry', async () => {
      const filters = { industry: 'Technology' };
      mockPrismaService.client.findMany.mockResolvedValue([]);
      mockPrismaService.client.count.mockResolvedValue(0);

      await service.findAll(filters);

      expect(mockPrismaService.client.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { industry: 'Technology' },
        }),
      );
    });

    it('should filter by closed status', async () => {
      const filters = { closed: true };
      mockPrismaService.client.findMany.mockResolvedValue([]);
      mockPrismaService.client.count.mockResolvedValue(0);

      await service.findAll(filters);

      expect(mockPrismaService.client.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { closed: true },
        }),
      );
    });

    it('should filter by sentiment', async () => {
      const filters = { sentiment: 'positive' };
      mockPrismaService.client.findMany.mockResolvedValue([]);
      mockPrismaService.client.count.mockResolvedValue(0);

      await service.findAll(filters);

      expect(mockPrismaService.client.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { sentiment: 'positive' },
        }),
      );
    });

    it('should filter by discoverySource', async () => {
      const filters = { discoverySource: 'LinkedIn' };
      mockPrismaService.client.findMany.mockResolvedValue([]);
      mockPrismaService.client.count.mockResolvedValue(0);

      await service.findAll(filters);

      expect(mockPrismaService.client.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { discoverySource: 'LinkedIn' },
        }),
      );
    });

    it('should search across name, email, and transcription', async () => {
      const filters = { search: 'test' };
      mockPrismaService.client.findMany.mockResolvedValue([]);
      mockPrismaService.client.count.mockResolvedValue(0);

      await service.findAll(filters);

      expect(mockPrismaService.client.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { name: { contains: 'test', mode: 'insensitive' } },
              { email: { contains: 'test', mode: 'insensitive' } },
              { transcription: { contains: 'test', mode: 'insensitive' } },
            ],
          },
        }),
      );
    });

    it('should apply multiple filters simultaneously', async () => {
      const filters = {
        assignedSeller: 'Seller 1',
        industry: 'Technology',
        closed: true,
        page: 1,
        limit: 5,
      };
      mockPrismaService.client.findMany.mockResolvedValue([]);
      mockPrismaService.client.count.mockResolvedValue(0);

      await service.findAll(filters);

      expect(mockPrismaService.client.findMany).toHaveBeenCalledWith({
        where: {
          assignedSeller: 'Seller 1',
          industry: 'Technology',
          closed: true,
        },
        skip: 0,
        take: 5,
        orderBy: { meetingDate: 'desc' },
      });
    });
  });

  describe('findOne', () => {
    it('should return a client when found', async () => {
      const clientId = '1';
      const mockClient: Client = {
        id: clientId,
        name: 'John Doe',
        email: 'john@example.com',
        phone: '123456789',
        assignedSeller: 'Seller 1',
        meetingDate: new Date('2024-01-15'),
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
      };

      mockPrismaService.client.findUnique.mockResolvedValue(mockClient);

      const result = await service.findOne(clientId);

      expect(result).toEqual(mockClient);
      expect(mockPrismaService.client.findUnique).toHaveBeenCalledWith({
        where: { id: clientId },
      });
    });

    it('should throw NotFoundException when client not found', async () => {
      const clientId = 'non-existent';
      mockPrismaService.client.findUnique.mockResolvedValue(null);

      await expect(service.findOne(clientId)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(clientId)).rejects.toThrow(
        `Client with ID ${clientId} not found`,
      );
    });
  });

  describe('updateClient', () => {
    it('should update a client successfully', async () => {
      const clientId = '1';
      const updateData = { closed: true };
      const updatedClient: Client = {
        id: clientId,
        name: 'John Doe',
        email: 'john@example.com',
        phone: '123456789',
        assignedSeller: 'Seller 1',
        meetingDate: new Date('2024-01-15'),
        closed: true,
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
      };

      mockPrismaService.client.update.mockResolvedValue(updatedClient);

      const result = await service.updateClient(clientId, updateData);

      expect(result).toEqual(updatedClient);
      expect(mockPrismaService.client.update).toHaveBeenCalledWith({
        where: { id: clientId },
        data: updateData,
      });
    });
  });

  describe('deleteAll', () => {
    it('should clear all tables successfully', async () => {
      const mockAnalysisLogsResult = { count: 10 };
      const mockProcessingBatchesResult = { count: 5 };
      const mockClientsResult = { count: 100 };

      mockPrismaService.analysisLog.deleteMany.mockResolvedValue(
        mockAnalysisLogsResult,
      );
      mockPrismaService.processingBatch.deleteMany.mockResolvedValue(
        mockProcessingBatchesResult,
      );
      mockPrismaService.client.deleteMany.mockResolvedValue(mockClientsResult);

      const result = await service.deleteAll();

      expect(result).toEqual({
        clients: 100,
        processingBatches: 5,
        analysisLogs: 10,
        total: 115,
      });
      expect(mockPrismaService.analysisLog.deleteMany).toHaveBeenCalledWith({});
      expect(
        mockPrismaService.processingBatch.deleteMany,
      ).toHaveBeenCalledWith({});
      expect(mockPrismaService.client.deleteMany).toHaveBeenCalledWith({});
    });

    it('should return zeros when all tables are already empty', async () => {
      const mockAnalysisLogsResult = { count: 0 };
      const mockProcessingBatchesResult = { count: 0 };
      const mockClientsResult = { count: 0 };

      mockPrismaService.analysisLog.deleteMany.mockResolvedValue(
        mockAnalysisLogsResult,
      );
      mockPrismaService.processingBatch.deleteMany.mockResolvedValue(
        mockProcessingBatchesResult,
      );
      mockPrismaService.client.deleteMany.mockResolvedValue(mockClientsResult);

      const result = await service.deleteAll();

      expect(result).toEqual({
        clients: 0,
        processingBatches: 0,
        analysisLogs: 0,
        total: 0,
      });
    });
  });

  describe('getUnprocessedClients', () => {
    it('should return unprocessed clients', async () => {
      const mockClients: Client[] = [
        {
          id: '1',
          name: 'Client 1',
          email: 'client1@example.com',
          phone: '111',
          assignedSeller: 'Seller 1',
          meetingDate: new Date('2024-01-15'),
          closed: false,
          transcription: 'Transcription 1',
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

      mockPrismaService.client.findMany.mockResolvedValue(mockClients);

      const result = await service.getUnprocessedClients();

      expect(result).toEqual(mockClients);
      expect(mockPrismaService.client.findMany).toHaveBeenCalledWith({
        where: { processed: false },
      });
    });
  });

  describe('markAsProcessed', () => {
    it('should mark client as processed with categorized data', async () => {
      const clientId = '1';
      const categorizedData = {
        industry: 'Technology',
        sentiment: 'positive',
        operationSize: 'large',
      };
      const updatedClient: Client = {
        id: clientId,
        name: 'John Doe',
        email: 'john@example.com',
        phone: '123456789',
        assignedSeller: 'Seller 1',
        meetingDate: new Date('2024-01-15'),
        closed: false,
        transcription: 'Test transcription',
        industry: 'Technology',
        operationSize: 'large',
        interactionVolume: null,
        discoverySource: null,
        mainMotivation: null,
        urgencyLevel: null,
        painPoints: [],
        technicalRequirements: [],
        sentiment: 'positive',
        processed: true,
        processedAt: expect.any(Date),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.client.update.mockResolvedValue(updatedClient);

      const result = await service.markAsProcessed(clientId, categorizedData);

      expect(result).toEqual(updatedClient);
      expect(mockPrismaService.client.update).toHaveBeenCalledWith({
        where: { id: clientId },
        data: {
          ...categorizedData,
          processed: true,
          processedAt: expect.any(Date),
        },
      });
    });
  });

  describe('getUniqueValues', () => {
    it('should return unique values for all metadata fields', async () => {
      const mockClients = [
        {
          assignedSeller: 'Seller 1',
          industry: 'Technology',
          sentiment: 'positive',
          discoverySource: 'LinkedIn',
        },
        {
          assignedSeller: 'Seller 2',
          industry: 'Finance',
          sentiment: 'neutral',
          discoverySource: 'Google',
        },
        {
          assignedSeller: 'Seller 1',
          industry: 'Technology',
          sentiment: 'positive',
          discoverySource: 'LinkedIn',
        },
        {
          assignedSeller: 'Seller 3',
          industry: null,
          sentiment: null,
          discoverySource: null,
        },
      ];

      mockPrismaService.client.findMany.mockResolvedValue(mockClients as any);

      const result = await service.getUniqueValues();

      expect(result.sellers).toEqual(['Seller 1', 'Seller 2', 'Seller 3']);
      expect(result.industries).toEqual(['Finance', 'Technology']);
      expect(result.sentiments).toEqual(['neutral', 'positive']);
      expect(result.discoverySources).toEqual(['Google', 'LinkedIn']);
    });

    it('should return empty arrays when no clients exist', async () => {
      mockPrismaService.client.findMany.mockResolvedValue([]);

      const result = await service.getUniqueValues();

      expect(result.sellers).toEqual([]);
      expect(result.industries).toEqual([]);
      expect(result.sentiments).toEqual([]);
      expect(result.discoverySources).toEqual([]);
    });
  });
});

