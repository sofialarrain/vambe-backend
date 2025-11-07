import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { SellersCorrelationsService } from './sellers-correlations.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { SellerInsightsGeneratorService } from '../../../llm/generators/seller-insights-generator.service';
import { SellersMetricsService } from './sellers-metrics.service';
import { SellersTimelineService } from './sellers-timeline.service';
import { ANALYTICS_CONSTANTS } from '../../../common/constants';
import { getSimulatedCurrentDate } from '../../../common/utils/date.utils';

jest.mock('../../../common/utils/date.utils', () => ({
  getSimulatedCurrentDate: jest.fn(),
}));

describe('SellersCorrelationsService', () => {
  let service: SellersCorrelationsService;
  let prismaService: jest.Mocked<PrismaService>;
  let sellerInsightsGenerator: jest.Mocked<SellerInsightsGeneratorService>;
  let sellersMetricsService: jest.Mocked<SellersMetricsService>;
  let sellersTimelineService: jest.Mocked<SellersTimelineService>;

  const mockPrismaService = {
    client: {
      findMany: jest.fn(),
    },
  };

  const mockSellerInsightsGenerator = {
    generateSellerCorrelationInsight: jest.fn(),
    generateSellerFeedback: jest.fn(),
    generateSellerTimelineInsight: jest.fn(),
  };

  const mockSellersMetricsService = {
    getSellerMetrics: jest.fn(),
  };

  const mockSellersTimelineService = {
    getSellersTimeline: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SellersCorrelationsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: SellerInsightsGeneratorService,
          useValue: mockSellerInsightsGenerator,
        },
        {
          provide: SellersMetricsService,
          useValue: mockSellersMetricsService,
        },
        {
          provide: SellersTimelineService,
          useValue: mockSellersTimelineService,
        },
      ],
    }).compile();

    service = module.get<SellersCorrelationsService>(SellersCorrelationsService);
    prismaService = module.get(PrismaService);
    sellerInsightsGenerator = module.get(SellerInsightsGeneratorService);
    sellersMetricsService = module.get(SellersMetricsService);
    sellersTimelineService = module.get(SellersTimelineService);

    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getSellerCorrelations', () => {
    it('should return seller correlations with significant performance', async () => {
      const mockClients = [
        {
          assignedSeller: 'Seller 1',
          closed: true,
          processed: true,
          industry: 'Technology',
          operationSize: 'large',
          urgencyLevel: 'immediate',
          sentiment: 'positive',
          discoverySource: 'Website',
        },
        {
          assignedSeller: 'Seller 1',
          closed: true,
          processed: true,
          industry: 'Technology',
          operationSize: 'medium',
          urgencyLevel: 'immediate',
          sentiment: 'positive',
          discoverySource: 'Website',
        },
        {
          assignedSeller: 'Seller 1',
          closed: false,
          processed: true,
          industry: 'Finance',
          operationSize: 'small',
          urgencyLevel: 'exploratory',
          sentiment: 'neutral',
          discoverySource: 'Referral',
        },
      ];

      mockPrismaService.client.findMany.mockResolvedValue(mockClients as any);

      const result = await service.getSellerCorrelations();

      expect(result).toBeInstanceOf(Array);
      expect(mockPrismaService.client.findMany).toHaveBeenCalledWith({
        where: { processed: true },
      });
    });

    it('should filter correlations by relevance thresholds', async () => {
      const mockClients = Array.from({ length: ANALYTICS_CONSTANTS.MIN_CLIENTS_FOR_RELIABILITY }, (_, i) => ({
        assignedSeller: 'Seller 1',
        closed: i < ANALYTICS_CONSTANTS.MIN_CLIENTS_FOR_RELIABILITY * 0.7, // 70% success rate
        processed: true,
        industry: 'Technology',
        operationSize: 'large',
        urgencyLevel: 'immediate',
        sentiment: 'positive',
        discoverySource: 'Website',
      }));

      mockPrismaService.client.findMany.mockResolvedValue(mockClients as any);

      const result = await service.getSellerCorrelations();

      expect(result.length).toBeGreaterThan(0);
      result.forEach((corr) => {
        expect(corr.total).toBeGreaterThanOrEqual(ANALYTICS_CONSTANTS.MIN_CLIENTS_FOR_RELIABILITY);
      });
    });

    it('should return empty array when no processed clients exist', async () => {
      mockPrismaService.client.findMany.mockResolvedValue([]);

      const result = await service.getSellerCorrelations();

      expect(result).toEqual([]);
    });

    it('should calculate performance vs average correctly', async () => {
      const mockClients = Array.from({ length: 10 }, (_, i) => ({
        assignedSeller: 'Seller 1',
        closed: i < 8,
        processed: true,
        industry: 'Technology',
        operationSize: 'large',
        urgencyLevel: 'immediate',
        sentiment: 'positive',
        discoverySource: 'Website',
      }));

      mockPrismaService.client.findMany.mockResolvedValue(mockClients as any);

      const result = await service.getSellerCorrelations();

      if (result.length > 0) {
        expect(result[0]).toHaveProperty('performanceVsAvg');
        expect(typeof result[0].performanceVsAvg).toBe('number');
      }
    });
  });

  describe('getSellerCorrelationInsights', () => {
    it('should return insights for sellers with correlations', async () => {
      const mockClients = [
        {
          assignedSeller: 'Seller 1',
          processed: true,
          industry: 'Technology',
          closed: true,
        },
      ];

      mockPrismaService.client.findMany
        .mockResolvedValueOnce(mockClients as any)
        .mockResolvedValueOnce(mockClients as any);

      mockSellerInsightsGenerator.generateSellerCorrelationInsight.mockResolvedValue(
        'Test insight',
      );

      const result = await service.getSellerCorrelationInsights();

      expect(result).toHaveProperty('Seller 1');
      expect(typeof result['Seller 1']).toBe('string');
    });

    it('should return fallback message when no correlations found', async () => {
      const mockClients = [{ assignedSeller: 'Seller 1', processed: true }];

      mockPrismaService.client.findMany
        .mockResolvedValueOnce(mockClients as any)
        .mockResolvedValueOnce(mockClients as any);

      const result = await service.getSellerCorrelationInsights();

      expect(result['Seller 1']).toContain('No significant correlations');
    });

    it('should handle errors gracefully', async () => {
      const minClients = ANALYTICS_CONSTANTS.MIN_CLIENTS_FOR_RELIABILITY;
      const mockClientsForCorrelations = Array.from({ length: minClients }, () => ({
        assignedSeller: 'Seller 1',
        processed: true,
        industry: 'Technology',
        closed: true,
        operationSize: 'large',
        urgencyLevel: 'immediate',
        sentiment: 'positive',
        discoverySource: 'Website',
      }));

      const mockClientsForSellers = [{ assignedSeller: 'Seller 1', processed: true }];

      mockPrismaService.client.findMany
        .mockResolvedValueOnce(mockClientsForCorrelations as any)
        .mockResolvedValueOnce(mockClientsForSellers as any);

      mockSellerInsightsGenerator.generateSellerCorrelationInsight.mockRejectedValue(
        new Error('API Error'),
      );

      const result = await service.getSellerCorrelationInsights();

      expect(result['Seller 1']).toBeDefined();
      expect(result['Seller 1']).toContain('success rate');
    });
  });

  describe('getSellerInsights', () => {
    it('should return insights for sellers with significant changes', async () => {
      const now = new Date('2024-02-15T10:00:00Z');
      (getSimulatedCurrentDate as jest.Mock).mockReturnValue(now);

      const currentMonthClients = [
        { assignedSeller: 'Seller 1', closed: true },
        { assignedSeller: 'Seller 1', closed: true },
        { assignedSeller: 'Seller 1', closed: true },
      ];

      const lastMonthClients = [{ assignedSeller: 'Seller 1', closed: true }];

      mockPrismaService.client.findMany
        .mockResolvedValueOnce(currentMonthClients as any)
        .mockResolvedValueOnce(lastMonthClients as any);

      const result = await service.getSellerInsights();

      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('seller');
      expect(result[0]).toHaveProperty('type');
      expect(result[0]).toHaveProperty('metric');
      expect(result[0]).toHaveProperty('message');
      expect(result[0]).toHaveProperty('change');
    });

    it('should return insight for low urgency pattern', async () => {
      const now = new Date('2024-02-15T10:00:00Z');
      (getSimulatedCurrentDate as jest.Mock).mockReturnValue(now);

      const currentMonthClients = Array.from(
        { length: ANALYTICS_CONSTANTS.MIN_CLIENTS_FOR_RELIABILITY },
        () => ({
          assignedSeller: 'Seller 1',
          closed: true,
          urgencyLevel: 'exploratory',
        }),
      );

      mockPrismaService.client.findMany
        .mockResolvedValueOnce(currentMonthClients as any)
        .mockResolvedValueOnce([]);

      const result = await service.getSellerInsights();

      const urgencyInsight = result.find((insight) => insight.metric === 'urgency');
      expect(urgencyInsight).toBeDefined();
      expect(urgencyInsight?.message).toContain('low urgency');
    });

    it('should return empty array when no significant changes', async () => {
      const now = new Date('2024-02-15T10:00:00Z');
      (getSimulatedCurrentDate as jest.Mock).mockReturnValue(now);

      const currentMonthClients = [{ assignedSeller: 'Seller 1', closed: true }];
      const lastMonthClients = [{ assignedSeller: 'Seller 1', closed: true }];

      mockPrismaService.client.findMany
        .mockResolvedValueOnce(currentMonthClients as any)
        .mockResolvedValueOnce(lastMonthClients as any);

      const result = await service.getSellerInsights();

      expect(result.length).toBe(0);
    });
  });

  describe('getSellerAIFeedback', () => {
    it('should return AI feedback for all sellers', async () => {
      const mockSellers = [
        {
          seller: 'Seller 1',
          total: 10,
          closed: 8,
          conversionRate: 80,
        },
      ];

      const mockCorrelations = [
        {
          seller: 'Seller 1',
          dimension: 'industry',
          value: 'Technology',
          successRate: 85,
        },
      ];

      mockSellersMetricsService.getSellerMetrics.mockResolvedValue(mockSellers as any);
      mockPrismaService.client.findMany.mockResolvedValue([]);

      mockSellerInsightsGenerator.generateSellerFeedback.mockResolvedValue({
        recommendations: ['Test recommendation'],
      });

      const result = await service.getSellerAIFeedback();

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('seller');
      expect(result[0]).toHaveProperty('recommendations');
      expect(result[0].recommendations).toEqual(['Test recommendation']);
    });

    it('should handle multiple sellers correctly', async () => {
      // Arrange
      const mockSellers = [
        { seller: 'Seller 1', total: 10, closed: 8, conversionRate: 80 },
        { seller: 'Seller 2', total: 5, closed: 3, conversionRate: 60 },
      ];

      mockSellersMetricsService.getSellerMetrics.mockResolvedValue(mockSellers as any);
      mockPrismaService.client.findMany.mockResolvedValue([]);

      mockSellerInsightsGenerator.generateSellerFeedback.mockResolvedValue({
        recommendations: ['Test'],
      });

      const result = await service.getSellerAIFeedback();

      expect(result).toHaveLength(2);
      expect(mockSellerInsightsGenerator.generateSellerFeedback).toHaveBeenCalledTimes(2);
    });
  });

  describe('getSellerTimelineInsight', () => {
    it('should return timeline insight successfully', async () => {
      const mockTimelineData = [
        {
          period: '2024-01',
          sellers: { 'Seller 1': 5, 'Seller 2': 3 },
        },
        {
          period: '2024-02',
          sellers: { 'Seller 1': 8, 'Seller 2': 4 },
        },
      ];

      mockSellersTimelineService.getSellersTimeline.mockResolvedValue(mockTimelineData as any);
      mockSellerInsightsGenerator.generateSellerTimelineInsight.mockResolvedValue(
        'Test timeline insight',
      );

      const result = await service.getSellerTimelineInsight('month');

      expect(result).toBe('Test timeline insight');
      expect(mockSellersTimelineService.getSellersTimeline).toHaveBeenCalledWith('month');
    });

    it('should return fallback message when no timeline data', async () => {
      mockSellersTimelineService.getSellersTimeline.mockResolvedValue([]);

      const result = await service.getSellerTimelineInsight('month');

      expect(result).toBe('Insufficient data to generate insights.');
    });

    it('should handle errors gracefully', async () => {
      mockSellersTimelineService.getSellersTimeline.mockRejectedValue(new Error('Database error'));

      const result = await service.getSellerTimelineInsight('month');

      expect(result).toBe('Unable to generate seller timeline insights at this time.');
    });

    it('should use default month granularity', async () => {
      const mockTimelineData = [
        {
          period: '2024-01',
          sellers: { 'Seller 1': 5 },
        },
      ];

      mockSellersTimelineService.getSellersTimeline.mockResolvedValue(mockTimelineData as any);
      mockSellerInsightsGenerator.generateSellerTimelineInsight.mockResolvedValue('Test');

      const result = await service.getSellerTimelineInsight();

      expect(result).toBe('Test');
      expect(mockSellersTimelineService.getSellersTimeline).toHaveBeenCalledWith('month');
    });
  });
});

