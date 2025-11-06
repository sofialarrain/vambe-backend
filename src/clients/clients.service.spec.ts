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
      // Arrange
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

      // Act
      const result = await service.createClient(createClientDto);

      // Assert
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
      // Arrange
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

      // Act
      const result = await service.createManyClients(clients);

      // Assert
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
      // Arrange
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

      // Act
      const result = await service.findAll();

      // Assert
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
      // Arrange
      const filters = { page: 2, limit: 10 };
      mockPrismaService.client.findMany.mockResolvedValue([]);
      mockPrismaService.client.count.mockResolvedValue(25);

      // Act
      const result = await service.findAll(filters);

      // Assert
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
      // Arrange
      const filters = { assignedSeller: 'Seller 1' };
      mockPrismaService.client.findMany.mockResolvedValue([]);
      mockPrismaService.client.count.mockResolvedValue(0);

      // Act
      await service.findAll(filters);

      // Assert
      expect(mockPrismaService.client.findMany).toHaveBeenCalledWith({
        where: { assignedSeller: 'Seller 1' },
        skip: 0,
        take: API_CONSTANTS.PAGINATION.DEFAULT_LIMIT,
        orderBy: { meetingDate: 'desc' },
      });
    });

    it('should filter by industry', async () => {
      // Arrange
      const filters = { industry: 'Technology' };
      mockPrismaService.client.findMany.mockResolvedValue([]);
      mockPrismaService.client.count.mockResolvedValue(0);

      // Act
      await service.findAll(filters);

      // Assert
      expect(mockPrismaService.client.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { industry: 'Technology' },
        }),
      );
    });

    it('should filter by closed status', async () => {
      // Arrange
      const filters = { closed: true };
      mockPrismaService.client.findMany.mockResolvedValue([]);
      mockPrismaService.client.count.mockResolvedValue(0);

      // Act
      await service.findAll(filters);

      // Assert
      expect(mockPrismaService.client.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { closed: true },
        }),
      );
    });

    it('should filter by sentiment', async () => {
      // Arrange
      const filters = { sentiment: 'positive' };
      mockPrismaService.client.findMany.mockResolvedValue([]);
      mockPrismaService.client.count.mockResolvedValue(0);

      // Act
      await service.findAll(filters);

      // Assert
      expect(mockPrismaService.client.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { sentiment: 'positive' },
        }),
      );
    });

    it('should filter by discoverySource', async () => {
      // Arrange
      const filters = { discoverySource: 'LinkedIn' };
      mockPrismaService.client.findMany.mockResolvedValue([]);
      mockPrismaService.client.count.mockResolvedValue(0);

      // Act
      await service.findAll(filters);

      // Assert
      expect(mockPrismaService.client.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { discoverySource: 'LinkedIn' },
        }),
      );
    });

    it('should search across name, email, and transcription', async () => {
      // Arrange
      const filters = { search: 'test' };
      mockPrismaService.client.findMany.mockResolvedValue([]);
      mockPrismaService.client.count.mockResolvedValue(0);

      // Act
      await service.findAll(filters);

      // Assert
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
      // Arrange
      const filters = {
        assignedSeller: 'Seller 1',
        industry: 'Technology',
        closed: true,
        page: 1,
        limit: 5,
      };
      mockPrismaService.client.findMany.mockResolvedValue([]);
      mockPrismaService.client.count.mockResolvedValue(0);

      // Act
      await service.findAll(filters);

      // Assert
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
      // Arrange
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

      // Act
      const result = await service.findOne(clientId);

      // Assert
      expect(result).toEqual(mockClient);
      expect(mockPrismaService.client.findUnique).toHaveBeenCalledWith({
        where: { id: clientId },
      });
    });

    it('should throw NotFoundException when client not found', async () => {
      // Arrange
      const clientId = 'non-existent';
      mockPrismaService.client.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne(clientId)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(clientId)).rejects.toThrow(
        `Client with ID ${clientId} not found`,
      );
    });
  });

  describe('updateClient', () => {
    it('should update a client successfully', async () => {
      // Arrange
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

      // Act
      const result = await service.updateClient(clientId, updateData);

      // Assert
      expect(result).toEqual(updatedClient);
      expect(mockPrismaService.client.update).toHaveBeenCalledWith({
        where: { id: clientId },
        data: updateData,
      });
    });
  });

  describe('deleteAll', () => {
    it('should delete all clients successfully', async () => {
      // Arrange
      const expectedResult = { count: 5 };
      mockPrismaService.client.deleteMany.mockResolvedValue(expectedResult);

      // Act
      const result = await service.deleteAll();

      // Assert
      expect(result).toEqual(expectedResult);
      expect(mockPrismaService.client.deleteMany).toHaveBeenCalledWith({});
    });
  });

  describe('getUnprocessedClients', () => {
    it('should return unprocessed clients', async () => {
      // Arrange
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

      // Act
      const result = await service.getUnprocessedClients();

      // Assert
      expect(result).toEqual(mockClients);
      expect(mockPrismaService.client.findMany).toHaveBeenCalledWith({
        where: { processed: false },
      });
    });
  });

  describe('markAsProcessed', () => {
    it('should mark client as processed with categorized data', async () => {
      // Arrange
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

      // Act
      const result = await service.markAsProcessed(clientId, categorizedData);

      // Assert
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
      // Arrange
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

      // Act
      const result = await service.getUniqueValues();

      // Assert
      expect(result.sellers).toEqual(['Seller 1', 'Seller 2', 'Seller 3']);
      expect(result.industries).toEqual(['Finance', 'Technology']);
      expect(result.sentiments).toEqual(['neutral', 'positive']);
      expect(result.discoverySources).toEqual(['Google', 'LinkedIn']);
    });

    it('should return empty arrays when no clients exist', async () => {
      // Arrange
      mockPrismaService.client.findMany.mockResolvedValue([]);

      // Act
      const result = await service.getUniqueValues();

      // Assert
      expect(result.sellers).toEqual([]);
      expect(result.industries).toEqual([]);
      expect(result.sentiments).toEqual([]);
      expect(result.discoverySources).toEqual([]);
    });
  });
});

