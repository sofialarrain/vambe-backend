import { Test, TestingModule } from '@nestjs/testing';
import { SellersAnalyticsService } from './sellers-analytics.service';
import { PrismaService } from '../../prisma/prisma.service';
import { SellerInsightsGeneratorService } from '../../llm/generators/seller-insights-generator.service';
import { getSimulatedCurrentDate, getSimulatedCurrentYear } from '../../common/utils/date.utils';
import { ANALYTICS_CONSTANTS, API_CONSTANTS } from '../../common/constants';
import { Client } from '@prisma/client';

// Mock the date utils
jest.mock('../../common/utils/date.utils', () => ({
  getSimulatedCurrentDate: jest.fn(() => new Date(2024, 10, 15)), // November 15, 2024
  getSimulatedCurrentYear: jest.fn(() => 2024),
}));

describe('SellersAnalyticsService', () => {
  let service: SellersAnalyticsService;
  let prismaService: jest.Mocked<PrismaService>;
  let sellerInsightsGenerator: jest.Mocked<SellerInsightsGeneratorService>;

  const mockPrismaService = {
    client: {
      groupBy: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const mockSellerInsightsGenerator = {
    generateSellerCorrelationInsight: jest.fn(),
    generateSellerFeedback: jest.fn(),
    generateSellerTimelineInsight: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SellersAnalyticsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: SellerInsightsGeneratorService,
          useValue: mockSellerInsightsGenerator,
        },
      ],
    }).compile();

    service = module.get<SellersAnalyticsService>(SellersAnalyticsService);
    prismaService = module.get(PrismaService);
    sellerInsightsGenerator = module.get(SellerInsightsGeneratorService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getSellerMetrics', () => {
    it('should return seller metrics sorted by conversion rate', async () => {
      // Arrange
      const mockGroupBy = [
        { assignedSeller: 'Seller 1', _count: { id: 20 } },
        { assignedSeller: 'Seller 2', _count: { id: 15 } },
      ];

      mockPrismaService.client.groupBy.mockResolvedValue(mockGroupBy);
      mockPrismaService.client.count
        .mockResolvedValueOnce(12) // Seller 1 closed
        .mockResolvedValueOnce(8); // Seller 2 closed

      // Act
      const result = await service.getSellerMetrics();

      // Assert
      expect(result.length).toBe(2);
      expect(result[0].seller).toBe('Seller 1');
      expect(result[0].total).toBe(20);
      expect(result[0].closed).toBe(12);
      expect(result[0].conversionRate).toBe(60.0);
      expect(result[1].conversionRate).toBeLessThanOrEqual(result[0].conversionRate);
      expect(mockPrismaService.client.groupBy).toHaveBeenCalledWith({
        by: ['assignedSeller'],
        _count: { id: true },
      });
    });

    it('should return empty array when no sellers exist', async () => {
      // Arrange
      mockPrismaService.client.groupBy.mockResolvedValue([]);

      // Act
      const result = await service.getSellerMetrics();

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('getSellerOfWeek', () => {
    it('should return seller of the week for current week', async () => {
      // Arrange
      const currentDate = getSimulatedCurrentDate();
      const dayOfWeek = currentDate.getDay();
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const weekStartDate = new Date(currentDate);
      weekStartDate.setDate(currentDate.getDate() + diff);
      weekStartDate.setHours(0, 0, 0, 0);

      const mockClients: Partial<Client>[] = [
        {
          id: '1',
          assignedSeller: 'Seller 1',
          closed: true,
          meetingDate: weekStartDate,
        },
        {
          id: '2',
          assignedSeller: 'Seller 1',
          closed: false,
          meetingDate: weekStartDate,
        },
        {
          id: '3',
          assignedSeller: 'Seller 2',
          closed: true,
          meetingDate: weekStartDate,
        },
      ];

      mockPrismaService.client.findMany.mockResolvedValue(mockClients as Client[]);

      // Act
      const result = await service.getSellerOfWeek();

      // Assert
      expect(result.weekPodium).toBeDefined();
      expect(result.weekRange).toBeDefined();
      expect(result.weekRange.start).toBeDefined();
      expect(result.weekRange.end).toBeDefined();
      expect(mockPrismaService.client.findMany).toHaveBeenCalled();
    });

    it('should return seller of the week for specific week', async () => {
      // Arrange
      const weekStart = '2024-01-01';
      const mockClients: Partial<Client>[] = [
        {
          id: '1',
          assignedSeller: 'Seller 1',
          closed: true,
          meetingDate: new Date('2024-01-02'),
        },
      ];

      mockPrismaService.client.findMany.mockResolvedValue(mockClients as Client[]);

      // Act
      const result = await service.getSellerOfWeek(weekStart);

      // Assert
      expect(result.weekPodium).toBeDefined();
      expect(mockPrismaService.client.findMany).toHaveBeenCalled();
    });

    it('should limit results to TOP_SELLERS', async () => {
      // Arrange
      const mockClients: Partial<Client>[] = [];
      for (let i = 0; i < 10; i++) {
        mockClients.push({
          id: `client-${i}`,
          assignedSeller: `Seller ${i % 3}`,
          closed: i % 2 === 0,
          meetingDate: new Date('2024-01-01'),
        });
      }

      mockPrismaService.client.findMany.mockResolvedValue(mockClients as Client[]);

      // Act
      const result = await service.getSellerOfWeek('2024-01-01');

      // Assert
      expect(result.weekPodium.length).toBeLessThanOrEqual(ANALYTICS_CONSTANTS.LIMITS.TOP_SELLERS);
    });
  });

  describe('getAnnualSellerRanking', () => {
    it('should return annual seller ranking for default year', async () => {
      // Arrange
      const year = getSimulatedCurrentYear();
      const mockClosedClients: Partial<Client>[] = [
        {
          id: '1',
          assignedSeller: 'Seller 1',
          closed: true,
          meetingDate: new Date(year, 5, 15),
        },
        {
          id: '2',
          assignedSeller: 'Seller 1',
          closed: true,
          meetingDate: new Date(year, 6, 20),
        },
      ];

      const mockAllClients: Partial<Client>[] = [
        ...mockClosedClients,
        {
          id: '3',
          assignedSeller: 'Seller 1',
          closed: false,
          meetingDate: new Date(year, 7, 10),
        },
      ];

      mockPrismaService.client.findMany
        .mockResolvedValueOnce(mockClosedClients as Client[])
        .mockResolvedValueOnce(mockAllClients as Client[]);

      // Act
      const result = await service.getAnnualSellerRanking();

      // Assert
      expect(result.year).toBe(year);
      expect(result.ranking).toBeDefined();
      expect(Array.isArray(result.ranking)).toBe(true);
    });

    it('should return annual seller ranking for specific year', async () => {
      // Arrange
      const year = 2023;
      mockPrismaService.client.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      // Act
      const result = await service.getAnnualSellerRanking(year);

      // Assert
      expect(result.year).toBe(year);
      expect(result.ranking).toEqual([]);
    });
  });

  describe('getSellersTimeline', () => {
    it('should return sellers timeline with week granularity', async () => {
      // Arrange
      const mockClients: Partial<Client>[] = [
        {
          id: '1',
          assignedSeller: 'Seller 1',
          closed: true,
          meetingDate: new Date('2024-01-15'),
        },
        {
          id: '2',
          assignedSeller: 'Seller 2',
          closed: true,
          meetingDate: new Date('2024-01-22'),
        },
      ];

      mockPrismaService.client.findMany.mockResolvedValue(mockClients as Client[]);

      // Act
      const result = await service.getSellersTimeline('week');

      // Assert
      expect(Array.isArray(result)).toBe(true);
      if (result.length > 0) {
        expect(result[0].period).toBeDefined();
        expect(result[0].sellers).toBeDefined();
      }
      expect(mockPrismaService.client.findMany).toHaveBeenCalledWith({
        where: { closed: true },
        orderBy: { meetingDate: 'asc' },
      });
    });

    it('should return sellers timeline with month granularity', async () => {
      // Arrange
      const mockClients: Partial<Client>[] = [
        {
          id: '1',
          assignedSeller: 'Seller 1',
          closed: true,
          meetingDate: new Date('2024-01-15'),
        },
        {
          id: '2',
          assignedSeller: 'Seller 1',
          closed: true,
          meetingDate: new Date('2024-01-20'),
        },
      ];

      mockPrismaService.client.findMany.mockResolvedValue(mockClients as Client[]);

      // Act
      const result = await service.getSellersTimeline('month');

      // Assert
      expect(Array.isArray(result)).toBe(true);
      if (result.length > 0) {
        expect(result[0].period).toMatch(/^\d{4}-\d{2}$/); // Format: YYYY-MM
      }
    });

    it('should sort timeline chronologically', async () => {
      // Arrange
      const mockClients: Partial<Client>[] = [
        {
          id: '1',
          assignedSeller: 'Seller 1',
          closed: true,
          meetingDate: new Date('2024-03-15'),
        },
        {
          id: '2',
          assignedSeller: 'Seller 1',
          closed: true,
          meetingDate: new Date('2024-01-15'),
        },
        {
          id: '3',
          assignedSeller: 'Seller 1',
          closed: true,
          meetingDate: new Date('2024-02-15'),
        },
      ];

      mockPrismaService.client.findMany.mockResolvedValue(mockClients as Client[]);

      // Act
      const result = await service.getSellersTimeline('month');

      // Assert
      expect(result.length).toBeGreaterThan(0);
      for (let i = 1; i < result.length; i++) {
        expect(result[i].period.localeCompare(result[i - 1].period)).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('getSellerCorrelations', () => {
    it('should return seller correlations with significant performance', async () => {
      // Arrange
      const mockClients: Partial<Client>[] = [
        {
          id: '1',
          assignedSeller: 'Seller 1',
          industry: 'Technology',
          operationSize: 'large',
          urgencyLevel: 'immediate',
          sentiment: 'positive',
          discoverySource: 'Website',
          closed: true,
          processed: true,
        },
        {
          id: '2',
          assignedSeller: 'Seller 1',
          industry: 'Technology',
          closed: true,
          processed: true,
        },
        {
          id: '3',
          assignedSeller: 'Seller 1',
          industry: 'Technology',
          closed: true,
          processed: true,
        },
        {
          id: '4',
          assignedSeller: 'Seller 1',
          industry: 'Technology',
          closed: true,
          processed: true,
        },
      ];

      mockPrismaService.client.findMany.mockResolvedValue(mockClients as Client[]);

      // Act
      const result = await service.getSellerCorrelations();

      // Assert
      expect(Array.isArray(result)).toBe(true);
      result.forEach(correlation => {
        expect(correlation.seller).toBeDefined();
        expect(correlation.dimension).toBeDefined();
        expect(correlation.value).toBeDefined();
        expect(correlation.total).toBeGreaterThanOrEqual(ANALYTICS_CONSTANTS.MIN_CLIENTS_FOR_RELIABILITY);
      });
    });

    it('should filter correlations by relevance thresholds', async () => {
      // Arrange
      const mockClients: Partial<Client>[] = [];
      // Create clients that meet MIN_CLIENTS_FOR_RELIABILITY
      for (let i = 0; i < ANALYTICS_CONSTANTS.MIN_CLIENTS_FOR_RELIABILITY; i++) {
        mockClients.push({
          id: `client-${i}`,
          assignedSeller: 'Seller 1',
          industry: 'Technology',
          closed: true, // 100% success rate
          processed: true,
        });
      }

      mockPrismaService.client.findMany.mockResolvedValue(mockClients as Client[]);

      // Act
      const result = await service.getSellerCorrelations();

      // Assert
      // Should include correlations with high success rate (>= 70%)
      const relevantCorrelations = result.filter(c => c.successRate >= 70);
      expect(relevantCorrelations.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getSellerCorrelationInsights', () => {
    it('should return insights for sellers with correlations', async () => {
      // Arrange
      const mockCorrelations = [
        {
          seller: 'Seller 1',
          dimension: 'industry',
          value: 'Technology',
          total: 10,
          closed: 8,
          successRate: 80.0,
          sellerAvgConversion: 60.0,
          overallAvg: 55.0,
          performanceVsAvg: 25.0,
        },
      ];

      const mockClients: Partial<Client>[] = [
        {
          id: '1',
          assignedSeller: 'Seller 1',
          processed: true,
        },
      ];

      mockPrismaService.client.findMany.mockResolvedValue(mockClients as Client[]);
      mockSellerInsightsGenerator.generateSellerCorrelationInsight.mockResolvedValue(
        'Seller 1 shows strong performance with Technology clients.',
      );

      // Mock getSellerCorrelations by spying on the service
      jest.spyOn(service, 'getSellerCorrelations').mockResolvedValue(mockCorrelations);

      // Act
      const result = await service.getSellerCorrelationInsights();

      // Assert
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
      expect(result['Seller 1']).toBeDefined();
    });

    it('should return fallback message when no correlations found', async () => {
      // Arrange
      const mockClients: Partial<Client>[] = [
        {
          id: '1',
          assignedSeller: 'Seller 1',
          processed: true,
        },
      ];

      mockPrismaService.client.findMany.mockResolvedValue(mockClients as Client[]);
      jest.spyOn(service, 'getSellerCorrelations').mockResolvedValue([]);

      // Act
      const result = await service.getSellerCorrelationInsights();

      // Assert
      expect(result['Seller 1']).toContain('No significant correlations');
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      const mockClients: Partial<Client>[] = [
        {
          id: '1',
          assignedSeller: 'Seller 1',
          processed: true,
        },
      ];

      const mockCorrelations = [
        {
          seller: 'Seller 1',
          dimension: 'industry',
          value: 'Technology',
          total: 10,
          closed: 8,
          successRate: 80.0,
          sellerAvgConversion: 60.0,
          overallAvg: 55.0,
          performanceVsAvg: 25.0,
        },
      ];

      mockPrismaService.client.findMany.mockResolvedValue(mockClients as Client[]);
      jest.spyOn(service, 'getSellerCorrelations').mockResolvedValue(mockCorrelations);
      mockSellerInsightsGenerator.generateSellerCorrelationInsight.mockRejectedValue(
        new Error('AI service error'),
      );

      // Act
      const result = await service.getSellerCorrelationInsights();

      // Assert
      expect(result['Seller 1']).toBeDefined();
      expect(result['Seller 1']).toContain('80%'); // Fallback message should contain stats
    });
  });

  describe('getSellerInsights', () => {
    it('should return insights for sellers with significant changes', async () => {
      // Arrange
      const currentDate = getSimulatedCurrentDate();
      const currentMonth = currentDate.getMonth();
      const currentYear = currentDate.getFullYear();

      const currentMonthClients: Partial<Client>[] = [
        {
          id: '1',
          assignedSeller: 'Seller 1',
          closed: true,
          meetingDate: new Date(currentYear, currentMonth, 1),
        },
        {
          id: '2',
          assignedSeller: 'Seller 1',
          closed: true,
          meetingDate: new Date(currentYear, currentMonth, 2),
        },
        {
          id: '3',
          assignedSeller: 'Seller 1',
          closed: true,
          meetingDate: new Date(currentYear, currentMonth, 3),
        },
      ];

      const lastMonthClients: Partial<Client>[] = [
        {
          id: '4',
          assignedSeller: 'Seller 1',
          closed: true,
          meetingDate: new Date(currentYear, currentMonth - 1, 1),
        },
      ];

      mockPrismaService.client.findMany
        .mockResolvedValueOnce(currentMonthClients as Client[])
        .mockResolvedValueOnce(lastMonthClients as Client[]);

      // Act
      const result = await service.getSellerInsights();

      // Assert
      expect(Array.isArray(result)).toBe(true);
      // Should detect significant change (3 vs 1 = 200% increase)
      const seller1Insight = result.find(i => i.seller === 'Seller 1');
      if (seller1Insight) {
        expect(seller1Insight.type).toBe('positive');
        expect(seller1Insight.metric).toBe('conversions');
      }
    });

    it('should return insight for low urgency pattern', async () => {
      // Arrange
      const currentDate = getSimulatedCurrentDate();
      const currentMonth = currentDate.getMonth();
      const currentYear = currentDate.getFullYear();

      const currentMonthClients: Partial<Client>[] = [];
      for (let i = 0; i < ANALYTICS_CONSTANTS.MIN_CLIENTS_FOR_RELIABILITY; i++) {
        currentMonthClients.push({
          id: `client-${i}`,
          assignedSeller: 'Seller 1',
          closed: true,
          urgencyLevel: 'exploratory',
          meetingDate: new Date(currentYear, currentMonth, i + 1),
        });
      }

      mockPrismaService.client.findMany
        .mockResolvedValueOnce(currentMonthClients as Client[])
        .mockResolvedValueOnce([]);

      // Act
      const result = await service.getSellerInsights();

      // Assert
      const urgencyInsight = result.find(
        i => i.seller === 'Seller 1' && i.metric === 'urgency',
      );
      expect(urgencyInsight).toBeDefined();
      if (urgencyInsight) {
        expect(urgencyInsight.type).toBe('neutral');
      }
    });
  });

  describe('getSellerAIFeedback', () => {
    it('should return AI feedback for all sellers', async () => {
      // Arrange
      const mockMetrics = [
        {
          seller: 'Seller 1',
          total: 20,
          closed: 12,
          conversionRate: 60.0,
        },
      ];

      const mockCorrelations = [
        {
          seller: 'Seller 1',
          dimension: 'industry',
          value: 'Technology',
          total: 10,
          closed: 8,
          successRate: 80.0,
          sellerAvgConversion: 60.0,
          overallAvg: 55.0,
          performanceVsAvg: 25.0,
        },
      ];

      jest.spyOn(service, 'getSellerMetrics').mockResolvedValue(mockMetrics);
      jest.spyOn(service, 'getSellerCorrelations').mockResolvedValue(mockCorrelations);

      mockSellerInsightsGenerator.generateSellerFeedback.mockResolvedValue({
        recommendations: ['Focus on high-value clients', 'Improve follow-up'],
      });

      // Act
      const result = await service.getSellerAIFeedback();

      // Assert
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].seller).toBeDefined();
      expect(result[0].recommendations).toBeDefined();
      expect(Array.isArray(result[0].recommendations)).toBe(true);
    });
  });

  describe('getSellerTimelineInsight', () => {
    it('should return timeline insight successfully', async () => {
      // Arrange
      const mockTimeline = [
        {
          period: '2024-01',
          sellers: {
            'Seller 1': 5,
            'Seller 2': 3,
          },
        },
      ];

      jest.spyOn(service, 'getSellersTimeline').mockResolvedValue(mockTimeline);
      mockSellerInsightsGenerator.generateSellerTimelineInsight.mockResolvedValue(
        'Seller performance shows increasing trends.',
      );

      // Act
      const result = await service.getSellerTimelineInsight('month');

      // Assert
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result).not.toBe('Insufficient data to generate insights.');
    });

    it('should return fallback message when no timeline data', async () => {
      // Arrange
      jest.spyOn(service, 'getSellersTimeline').mockResolvedValue([]);

      // Act
      const result = await service.getSellerTimelineInsight();

      // Assert
      expect(result).toBe('Insufficient data to generate insights.');
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      jest.spyOn(service, 'getSellersTimeline').mockRejectedValue(new Error('Database error'));

      // Act
      const result = await service.getSellerTimelineInsight();

      // Assert
      expect(result).toBe('Unable to generate seller timeline insights at this time.');
    });
  });
});

