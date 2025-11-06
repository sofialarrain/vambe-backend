import { Test, TestingModule } from '@nestjs/testing';
import { InsightsController } from './insights.controller';
import { InsightsService } from './insights.service';
import { InsightDto, TimelineInsightDto, ClientPerceptionInsightDto } from '../../common/dto/analytics';

describe('InsightsController', () => {
  let controller: InsightsController;
  let service: jest.Mocked<InsightsService>;

  const mockInsightsService = {
    getVolumeVsConversionInsight: jest.fn(),
    getPainPointsInsight: jest.fn(),
    getClientPerceptionInsight: jest.fn(),
    getClientSolutionsInsight: jest.fn(),
    getTimelineInsight: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InsightsController],
      providers: [
        {
          provide: InsightsService,
          useValue: mockInsightsService,
        },
      ],
    }).compile();

    controller = module.get<InsightsController>(InsightsController);
    service = module.get(InsightsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getVolumeVsConversionInsight', () => {
    it('should return volume vs conversion insight successfully', async () => {
      // Arrange
      const mockInsight: InsightDto = {
        insight: 'Higher interaction volumes correlate with better conversion rates.',
      };

      mockInsightsService.getVolumeVsConversionInsight.mockResolvedValue(mockInsight);

      // Act
      const result = await controller.getVolumeVsConversionInsight();

      // Assert
      expect(result).toEqual(mockInsight);
      expect(result.insight).toBeDefined();
      expect(service.getVolumeVsConversionInsight).toHaveBeenCalledTimes(1);
      expect(service.getVolumeVsConversionInsight).toHaveBeenCalledWith();
    });

    it('should handle service errors gracefully', async () => {
      // Arrange
      const mockErrorInsight: InsightDto = {
        insight: 'Unable to generate insight at this time.',
      };

      mockInsightsService.getVolumeVsConversionInsight.mockResolvedValue(mockErrorInsight);

      // Act
      const result = await controller.getVolumeVsConversionInsight();

      // Assert
      expect(result.insight).toContain('Unable to generate insight');
      expect(service.getVolumeVsConversionInsight).toHaveBeenCalledTimes(1);
    });
  });

  describe('getPainPointsInsight', () => {
    it('should return pain points insight successfully', async () => {
      // Arrange
      const mockInsight: InsightDto = {
        insight: 'High workload is the most significant pain point affecting conversion rates.',
      };

      mockInsightsService.getPainPointsInsight.mockResolvedValue(mockInsight);

      // Act
      const result = await controller.getPainPointsInsight();

      // Assert
      expect(result).toEqual(mockInsight);
      expect(result.insight).toBeDefined();
      expect(service.getPainPointsInsight).toHaveBeenCalledTimes(1);
      expect(service.getPainPointsInsight).toHaveBeenCalledWith();
    });

    it('should handle service errors gracefully', async () => {
      // Arrange
      const mockErrorInsight: InsightDto = {
        insight: 'Unable to generate insight at this time.',
      };

      mockInsightsService.getPainPointsInsight.mockResolvedValue(mockErrorInsight);

      // Act
      const result = await controller.getPainPointsInsight();

      // Assert
      expect(result.insight).toContain('Unable to generate insight');
      expect(service.getPainPointsInsight).toHaveBeenCalledTimes(1);
    });
  });

  describe('getClientPerceptionInsight', () => {
    it('should return client perception insight successfully', async () => {
      // Arrange
      const mockInsight: ClientPerceptionInsightDto = {
        positiveAspects: 'Clients appreciate the automation capabilities.',
        concerns: 'Some clients express concerns about integration complexity.',
        successFactors: 'Closed deals show higher engagement levels.',
        recommendations: 'Focus on simplifying the integration process.',
      };

      mockInsightsService.getClientPerceptionInsight.mockResolvedValue(mockInsight);

      // Act
      const result = await controller.getClientPerceptionInsight();

      // Assert
      expect(result).toEqual(mockInsight);
      expect(result.positiveAspects).toBeDefined();
      expect(result.concerns).toBeDefined();
      expect(result.successFactors).toBeDefined();
      expect(result.recommendations).toBeDefined();
      expect(service.getClientPerceptionInsight).toHaveBeenCalledTimes(1);
      expect(service.getClientPerceptionInsight).toHaveBeenCalledWith();
    });

    it('should handle service errors gracefully', async () => {
      // Arrange
      const mockErrorInsight: ClientPerceptionInsightDto = {
        positiveAspects: 'Unable to generate analysis at this time.',
        concerns: 'Unable to generate analysis at this time.',
        successFactors: 'Unable to generate analysis at this time.',
        recommendations: 'Unable to generate analysis at this time.',
      };

      mockInsightsService.getClientPerceptionInsight.mockResolvedValue(mockErrorInsight);

      // Act
      const result = await controller.getClientPerceptionInsight();

      // Assert
      expect(result.positiveAspects).toContain('Unable to generate');
      expect(service.getClientPerceptionInsight).toHaveBeenCalledTimes(1);
    });
  });

  describe('getClientSolutionsInsight', () => {
    it('should return client solutions insight successfully', async () => {
      // Arrange
      const mockInsight: InsightDto = {
        insight: 'Clients are seeking automation and efficiency improvements.',
      };

      mockInsightsService.getClientSolutionsInsight.mockResolvedValue(mockInsight);

      // Act
      const result = await controller.getClientSolutionsInsight();

      // Assert
      expect(result).toEqual(mockInsight);
      expect(result.insight).toBeDefined();
      expect(service.getClientSolutionsInsight).toHaveBeenCalledTimes(1);
      expect(service.getClientSolutionsInsight).toHaveBeenCalledWith();
    });

    it('should handle service errors gracefully', async () => {
      // Arrange
      const mockErrorInsight: InsightDto = {
        insight: 'Unable to generate insight at this time.',
      };

      mockInsightsService.getClientSolutionsInsight.mockResolvedValue(mockErrorInsight);

      // Act
      const result = await controller.getClientSolutionsInsight();

      // Assert
      expect(result.insight).toContain('Unable to generate insight');
      expect(service.getClientSolutionsInsight).toHaveBeenCalledTimes(1);
    });
  });

  describe('getTimelineInsight', () => {
    it('should return timeline insight successfully', async () => {
      // Arrange
      const mockInsight: TimelineInsightDto = {
        keyFindings: ['Conversion rates improved over time'],
        reasons: ['Better client engagement'],
        recommendations: ['Continue current strategy'],
      };

      mockInsightsService.getTimelineInsight.mockResolvedValue(mockInsight);

      // Act
      const result = await controller.getTimelineInsight();

      // Assert
      expect(result).toEqual(mockInsight);
      expect(result.keyFindings).toBeDefined();
      expect(result.reasons).toBeDefined();
      expect(result.recommendations).toBeDefined();
      expect(service.getTimelineInsight).toHaveBeenCalledTimes(1);
      expect(service.getTimelineInsight).toHaveBeenCalledWith();
    });

    it('should handle service errors gracefully', async () => {
      // Arrange
      const mockErrorInsight: TimelineInsightDto = {
        keyFindings: ['Unable to generate timeline insights at this time.'],
        reasons: [],
        recommendations: [],
      };

      mockInsightsService.getTimelineInsight.mockResolvedValue(mockErrorInsight);

      // Act
      const result = await controller.getTimelineInsight();

      // Assert
      expect(result.keyFindings.some(item => item.includes('Unable to generate'))).toBe(true);
      expect(service.getTimelineInsight).toHaveBeenCalledTimes(1);
    });
  });
});

