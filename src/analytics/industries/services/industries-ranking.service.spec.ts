import { Test, TestingModule } from '@nestjs/testing';
import { IndustriesRankingService } from './industries-ranking.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { getSimulatedCurrentDate } from '../../../common/utils/date.utils';
import { Client } from '@prisma/client';
import { ANALYTICS_CONSTANTS } from '../../../common/constants';

jest.mock('../../../common/utils/date.utils', () => ({
  getSimulatedCurrentDate: jest.fn(() => new Date(2024, 10, 15)),
}));

describe('IndustriesRankingService', () => {
  let service: IndustriesRankingService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockPrismaService = {
    client: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IndustriesRankingService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<IndustriesRankingService>(IndustriesRankingService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getIndustriesDetailedRanking', () => {
    it('should return industries ranking sorted by client count', async () => {
      const mockClients: Partial<Client>[] = [
        {
          id: '1',
          industry: 'Technology',
          closed: true,
          sentiment: 'positive',
          urgencyLevel: 'immediate',
        },
        {
          id: '2',
          industry: 'Technology',
          closed: true,
          sentiment: 'positive',
          urgencyLevel: 'immediate',
        },
        {
          id: '3',
          industry: 'Finance',
          closed: false,
          sentiment: 'neutral',
          urgencyLevel: 'planned',
        },
      ];

      mockPrismaService.client.findMany.mockResolvedValue(mockClients as Client[]);

      const result = await service.getIndustriesDetailedRanking();

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].industry).toBe('Technology');
      expect(result[0].clients).toBe(2);
      expect(result[0].closed).toBe(2);
      expect(result[0].conversionRate).toBe(100);
      expect(result[0].averageSentiment).toBe('positive');
      expect(result[0].averageUrgency).toBe('immediate');
      expect(prismaService.client.findMany).toHaveBeenCalledWith({
        where: {
          processed: true,
          industry: { not: null },
        },
      });
    });

    it('should calculate average sentiment correctly', async () => {
      const mockClients: Partial<Client>[] = [
        {
          id: '1',
          industry: 'Technology',
          closed: false,
          sentiment: 'positive',
          urgencyLevel: 'planned',
        },
        {
          id: '2',
          industry: 'Technology',
          closed: false,
          sentiment: 'positive',
          urgencyLevel: 'planned',
        },
        {
          id: '3',
          industry: 'Technology',
          closed: false,
          sentiment: 'neutral',
          urgencyLevel: 'planned',
        },
      ];

      mockPrismaService.client.findMany.mockResolvedValue(mockClients as Client[]);

      const result = await service.getIndustriesDetailedRanking();

      expect(result[0].averageSentiment).toBe('positive');
    });

    it('should calculate average urgency correctly', async () => {
      const mockClients: Partial<Client>[] = [
        {
          id: '1',
          industry: 'Technology',
          closed: false,
          sentiment: 'neutral',
          urgencyLevel: 'immediate',
        },
        {
          id: '2',
          industry: 'Technology',
          closed: false,
          sentiment: 'neutral',
          urgencyLevel: 'immediate',
        },
        {
          id: '3',
          industry: 'Technology',
          closed: false,
          sentiment: 'neutral',
          urgencyLevel: 'immediate',
        },
      ];

      mockPrismaService.client.findMany.mockResolvedValue(mockClients as Client[]);

      const result = await service.getIndustriesDetailedRanking();

      expect(result[0].averageUrgency).toBe('immediate');
    });

    it('should return empty array when no clients exist', async () => {
      mockPrismaService.client.findMany.mockResolvedValue([]);

      const result = await service.getIndustriesDetailedRanking();

      expect(result).toEqual([]);
    });

    it('should handle null sentiment and urgency values', async () => {
      const mockClients: Partial<Client>[] = [
        {
          id: '1',
          industry: 'Technology',
          closed: false,
          sentiment: null,
          urgencyLevel: null,
        },
      ];

      mockPrismaService.client.findMany.mockResolvedValue(mockClients as Client[]);

      const result = await service.getIndustriesDetailedRanking();

      expect(result[0].averageSentiment).toBe('neutral');
      expect(result[0].averageUrgency).toBe('planned');
    });

    it('should handle unknown sentiment values with fallback', async () => {
      const mockClients: Partial<Client>[] = [
        {
          id: '1',
          industry: 'Technology',
          closed: false,
          sentiment: 'unknown_sentiment' as any,
          urgencyLevel: 'planned',
        },
      ];

      mockPrismaService.client.findMany.mockResolvedValue(mockClients as Client[]);

      const result = await service.getIndustriesDetailedRanking();

      expect(result[0].averageSentiment).toBe('neutral');
    });

    it('should handle unknown urgency values with fallback', async () => {
      const mockClients: Partial<Client>[] = [
        {
          id: '1',
          industry: 'Technology',
          closed: false,
          sentiment: 'neutral',
          urgencyLevel: 'unknown_urgency' as any,
        },
      ];

      mockPrismaService.client.findMany.mockResolvedValue(mockClients as Client[]);

      const result = await service.getIndustriesDetailedRanking();

      expect(result[0].averageUrgency).toBe('planned');
    });

    it('should calculate skeptical sentiment correctly', async () => {
      const mockClients: Partial<Client>[] = [
        {
          id: '1',
          industry: 'Technology',
          closed: false,
          sentiment: 'skeptical',
          urgencyLevel: 'planned',
        },
        {
          id: '2',
          industry: 'Technology',
          closed: false,
          sentiment: 'skeptical',
          urgencyLevel: 'planned',
        },
      ];

      mockPrismaService.client.findMany.mockResolvedValue(mockClients as Client[]);

      const result = await service.getIndustriesDetailedRanking();

      expect(result[0].averageSentiment).toBe('skeptical');
    });

    it('should calculate exploratory urgency correctly', async () => {
      const mockClients: Partial<Client>[] = [
        {
          id: '1',
          industry: 'Technology',
          closed: false,
          sentiment: 'neutral',
          urgencyLevel: 'exploratory',
        },
        {
          id: '2',
          industry: 'Technology',
          closed: false,
          sentiment: 'neutral',
          urgencyLevel: 'exploratory',
        },
      ];

      mockPrismaService.client.findMany.mockResolvedValue(mockClients as Client[]);

      const result = await service.getIndustriesDetailedRanking();

      expect(result[0].averageUrgency).toBe('exploratory');
    });
  });

  describe('getNewIndustriesLastMonth', () => {
    it('should handle case when new industry has no clients (conversion rate 0)', async () => {
      const lastMonthClients: Partial<Client>[] = [
        {
          id: '1',
          industry: 'Healthcare',
          meetingDate: new Date(2024, 9, 15),
          closed: false,
        },
      ];

      const previousClients: Partial<Client>[] = [];

      mockPrismaService.client.findMany
        .mockResolvedValueOnce(lastMonthClients as Client[])
        .mockResolvedValueOnce(previousClients as Client[])
        .mockResolvedValueOnce([]);

      const result = await service.getNewIndustriesLastMonth();

      expect(result.industries.length).toBeGreaterThan(0);
      expect(result.industries[0].conversionRate).toBe(0);
      expect(result.industries[0].clients).toBe(0);
    });

    it('should return new industries from last month', async () => {
      const lastMonthClients: Partial<Client>[] = [
        {
          id: '1',
          industry: 'Healthcare',
          meetingDate: new Date(2024, 9, 15),
          closed: true,
        },
        {
          id: '2',
          industry: 'Healthcare',
          meetingDate: new Date(2024, 9, 20),
          closed: true,
        },
      ];

      const previousClients: Partial<Client>[] = [
        {
          id: '3',
          industry: 'Technology',
          meetingDate: new Date(2024, 8, 15),
          closed: false,
        },
      ];

      mockPrismaService.client.findMany
        .mockResolvedValueOnce(lastMonthClients as Client[])
        .mockResolvedValueOnce(previousClients as Client[])
        .mockResolvedValueOnce(lastMonthClients as Client[]);

      const result = await service.getNewIndustriesLastMonth();

      expect(result.industries.length).toBeGreaterThan(0);
      expect(result.industries[0].industry).toBe('Healthcare');
      expect(result.month).toBeDefined();
      expect(mockPrismaService.client.findMany).toHaveBeenCalledTimes(3);
    });

    it('should return empty array when no new industries exist', async () => {
      mockPrismaService.client.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await service.getNewIndustriesLastMonth();

      expect(result.industries).toEqual([]);
      expect(result.month).toBeDefined();
    });
  });
});

