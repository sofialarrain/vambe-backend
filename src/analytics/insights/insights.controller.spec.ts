import { Test, TestingModule } from '@nestjs/testing';
import { InsightsController } from './insights.controller';
import { AnalyticsInsightsService } from './services/analytics-insights.service';
import { ClientInsightsService } from './services/client-insights.service';
import { TimelineInsightsService } from './services/timeline-insights.service';
import {
  InsightDto,
  TimelineInsightDto,
  ClientPerceptionInsightDto,
} from '../../common/dto/analytics';

describe('InsightsController', () => {
  let controller: InsightsController;
  let analyticsInsightsService: jest.Mocked<AnalyticsInsightsService>;
  let clientInsightsService: jest.Mocked<ClientInsightsService>;
  let timelineInsightsService: jest.Mocked<TimelineInsightsService>;

  const mockAnalyticsInsightsService = {
    getVolumeVsConversionInsight: jest.fn(),
    getPainPointsInsight: jest.fn(),
  };

  const mockClientInsightsService = {
    getClientPerceptionInsight: jest.fn(),
    getClientSolutionsInsight: jest.fn(),
  };

  const mockTimelineInsightsService = {
    getTimelineInsight: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InsightsController],
      providers: [
        {
          provide: AnalyticsInsightsService,
          useValue: mockAnalyticsInsightsService,
        },
        {
          provide: ClientInsightsService,
          useValue: mockClientInsightsService,
        },
        {
          provide: TimelineInsightsService,
          useValue: mockTimelineInsightsService,
        },
      ],
    }).compile();

    controller = module.get<InsightsController>(InsightsController);
    analyticsInsightsService = module.get(AnalyticsInsightsService);
    clientInsightsService = module.get(ClientInsightsService);
    timelineInsightsService = module.get(TimelineInsightsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getVolumeVsConversionInsight', () => {
    it('should return volume vs conversion insight successfully', async () => {
      const mockInsight: InsightDto = {
        insight: 'Higher interaction volumes correlate with better conversion rates.',
      };

      mockAnalyticsInsightsService.getVolumeVsConversionInsight.mockResolvedValue(mockInsight);

      const result = await controller.getVolumeVsConversionInsight();

      expect(result).toEqual(mockInsight);
      expect(result.insight).toBeDefined();
      expect(analyticsInsightsService.getVolumeVsConversionInsight).toHaveBeenCalledTimes(1);
      expect(analyticsInsightsService.getVolumeVsConversionInsight).toHaveBeenCalledWith();
    });

    it('should handle service errors gracefully', async () => {
      const mockErrorInsight: InsightDto = {
        insight: 'Unable to generate insight at this time.',
      };

      mockAnalyticsInsightsService.getVolumeVsConversionInsight.mockResolvedValue(mockErrorInsight);

      const result = await controller.getVolumeVsConversionInsight();

      expect(result.insight).toContain('Unable to generate insight');
      expect(analyticsInsightsService.getVolumeVsConversionInsight).toHaveBeenCalledTimes(1);
    });
  });

  describe('getPainPointsInsight', () => {
    it('should return pain points insight successfully', async () => {
      const mockInsight: InsightDto = {
        insight: 'High workload is the most significant pain point affecting conversion rates.',
      };

      mockAnalyticsInsightsService.getPainPointsInsight.mockResolvedValue(mockInsight);

      const result = await controller.getPainPointsInsight();

      expect(result).toEqual(mockInsight);
      expect(result.insight).toBeDefined();
      expect(analyticsInsightsService.getPainPointsInsight).toHaveBeenCalledTimes(1);
      expect(analyticsInsightsService.getPainPointsInsight).toHaveBeenCalledWith();
    });

    it('should handle service errors gracefully', async () => {
      const mockErrorInsight: InsightDto = {
        insight: 'Unable to generate insight at this time.',
      };

      mockAnalyticsInsightsService.getPainPointsInsight.mockResolvedValue(mockErrorInsight);

      const result = await controller.getPainPointsInsight();

      expect(result.insight).toContain('Unable to generate insight');
      expect(analyticsInsightsService.getPainPointsInsight).toHaveBeenCalledTimes(1);
    });
  });

  describe('getClientPerceptionInsight', () => {
    it('should return client perception insight successfully', async () => {
      const mockInsight: ClientPerceptionInsightDto = {
        positiveAspects: 'Clients appreciate the automation capabilities.',
        concerns: 'Some clients express concerns about integration complexity.',
        successFactors: 'Closed deals show higher engagement levels.',
        recommendations: 'Focus on simplifying the integration process.',
      };

      mockClientInsightsService.getClientPerceptionInsight.mockResolvedValue(mockInsight);

      const result = await controller.getClientPerceptionInsight();

      expect(result).toEqual(mockInsight);
      expect(result.positiveAspects).toBeDefined();
      expect(result.concerns).toBeDefined();
      expect(result.successFactors).toBeDefined();
      expect(result.recommendations).toBeDefined();
      expect(clientInsightsService.getClientPerceptionInsight).toHaveBeenCalledTimes(1);
      expect(clientInsightsService.getClientPerceptionInsight).toHaveBeenCalledWith();
    });

    it('should handle service errors gracefully', async () => {
      const mockErrorInsight: ClientPerceptionInsightDto = {
        positiveAspects: 'Unable to generate analysis at this time.',
        concerns: 'Unable to generate analysis at this time.',
        successFactors: 'Unable to generate analysis at this time.',
        recommendations: 'Unable to generate analysis at this time.',
      };

      mockClientInsightsService.getClientPerceptionInsight.mockResolvedValue(mockErrorInsight);

      const result = await controller.getClientPerceptionInsight();

      expect(result.positiveAspects).toContain('Unable to generate');
      expect(clientInsightsService.getClientPerceptionInsight).toHaveBeenCalledTimes(1);
    });
  });

  describe('getClientSolutionsInsight', () => {
    it('should return client solutions insight successfully', async () => {
      const mockInsight: InsightDto = {
        insight: 'Clients are seeking automation and efficiency improvements.',
      };

      mockClientInsightsService.getClientSolutionsInsight.mockResolvedValue(mockInsight);

      const result = await controller.getClientSolutionsInsight();

      expect(result).toEqual(mockInsight);
      expect(result.insight).toBeDefined();
      expect(clientInsightsService.getClientSolutionsInsight).toHaveBeenCalledTimes(1);
      expect(clientInsightsService.getClientSolutionsInsight).toHaveBeenCalledWith();
    });

    it('should handle service errors gracefully', async () => {
      const mockErrorInsight: InsightDto = {
        insight: 'Unable to generate insight at this time.',
      };

      mockClientInsightsService.getClientSolutionsInsight.mockResolvedValue(mockErrorInsight);

      const result = await controller.getClientSolutionsInsight();

      expect(result.insight).toContain('Unable to generate insight');
      expect(clientInsightsService.getClientSolutionsInsight).toHaveBeenCalledTimes(1);
    });
  });

  describe('getTimelineInsight', () => {
    it('should return timeline insight successfully', async () => {
      const mockInsight: TimelineInsightDto = {
        keyFindings: ['Conversion rates improved over time'],
        reasons: ['Better client engagement'],
        recommendations: ['Continue current strategy'],
      };

      mockTimelineInsightsService.getTimelineInsight.mockResolvedValue(mockInsight);

      const result = await controller.getTimelineInsight();

      expect(result).toEqual(mockInsight);
      expect(result.keyFindings).toBeDefined();
      expect(result.reasons).toBeDefined();
      expect(result.recommendations).toBeDefined();
      expect(timelineInsightsService.getTimelineInsight).toHaveBeenCalledTimes(1);
      expect(timelineInsightsService.getTimelineInsight).toHaveBeenCalledWith();
    });

    it('should handle service errors gracefully', async () => {
      const mockErrorInsight: TimelineInsightDto = {
        keyFindings: ['Unable to generate timeline insights at this time.'],
        reasons: [],
        recommendations: [],
      };

      mockTimelineInsightsService.getTimelineInsight.mockResolvedValue(mockErrorInsight);

      const result = await controller.getTimelineInsight();

      expect(result.keyFindings.some((item) => item.includes('Unable to generate'))).toBe(true);
      expect(timelineInsightsService.getTimelineInsight).toHaveBeenCalledTimes(1);
    });
  });
});

