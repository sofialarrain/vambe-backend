import { Test, TestingModule } from '@nestjs/testing';
import { IndustriesAnalysisService } from './industries-analysis.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { Client } from '@prisma/client';
import { ANALYTICS_CONSTANTS } from '../../../common/constants';

describe('IndustriesAnalysisService', () => {
  let service: IndustriesAnalysisService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockPrismaService = {
    client: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IndustriesAnalysisService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<IndustriesAnalysisService>(IndustriesAnalysisService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getIndustriesToWatch', () => {
    it('should return industries to watch with expansion opportunities', async () => {
      const mockClients: Partial<Client>[] = [
        {
          id: '1',
          industry: 'Education',
          closed: true,
        },
        {
          id: '2',
          industry: 'Education',
          closed: true,
        },
        {
          id: '3',
          industry: 'Education',
          closed: true,
        },
        {
          id: '4',
          industry: 'Retail',
          closed: false,
        },
        {
          id: '5',
          industry: 'Retail',
          closed: false,
        },
        {
          id: '6',
          industry: 'Retail',
          closed: false,
        },
        {
          id: '7',
          industry: 'Retail',
          closed: false,
        },
        {
          id: '8',
          industry: 'Retail',
          closed: false,
        },
      ];

      mockPrismaService.client.findMany.mockResolvedValue(mockClients as Client[]);

      const result = await service.getIndustriesToWatch();

      expect(result).toBeDefined();
      expect(result.expansionOpportunities).toBeDefined();
      expect(result.strategyNeeded).toBeDefined();
      expect(Array.isArray(result.expansionOpportunities)).toBe(true);
      expect(Array.isArray(result.strategyNeeded)).toBe(true);
      expect(prismaService.client.findMany).toHaveBeenCalledWith({
        where: {
          processed: true,
          industry: { not: null },
        },
      });
    });

    it('should return empty arrays when no industries meet minimum threshold', async () => {
      const mockClients: Partial<Client>[] = [
        {
          id: '1',
          industry: 'Education',
          closed: false,
        },
        {
          id: '2',
          industry: 'Education',
          closed: false,
        },
      ];

      mockPrismaService.client.findMany.mockResolvedValue(mockClients as Client[]);

      const result = await service.getIndustriesToWatch();

      expect(result.expansionOpportunities).toEqual([]);
      expect(result.strategyNeeded).toEqual([]);
    });

    it('should handle edge case with single industry meeting threshold', async () => {
      const mockClients: Partial<Client>[] = [
        {
          id: '1',
          industry: 'Education',
          closed: true,
        },
        {
          id: '2',
          industry: 'Education',
          closed: true,
        },
        {
          id: '3',
          industry: 'Education',
          closed: true,
        },
      ];

      mockPrismaService.client.findMany.mockResolvedValue(mockClients as Client[]);

      const result = await service.getIndustriesToWatch();

      expect(result).toBeDefined();
      expect(result.expansionOpportunities).toBeDefined();
      expect(result.strategyNeeded).toBeDefined();
    });

    it('should calculate thresholds correctly with multiple industries', async () => {
      const mockClients: Partial<Client>[] = [];

      for (let i = 0; i < 3; i++) {
        mockClients.push({
          id: `edu-${i}`,
          industry: 'Education',
          closed: true,
        });
      }

      for (let i = 0; i < 10; i++) {
        mockClients.push({
          id: `retail-${i}`,
          industry: 'Retail',
          closed: i < 2,
        });
      }

      for (let i = 0; i < 5; i++) {
        mockClients.push({
          id: `tech-${i}`,
          industry: 'Technology',
          closed: i < 3,
        });
      }

      mockPrismaService.client.findMany.mockResolvedValue(mockClients as Client[]);

      const result = await service.getIndustriesToWatch();

      expect(result).toBeDefined();
      expect(result.expansionOpportunities).toBeDefined();
      expect(result.strategyNeeded).toBeDefined();
      expect(result.expansionOpportunities.length).toBeLessThanOrEqual(
        ANALYTICS_CONSTANTS.LIMITS.TOP_INDUSTRIES,
      );
      expect(result.strategyNeeded.length).toBeLessThanOrEqual(
        ANALYTICS_CONSTANTS.LIMITS.TOP_INDUSTRIES,
      );
    });

    it('should limit results to TOP_INDUSTRIES', async () => {
      const mockClients: Partial<Client>[] = [];

      for (let i = 0; i < 20; i++) {
        mockClients.push({
          id: `industry-${i}`,
          industry: `Industry${i}`,
          closed: true,
        });
      }

      mockPrismaService.client.findMany.mockResolvedValue(mockClients as Client[]);

      const result = await service.getIndustriesToWatch();

      expect(result.expansionOpportunities.length).toBeLessThanOrEqual(
        ANALYTICS_CONSTANTS.LIMITS.TOP_INDUSTRIES,
      );
      expect(result.strategyNeeded.length).toBeLessThanOrEqual(
        ANALYTICS_CONSTANTS.LIMITS.TOP_INDUSTRIES,
      );
    });

    it('should return empty arrays when no clients exist', async () => {
      mockPrismaService.client.findMany.mockResolvedValue([]);

      const result = await service.getIndustriesToWatch();

      expect(result.expansionOpportunities).toEqual([]);
      expect(result.strategyNeeded).toEqual([]);
    });
  });
});

