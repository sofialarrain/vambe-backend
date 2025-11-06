import { Test, TestingModule } from '@nestjs/testing';
import { IndustriesAnalyticsController } from './industries-analytics.controller';
import { IndustriesAnalyticsService } from './industries-analytics.service';
import { IndustryRankingDto, NewIndustriesLastMonthDto, IndustriesToWatchDto, InsightDto } from '../../common/dto/analytics';

describe('IndustriesAnalyticsController', () => {
  let controller: IndustriesAnalyticsController;
  let service: jest.Mocked<IndustriesAnalyticsService>;

  const mockIndustriesAnalyticsService = {
    getIndustriesDetailedRanking: jest.fn(),
    getNewIndustriesLastMonth: jest.fn(),
    getIndustriesToWatch: jest.fn(),
    getIndustryDistributionInsight: jest.fn(),
    getIndustryConversionInsight: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IndustriesAnalyticsController],
      providers: [
        {
          provide: IndustriesAnalyticsService,
          useValue: mockIndustriesAnalyticsService,
        },
      ],
    }).compile();

    controller = module.get<IndustriesAnalyticsController>(
      IndustriesAnalyticsController,
    );
    service = module.get(IndustriesAnalyticsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getIndustriesDetailedRanking', () => {
    it('should return industries detailed ranking successfully', async () => {
      // Arrange
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

      mockIndustriesAnalyticsService.getIndustriesDetailedRanking.mockResolvedValue(
        mockRanking,
      );

      // Act
      const result = await controller.getIndustriesDetailedRanking();

      // Assert
      expect(result).toEqual(mockRanking);
      expect(service.getIndustriesDetailedRanking).toHaveBeenCalledTimes(1);
      expect(service.getIndustriesDetailedRanking).toHaveBeenCalledWith();
    });

    it('should return empty array when no industries exist', async () => {
      // Arrange
      mockIndustriesAnalyticsService.getIndustriesDetailedRanking.mockResolvedValue(
        [],
      );

      // Act
      const result = await controller.getIndustriesDetailedRanking();

      // Assert
      expect(result).toEqual([]);
      expect(service.getIndustriesDetailedRanking).toHaveBeenCalledTimes(1);
    });

    it('should handle service errors', async () => {
      // Arrange
      const error = new Error('Database connection failed');
      mockIndustriesAnalyticsService.getIndustriesDetailedRanking.mockRejectedValue(
        error,
      );

      // Act & Assert
      await expect(controller.getIndustriesDetailedRanking()).rejects.toThrow(
        'Database connection failed',
      );
      expect(service.getIndustriesDetailedRanking).toHaveBeenCalledTimes(1);
    });
  });

  describe('getNewIndustriesLastMonth', () => {
    it('should return new industries from last month successfully', async () => {
      // Arrange
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

      mockIndustriesAnalyticsService.getNewIndustriesLastMonth.mockResolvedValue(
        mockNewIndustries,
      );

      // Act
      const result = await controller.getNewIndustriesLastMonth();

      // Assert
      expect(result).toEqual(mockNewIndustries);
      expect(result.industries).toBeDefined();
      expect(result.month).toBeDefined();
      expect(service.getNewIndustriesLastMonth).toHaveBeenCalledTimes(1);
      expect(service.getNewIndustriesLastMonth).toHaveBeenCalledWith();
    });

    it('should return empty industries array when no new industries exist', async () => {
      // Arrange
      const mockEmpty: NewIndustriesLastMonthDto = {
        industries: [],
        month: 'November 2024',
      };

      mockIndustriesAnalyticsService.getNewIndustriesLastMonth.mockResolvedValue(
        mockEmpty,
      );

      // Act
      const result = await controller.getNewIndustriesLastMonth();

      // Assert
      expect(result.industries).toEqual([]);
      expect(service.getNewIndustriesLastMonth).toHaveBeenCalledTimes(1);
    });

    it('should handle service errors', async () => {
      // Arrange
      const error = new Error('Service unavailable');
      mockIndustriesAnalyticsService.getNewIndustriesLastMonth.mockRejectedValue(
        error,
      );

      // Act & Assert
      await expect(controller.getNewIndustriesLastMonth()).rejects.toThrow(
        'Service unavailable',
      );
      expect(service.getNewIndustriesLastMonth).toHaveBeenCalledTimes(1);
    });
  });

  describe('getIndustriesToWatch', () => {
    it('should return industries to watch successfully', async () => {
      // Arrange
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

      mockIndustriesAnalyticsService.getIndustriesToWatch.mockResolvedValue(
        mockIndustriesToWatch,
      );

      // Act
      const result = await controller.getIndustriesToWatch();

      // Assert
      expect(result).toEqual(mockIndustriesToWatch);
      expect(result.expansionOpportunities).toBeDefined();
      expect(result.strategyNeeded).toBeDefined();
      expect(service.getIndustriesToWatch).toHaveBeenCalledTimes(1);
      expect(service.getIndustriesToWatch).toHaveBeenCalledWith();
    });

    it('should return empty arrays when no industries to watch', async () => {
      // Arrange
      const mockEmpty: IndustriesToWatchDto = {
        expansionOpportunities: [],
        strategyNeeded: [],
      };

      mockIndustriesAnalyticsService.getIndustriesToWatch.mockResolvedValue(
        mockEmpty,
      );

      // Act
      const result = await controller.getIndustriesToWatch();

      // Assert
      expect(result.expansionOpportunities).toEqual([]);
      expect(result.strategyNeeded).toEqual([]);
      expect(service.getIndustriesToWatch).toHaveBeenCalledTimes(1);
    });

    it('should handle service errors', async () => {
      // Arrange
      const error = new Error('Processing error');
      mockIndustriesAnalyticsService.getIndustriesToWatch.mockRejectedValue(
        error,
      );

      // Act & Assert
      await expect(controller.getIndustriesToWatch()).rejects.toThrow(
        'Processing error',
      );
      expect(service.getIndustriesToWatch).toHaveBeenCalledTimes(1);
    });
  });

  describe('getIndustryDistributionInsight', () => {
    it('should return industry distribution insight successfully', async () => {
      // Arrange
      const mockInsight: InsightDto = {
        insight: 'The client base shows diverse industry representation with Technology being the most prominent sector.',
      };

      mockIndustriesAnalyticsService.getIndustryDistributionInsight.mockResolvedValue(
        mockInsight,
      );

      // Act
      const result = await controller.getIndustryDistributionInsight();

      // Assert
      expect(result).toEqual(mockInsight);
      expect(result.insight).toBeDefined();
      expect(service.getIndustryDistributionInsight).toHaveBeenCalledTimes(1);
      expect(service.getIndustryDistributionInsight).toHaveBeenCalledWith();
    });

    it('should handle service errors gracefully', async () => {
      // Arrange
      const mockErrorInsight: InsightDto = {
        insight: 'Unable to generate insight at this time.',
      };

      mockIndustriesAnalyticsService.getIndustryDistributionInsight.mockResolvedValue(
        mockErrorInsight,
      );

      // Act
      const result = await controller.getIndustryDistributionInsight();

      // Assert
      expect(result.insight).toContain('Unable to generate insight');
      expect(service.getIndustryDistributionInsight).toHaveBeenCalledTimes(1);
    });
  });

  describe('getIndustryConversionInsight', () => {
    it('should return industry conversion insight successfully', async () => {
      // Arrange
      const mockInsight: InsightDto = {
        insight: 'Technology industry shows the highest conversion rate at 60%, indicating strong performance in this sector.',
      };

      mockIndustriesAnalyticsService.getIndustryConversionInsight.mockResolvedValue(
        mockInsight,
      );

      // Act
      const result = await controller.getIndustryConversionInsight();

      // Assert
      expect(result).toEqual(mockInsight);
      expect(result.insight).toBeDefined();
      expect(service.getIndustryConversionInsight).toHaveBeenCalledTimes(1);
      expect(service.getIndustryConversionInsight).toHaveBeenCalledWith();
    });

    it('should handle service errors gracefully', async () => {
      // Arrange
      const mockErrorInsight: InsightDto = {
        insight: 'Unable to generate insight at this time.',
      };

      mockIndustriesAnalyticsService.getIndustryConversionInsight.mockResolvedValue(
        mockErrorInsight,
      );

      // Act
      const result = await controller.getIndustryConversionInsight();

      // Assert
      expect(result.insight).toContain('Unable to generate insight');
      expect(service.getIndustryConversionInsight).toHaveBeenCalledTimes(1);
    });
  });
});

