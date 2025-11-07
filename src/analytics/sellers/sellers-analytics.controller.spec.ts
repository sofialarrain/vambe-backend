import { Test, TestingModule } from '@nestjs/testing';
import { SellersAnalyticsController } from './sellers-analytics.controller';
import { SellersMetricsService } from './services/sellers-metrics.service';
import { SellersRankingsService } from './services/sellers-rankings.service';
import { SellersTimelineService } from './services/sellers-timeline.service';
import { SellersCorrelationsService } from './services/sellers-correlations.service';
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
  let sellersMetricsService: jest.Mocked<SellersMetricsService>;
  let sellersRankingsService: jest.Mocked<SellersRankingsService>;
  let sellersTimelineService: jest.Mocked<SellersTimelineService>;
  let sellersCorrelationsService: jest.Mocked<SellersCorrelationsService>;

  const mockSellersMetricsService = {
    getSellerMetrics: jest.fn(),
  };

  const mockSellersRankingsService = {
    getSellerOfWeek: jest.fn(),
    getAnnualSellerRanking: jest.fn(),
  };

  const mockSellersTimelineService = {
    getSellersTimeline: jest.fn(),
  };

  const mockSellersCorrelationsService = {
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
          provide: SellersMetricsService,
          useValue: mockSellersMetricsService,
        },
        {
          provide: SellersRankingsService,
          useValue: mockSellersRankingsService,
        },
        {
          provide: SellersTimelineService,
          useValue: mockSellersTimelineService,
        },
        {
          provide: SellersCorrelationsService,
          useValue: mockSellersCorrelationsService,
        },
      ],
    }).compile();

    controller = module.get<SellersAnalyticsController>(SellersAnalyticsController);
    sellersMetricsService = module.get(SellersMetricsService);
    sellersRankingsService = module.get(SellersRankingsService);
    sellersTimelineService = module.get(SellersTimelineService);
    sellersCorrelationsService = module.get(SellersCorrelationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getSellerMetrics', () => {
    it('should return seller metrics successfully', async () => {
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

      mockSellersMetricsService.getSellerMetrics.mockResolvedValue(mockMetrics);

      const result = await controller.getSellerMetrics();

      expect(result).toEqual(mockMetrics);
      expect(result.length).toBe(2);
      expect(sellersMetricsService.getSellerMetrics).toHaveBeenCalledTimes(1);
      expect(sellersMetricsService.getSellerMetrics).toHaveBeenCalledWith();
    });
  });

  describe('getSellerOfWeek', () => {
    it('should return seller of the week with default current week', async () => {
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

      mockSellersRankingsService.getSellerOfWeek.mockResolvedValue(mockWeekPodium);

      const result = await controller.getSellerOfWeek({});

      expect(result).toEqual(mockWeekPodium);
      expect(sellersRankingsService.getSellerOfWeek).toHaveBeenCalledTimes(1);
      expect(sellersRankingsService.getSellerOfWeek).toHaveBeenCalledWith(undefined, undefined);
    });

    it('should return seller of the week with specific week and year', async () => {
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

      mockSellersRankingsService.getSellerOfWeek.mockResolvedValue(mockWeekPodium);

      const result = await controller.getSellerOfWeek({
        weekStart: '2024-01-01',
        year: 2024,
      });

      expect(result).toEqual(mockWeekPodium);
      expect(sellersRankingsService.getSellerOfWeek).toHaveBeenCalledWith('2024-01-01', 2024);
    });
  });

  describe('getAnnualSellerRanking', () => {
    it('should return annual seller ranking with default year', async () => {
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

      mockSellersRankingsService.getAnnualSellerRanking.mockResolvedValue(mockRanking);

      const result = await controller.getAnnualSellerRanking({});

      expect(result).toEqual(mockRanking);
      expect(sellersRankingsService.getAnnualSellerRanking).toHaveBeenCalledTimes(1);
      expect(sellersRankingsService.getAnnualSellerRanking).toHaveBeenCalledWith(undefined);
    });

    it('should return annual seller ranking with specific year', async () => {
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

      mockSellersRankingsService.getAnnualSellerRanking.mockResolvedValue(mockRanking);

      const result = await controller.getAnnualSellerRanking({ year: 2023 });

      expect(result).toEqual(mockRanking);
      expect(sellersRankingsService.getAnnualSellerRanking).toHaveBeenCalledWith(2023);
    });
  });

  describe('getSellersTimeline', () => {
    it('should return sellers timeline with default week granularity', async () => {
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

      mockSellersTimelineService.getSellersTimeline.mockResolvedValue(mockTimeline);

      const result = await controller.getSellersTimeline({});

      expect(result).toEqual(mockTimeline);
      expect(sellersTimelineService.getSellersTimeline).toHaveBeenCalledWith(GranularityEnum.WEEK);
    });

    it('should return sellers timeline with month granularity', async () => {
      const mockTimeline: SellerTimelineDataDto[] = [
        {
          period: '2024-01',
          sellers: {
            'Seller 1': 20,
            'Seller 2': 15,
          },
        },
      ];

      mockSellersTimelineService.getSellersTimeline.mockResolvedValue(mockTimeline);

      const result = await controller.getSellersTimeline({ granularity: GranularityEnum.MONTH });

      expect(result).toEqual(mockTimeline);
      expect(sellersTimelineService.getSellersTimeline).toHaveBeenCalledWith(GranularityEnum.MONTH);
    });
  });

  describe('getSellerCorrelations', () => {
    it('should return seller correlations successfully', async () => {
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

      mockSellersCorrelationsService.getSellerCorrelations.mockResolvedValue(mockCorrelations);

      const result = await controller.getSellerCorrelations();

      expect(result).toEqual(mockCorrelations);
      expect(sellersCorrelationsService.getSellerCorrelations).toHaveBeenCalledTimes(1);
      expect(sellersCorrelationsService.getSellerCorrelations).toHaveBeenCalledWith();
    });
  });

  describe('getSellerCorrelationInsights', () => {
    it('should return seller correlation insights successfully', async () => {
      const mockInsights: Record<string, string> = {
        'Seller 1': 'Seller 1 shows strong performance with Technology clients.',
        'Seller 2': 'No significant correlations identified yet.',
      };

      mockSellersCorrelationsService.getSellerCorrelationInsights.mockResolvedValue(mockInsights);

      const result = await controller.getSellerCorrelationInsights();

      expect(result).toEqual(mockInsights);
      expect(sellersCorrelationsService.getSellerCorrelationInsights).toHaveBeenCalledTimes(1);
      expect(sellersCorrelationsService.getSellerCorrelationInsights).toHaveBeenCalledWith();
    });
  });

  describe('getSellerInsights', () => {
    it('should return seller insights successfully', async () => {
      const mockInsights: SellerInsightDto[] = [
        {
          seller: 'Seller 1',
          type: 'positive',
          metric: 'conversions',
          message: 'Seller 1 increased conversions by 20% compared to last month',
          change: 20.0,
        },
      ];

      mockSellersCorrelationsService.getSellerInsights.mockResolvedValue(mockInsights);

      const result = await controller.getSellerInsights();

      expect(result).toEqual(mockInsights);
      expect(sellersCorrelationsService.getSellerInsights).toHaveBeenCalledTimes(1);
      expect(sellersCorrelationsService.getSellerInsights).toHaveBeenCalledWith();
    });
  });

  describe('getSellerAIFeedback', () => {
    it('should return seller AI feedback successfully', async () => {
      const mockFeedback: SellerAIFeedbackDto[] = [
        {
          seller: 'Seller 1',
          recommendations: [
            'Focus on high-value clients',
            'Improve follow-up process',
          ],
        },
      ];

      mockSellersCorrelationsService.getSellerAIFeedback.mockResolvedValue(mockFeedback);

      const result = await controller.getSellerAIFeedback();

      expect(result).toEqual(mockFeedback);
      expect(sellersCorrelationsService.getSellerAIFeedback).toHaveBeenCalledTimes(1);
      expect(sellersCorrelationsService.getSellerAIFeedback).toHaveBeenCalledWith();
    });
  });

  describe('getSellerTimelineInsight', () => {
    it('should return seller timeline insight with default month granularity', async () => {
      const mockInsight = 'Seller performance shows increasing trends over time.';

      mockSellersCorrelationsService.getSellerTimelineInsight.mockResolvedValue(mockInsight);

      const result = await controller.getSellerTimelineInsight({});

      expect(result).toEqual({ insight: mockInsight });
      expect(sellersCorrelationsService.getSellerTimelineInsight).toHaveBeenCalledWith(GranularityEnum.MONTH);
    });

    it('should return seller timeline insight with week granularity', async () => {
      const mockInsight = 'Weekly seller performance analysis.';

      mockSellersCorrelationsService.getSellerTimelineInsight.mockResolvedValue(mockInsight);

      const result = await controller.getSellerTimelineInsight({ granularity: GranularityEnum.WEEK });

      expect(result).toEqual({ insight: mockInsight });
      expect(sellersCorrelationsService.getSellerTimelineInsight).toHaveBeenCalledWith(GranularityEnum.WEEK);
    });
  });
});

