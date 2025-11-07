import { Test, TestingModule } from '@nestjs/testing';
import { IndustriesAnalyticsController } from './industries-analytics.controller';
import { IndustriesRankingService } from './services/industries-ranking.service';
import { IndustriesAnalysisService } from './services/industries-analysis.service';
import { IndustriesInsightsService } from './services/industries-insights.service';
import {
  IndustryRankingDto,
  NewIndustriesLastMonthDto,
  IndustriesToWatchDto,
  InsightDto,
} from '../../common/dto/analytics';

describe('IndustriesAnalyticsController', () => {
  let controller: IndustriesAnalyticsController;
  let industriesRankingService: jest.Mocked<IndustriesRankingService>;
  let industriesAnalysisService: jest.Mocked<IndustriesAnalysisService>;
  let industriesInsightsService: jest.Mocked<IndustriesInsightsService>;

  const mockIndustriesRankingService = {
    getIndustriesDetailedRanking: jest.fn(),
    getNewIndustriesLastMonth: jest.fn(),
  };

  const mockIndustriesAnalysisService = {
    getIndustriesToWatch: jest.fn(),
  };

  const mockIndustriesInsightsService = {
    getIndustryDistributionInsight: jest.fn(),
    getIndustryConversionInsight: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IndustriesAnalyticsController],
      providers: [
        {
          provide: IndustriesRankingService,
          useValue: mockIndustriesRankingService,
        },
        {
          provide: IndustriesAnalysisService,
          useValue: mockIndustriesAnalysisService,
        },
        {
          provide: IndustriesInsightsService,
          useValue: mockIndustriesInsightsService,
        },
      ],
    }).compile();

    controller = module.get<IndustriesAnalyticsController>(
      IndustriesAnalyticsController,
    );
    industriesRankingService = module.get(IndustriesRankingService);
    industriesAnalysisService = module.get(IndustriesAnalysisService);
    industriesInsightsService = module.get(IndustriesInsightsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getIndustriesDetailedRanking', () => {
    it('should return industries detailed ranking successfully', async () => {
      const mockRanking: IndustryRankingDto[] = [
        {
          industry: 'Technology',
          clients: 10,
          closed: 6,
          conversionRate: 60.0,
          averageSentiment: 'positive',
          averageUrgency: 'immediate',
        },
        {
          industry: 'Finance',
          clients: 8,
          closed: 4,
          conversionRate: 50.0,
          averageSentiment: 'neutral',
          averageUrgency: 'planned',
        },
      ];

      mockIndustriesRankingService.getIndustriesDetailedRanking.mockResolvedValue(mockRanking);

      const result = await controller.getIndustriesDetailedRanking();

      expect(result).toEqual(mockRanking);
      expect(industriesRankingService.getIndustriesDetailedRanking).toHaveBeenCalledTimes(1);
      expect(industriesRankingService.getIndustriesDetailedRanking).toHaveBeenCalledWith();
    });

    it('should return empty array when no industries exist', async () => {
      mockIndustriesRankingService.getIndustriesDetailedRanking.mockResolvedValue([]);

      const result = await controller.getIndustriesDetailedRanking();

      expect(result).toEqual([]);
      expect(industriesRankingService.getIndustriesDetailedRanking).toHaveBeenCalledTimes(1);
    });

    it('should handle service errors', async () => {
      const error = new Error('Database connection failed');
      mockIndustriesRankingService.getIndustriesDetailedRanking.mockRejectedValue(error);

      await expect(controller.getIndustriesDetailedRanking()).rejects.toThrow(
        'Database connection failed',
      );
      expect(industriesRankingService.getIndustriesDetailedRanking).toHaveBeenCalledTimes(1);
    });
  });

  describe('getNewIndustriesLastMonth', () => {
    it('should return new industries from last month successfully', async () => {
      const mockNewIndustries: NewIndustriesLastMonthDto = {
        industries: [
          {
            industry: 'Healthcare',
            clients: 5,
            closed: 3,
            conversionRate: 60.0,
          },
        ],
        month: 'November 2024',
      };

      mockIndustriesRankingService.getNewIndustriesLastMonth.mockResolvedValue(mockNewIndustries);

      const result = await controller.getNewIndustriesLastMonth();

      expect(result).toEqual(mockNewIndustries);
      expect(result.industries).toBeDefined();
      expect(result.month).toBeDefined();
      expect(industriesRankingService.getNewIndustriesLastMonth).toHaveBeenCalledTimes(1);
      expect(industriesRankingService.getNewIndustriesLastMonth).toHaveBeenCalledWith();
    });

    it('should return empty industries array when no new industries exist', async () => {
      const mockEmpty: NewIndustriesLastMonthDto = {
        industries: [],
        month: 'November 2024',
      };

      mockIndustriesRankingService.getNewIndustriesLastMonth.mockResolvedValue(mockEmpty);

      const result = await controller.getNewIndustriesLastMonth();

      expect(result.industries).toEqual([]);
      expect(industriesRankingService.getNewIndustriesLastMonth).toHaveBeenCalledTimes(1);
    });

    it('should handle service errors', async () => {
      const error = new Error('Service unavailable');
      mockIndustriesRankingService.getNewIndustriesLastMonth.mockRejectedValue(error);

      await expect(controller.getNewIndustriesLastMonth()).rejects.toThrow('Service unavailable');
      expect(industriesRankingService.getNewIndustriesLastMonth).toHaveBeenCalledTimes(1);
    });
  });

  describe('getIndustriesToWatch', () => {
    it('should return industries to watch successfully', async () => {
      const mockIndustriesToWatch: IndustriesToWatchDto = {
        expansionOpportunities: [
          {
            industry: 'Education',
            clients: 3,
            closed: 2,
            conversionRate: 66.67,
          },
        ],
        strategyNeeded: [
          {
            industry: 'Retail',
            clients: 15,
            closed: 3,
            conversionRate: 20.0,
          },
        ],
      };

      mockIndustriesAnalysisService.getIndustriesToWatch.mockResolvedValue(mockIndustriesToWatch);

      const result = await controller.getIndustriesToWatch();

      expect(result).toEqual(mockIndustriesToWatch);
      expect(result.expansionOpportunities).toBeDefined();
      expect(result.strategyNeeded).toBeDefined();
      expect(industriesAnalysisService.getIndustriesToWatch).toHaveBeenCalledTimes(1);
      expect(industriesAnalysisService.getIndustriesToWatch).toHaveBeenCalledWith();
    });

    it('should return empty arrays when no industries to watch', async () => {
      const mockEmpty: IndustriesToWatchDto = {
        expansionOpportunities: [],
        strategyNeeded: [],
      };

      mockIndustriesAnalysisService.getIndustriesToWatch.mockResolvedValue(mockEmpty);

      const result = await controller.getIndustriesToWatch();

      expect(result.expansionOpportunities).toEqual([]);
      expect(result.strategyNeeded).toEqual([]);
      expect(industriesAnalysisService.getIndustriesToWatch).toHaveBeenCalledTimes(1);
    });

    it('should handle service errors', async () => {
      const error = new Error('Processing error');
      mockIndustriesAnalysisService.getIndustriesToWatch.mockRejectedValue(error);

      await expect(controller.getIndustriesToWatch()).rejects.toThrow('Processing error');
      expect(industriesAnalysisService.getIndustriesToWatch).toHaveBeenCalledTimes(1);
    });
  });

  describe('getIndustryDistributionInsight', () => {
    it('should return industry distribution insight successfully', async () => {
      const mockInsight: InsightDto = {
        insight: 'The client base shows diverse industry representation with Technology being the most prominent sector.',
      };

      mockIndustriesInsightsService.getIndustryDistributionInsight.mockResolvedValue(mockInsight);

      const result = await controller.getIndustryDistributionInsight();

      expect(result).toEqual(mockInsight);
      expect(result.insight).toBeDefined();
      expect(industriesInsightsService.getIndustryDistributionInsight).toHaveBeenCalledTimes(1);
      expect(industriesInsightsService.getIndustryDistributionInsight).toHaveBeenCalledWith();
    });

    it('should handle service errors gracefully', async () => {
      const mockErrorInsight: InsightDto = {
        insight: 'Unable to generate insight at this time.',
      };

      mockIndustriesInsightsService.getIndustryDistributionInsight.mockResolvedValue(
        mockErrorInsight,
      );

      const result = await controller.getIndustryDistributionInsight();

      expect(result.insight).toContain('Unable to generate insight');
      expect(industriesInsightsService.getIndustryDistributionInsight).toHaveBeenCalledTimes(1);
    });
  });

  describe('getIndustryConversionInsight', () => {
    it('should return industry conversion insight successfully', async () => {
      const mockInsight: InsightDto = {
        insight: 'Technology industry shows the highest conversion rate at 60%, indicating strong performance in this sector.',
      };

      mockIndustriesInsightsService.getIndustryConversionInsight.mockResolvedValue(mockInsight);

      const result = await controller.getIndustryConversionInsight();

      expect(result).toEqual(mockInsight);
      expect(result.insight).toBeDefined();
      expect(industriesInsightsService.getIndustryConversionInsight).toHaveBeenCalledTimes(1);
      expect(industriesInsightsService.getIndustryConversionInsight).toHaveBeenCalledWith();
    });

    it('should handle service errors gracefully', async () => {
      const mockErrorInsight: InsightDto = {
        insight: 'Unable to generate insight at this time.',
      };

      mockIndustriesInsightsService.getIndustryConversionInsight.mockResolvedValue(
        mockErrorInsight,
      );

      const result = await controller.getIndustryConversionInsight();

      expect(result.insight).toContain('Unable to generate insight');
      expect(industriesInsightsService.getIndustryConversionInsight).toHaveBeenCalledTimes(1);
    });
  });
});

