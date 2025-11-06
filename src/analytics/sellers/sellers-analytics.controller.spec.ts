import { Test, TestingModule } from '@nestjs/testing';
import { SellersAnalyticsController } from './sellers-analytics.controller';
import { SellersAnalyticsService } from './sellers-analytics.service';
import { GranularityEnum } from '../../common/dto/analytics/queries.dto';
import {
  SellerMetricsDto,
  SellerCorrelationDto,
  SellerInsightDto,
  SellerAIFeedbackDto,
  WeekPodiumDto,
  AnnualSellerRankingDto,
  SellerTimelineDataDto,
} from '../../common/dto/analytics';

describe('SellersAnalyticsController', () => {
  let controller: SellersAnalyticsController;
  let service: jest.Mocked<SellersAnalyticsService>;

  const mockSellersAnalyticsService = {
    getSellerMetrics: jest.fn(),
    getSellerOfWeek: jest.fn(),
    getAnnualSellerRanking: jest.fn(),
    getSellersTimeline: jest.fn(),
    getSellerCorrelations: jest.fn(),
    getSellerCorrelationInsights: jest.fn(),
    getSellerInsights: jest.fn(),
    getSellerAIFeedback: jest.fn(),
    getSellerTimelineInsight: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SellersAnalyticsController],
      providers: [
        {
          provide: SellersAnalyticsService,
          useValue: mockSellersAnalyticsService,
        },
      ],
    }).compile();

    controller = module.get<SellersAnalyticsController>(SellersAnalyticsController);
    service = module.get(SellersAnalyticsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getSellerMetrics', () => {
    it('should return seller metrics successfully', async () => {
      // Arrange
      const mockMetrics: SellerMetricsDto[] = [
        {
          seller: 'Seller 1',
          total: 20,
          closed: 12,
          conversionRate: 60.0,
        },
        {
          seller: 'Seller 2',
          total: 15,
          closed: 8,
          conversionRate: 53.33,
        },
      ];

      mockSellersAnalyticsService.getSellerMetrics.mockResolvedValue(mockMetrics);

      // Act
      const result = await controller.getSellerMetrics();

      // Assert
      expect(result).toEqual(mockMetrics);
      expect(result.length).toBe(2);
      expect(service.getSellerMetrics).toHaveBeenCalledTimes(1);
      expect(service.getSellerMetrics).toHaveBeenCalledWith();
    });
  });

  describe('getSellerOfWeek', () => {
    it('should return seller of the week with default current week', async () => {
      // Arrange
      const mockWeekPodium: WeekPodiumDto = {
        weekPodium: [
          {
            seller: 'Seller 1',
            closed: 5,
            total: 8,
            conversionRate: 62.5,
          },
        ],
        weekRange: {
          start: '2024-11-11',
          end: '2024-11-17',
        },
      };

      mockSellersAnalyticsService.getSellerOfWeek.mockResolvedValue(mockWeekPodium);

      // Act
      const result = await controller.getSellerOfWeek({});

      // Assert
      expect(result).toEqual(mockWeekPodium);
      expect(service.getSellerOfWeek).toHaveBeenCalledTimes(1);
      expect(service.getSellerOfWeek).toHaveBeenCalledWith(undefined, undefined);
    });

    it('should return seller of the week with specific week and year', async () => {
      // Arrange
      const mockWeekPodium: WeekPodiumDto = {
        weekPodium: [
          {
            seller: 'Seller 2',
            closed: 3,
            total: 5,
            conversionRate: 60.0,
          },
        ],
        weekRange: {
          start: '2024-01-01',
          end: '2024-01-07',
        },
      };

      mockSellersAnalyticsService.getSellerOfWeek.mockResolvedValue(mockWeekPodium);

      // Act
      const result = await controller.getSellerOfWeek({
        weekStart: '2024-01-01',
        year: 2024,
      });

      // Assert
      expect(result).toEqual(mockWeekPodium);
      expect(service.getSellerOfWeek).toHaveBeenCalledWith('2024-01-01', 2024);
    });
  });

  describe('getAnnualSellerRanking', () => {
    it('should return annual seller ranking with default year', async () => {
      // Arrange
      const mockRanking: AnnualSellerRankingDto = {
        year: 2024,
        ranking: [
          {
            seller: 'Seller 1',
            closed: 50,
            total: 80,
            conversionRate: 62.5,
          },
          {
            seller: 'Seller 2',
            closed: 40,
            total: 70,
            conversionRate: 57.14,
          },
        ],
      };

      mockSellersAnalyticsService.getAnnualSellerRanking.mockResolvedValue(mockRanking);

      // Act
      const result = await controller.getAnnualSellerRanking({});

      // Assert
      expect(result).toEqual(mockRanking);
      expect(service.getAnnualSellerRanking).toHaveBeenCalledTimes(1);
      expect(service.getAnnualSellerRanking).toHaveBeenCalledWith(undefined);
    });

    it('should return annual seller ranking with specific year', async () => {
      // Arrange
      const mockRanking: AnnualSellerRankingDto = {
        year: 2023,
        ranking: [
          {
            seller: 'Seller 1',
            closed: 30,
            total: 50,
            conversionRate: 60.0,
          },
        ],
      };

      mockSellersAnalyticsService.getAnnualSellerRanking.mockResolvedValue(mockRanking);

      // Act
      const result = await controller.getAnnualSellerRanking({ year: 2023 });

      // Assert
      expect(result).toEqual(mockRanking);
      expect(service.getAnnualSellerRanking).toHaveBeenCalledWith(2023);
    });
  });

  describe('getSellersTimeline', () => {
    it('should return sellers timeline with default week granularity', async () => {
      // Arrange
      const mockTimeline: SellerTimelineDataDto[] = [
        {
          period: '2024-W01',
          sellers: {
            'Seller 1': 5,
            'Seller 2': 3,
          },
        },
        {
          period: '2024-W02',
          sellers: {
            'Seller 1': 4,
            'Seller 2': 6,
          },
        },
      ];

      mockSellersAnalyticsService.getSellersTimeline.mockResolvedValue(mockTimeline);

      // Act
      const result = await controller.getSellersTimeline({});

      // Assert
      expect(result).toEqual(mockTimeline);
      expect(service.getSellersTimeline).toHaveBeenCalledWith(GranularityEnum.WEEK);
    });

    it('should return sellers timeline with month granularity', async () => {
      // Arrange
      const mockTimeline: SellerTimelineDataDto[] = [
        {
          period: '2024-01',
          sellers: {
            'Seller 1': 20,
            'Seller 2': 15,
          },
        },
      ];

      mockSellersAnalyticsService.getSellersTimeline.mockResolvedValue(mockTimeline);

      // Act
      const result = await controller.getSellersTimeline({ granularity: GranularityEnum.MONTH });

      // Assert
      expect(result).toEqual(mockTimeline);
      expect(service.getSellersTimeline).toHaveBeenCalledWith(GranularityEnum.MONTH);
    });
  });

  describe('getSellerCorrelations', () => {
    it('should return seller correlations successfully', async () => {
      // Arrange
      const mockCorrelations: SellerCorrelationDto[] = [
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

      mockSellersAnalyticsService.getSellerCorrelations.mockResolvedValue(mockCorrelations);

      // Act
      const result = await controller.getSellerCorrelations();

      // Assert
      expect(result).toEqual(mockCorrelations);
      expect(service.getSellerCorrelations).toHaveBeenCalledTimes(1);
      expect(service.getSellerCorrelations).toHaveBeenCalledWith();
    });
  });

  describe('getSellerCorrelationInsights', () => {
    it('should return seller correlation insights successfully', async () => {
      // Arrange
      const mockInsights: Record<string, string> = {
        'Seller 1': 'Seller 1 shows strong performance with Technology clients.',
        'Seller 2': 'No significant correlations identified yet.',
      };

      mockSellersAnalyticsService.getSellerCorrelationInsights.mockResolvedValue(mockInsights);

      // Act
      const result = await controller.getSellerCorrelationInsights();

      // Assert
      expect(result).toEqual(mockInsights);
      expect(service.getSellerCorrelationInsights).toHaveBeenCalledTimes(1);
      expect(service.getSellerCorrelationInsights).toHaveBeenCalledWith();
    });
  });

  describe('getSellerInsights', () => {
    it('should return seller insights successfully', async () => {
      // Arrange
      const mockInsights: SellerInsightDto[] = [
        {
          seller: 'Seller 1',
          type: 'positive',
          metric: 'conversions',
          message: 'Seller 1 increased conversions by 20% compared to last month',
          change: 20.0,
        },
      ];

      mockSellersAnalyticsService.getSellerInsights.mockResolvedValue(mockInsights);

      // Act
      const result = await controller.getSellerInsights();

      // Assert
      expect(result).toEqual(mockInsights);
      expect(service.getSellerInsights).toHaveBeenCalledTimes(1);
      expect(service.getSellerInsights).toHaveBeenCalledWith();
    });
  });

  describe('getSellerAIFeedback', () => {
    it('should return seller AI feedback successfully', async () => {
      // Arrange
      const mockFeedback: SellerAIFeedbackDto[] = [
        {
          seller: 'Seller 1',
          recommendations: [
            'Focus on high-value clients',
            'Improve follow-up process',
          ],
        },
      ];

      mockSellersAnalyticsService.getSellerAIFeedback.mockResolvedValue(mockFeedback);

      // Act
      const result = await controller.getSellerAIFeedback();

      // Assert
      expect(result).toEqual(mockFeedback);
      expect(service.getSellerAIFeedback).toHaveBeenCalledTimes(1);
      expect(service.getSellerAIFeedback).toHaveBeenCalledWith();
    });
  });

  describe('getSellerTimelineInsight', () => {
    it('should return seller timeline insight with default month granularity', async () => {
      // Arrange
      const mockInsight = 'Seller performance shows increasing trends over time.';

      mockSellersAnalyticsService.getSellerTimelineInsight.mockResolvedValue(mockInsight);

      // Act
      const result = await controller.getSellerTimelineInsight({});

      // Assert
      expect(result).toEqual({ insight: mockInsight });
      expect(service.getSellerTimelineInsight).toHaveBeenCalledWith(GranularityEnum.MONTH);
    });

    it('should return seller timeline insight with week granularity', async () => {
      // Arrange
      const mockInsight = 'Weekly seller performance analysis.';

      mockSellersAnalyticsService.getSellerTimelineInsight.mockResolvedValue(mockInsight);

      // Act
      const result = await controller.getSellerTimelineInsight({ granularity: GranularityEnum.WEEK });

      // Assert
      expect(result).toEqual({ insight: mockInsight });
      expect(service.getSellerTimelineInsight).toHaveBeenCalledWith(GranularityEnum.WEEK);
    });
  });
});

