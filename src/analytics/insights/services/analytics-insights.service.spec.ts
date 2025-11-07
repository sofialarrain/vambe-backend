import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsInsightsService } from './analytics-insights.service';
import { AnalyticsInsightsGeneratorService } from '../../../llm/generators/analytics-insights-generator.service';
import { PainPointsService } from '../../pain-points/pain-points.service';
import { InsightDto } from '../../../common/dto/analytics';

describe('AnalyticsInsightsService', () => {
  let service: AnalyticsInsightsService;
  let analyticsInsightsGenerator: jest.Mocked<AnalyticsInsightsGeneratorService>;
  let painPointsService: jest.Mocked<PainPointsService>;

  const mockAnalyticsInsightsGenerator = {
    generateVolumeVsConversionInsight: jest.fn(),
    generatePainPointsInsight: jest.fn(),
  };

  const mockPainPointsService = {
    getVolumeVsConversion: jest.fn(),
    getTopPainPoints: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsInsightsService,
        {
          provide: AnalyticsInsightsGeneratorService,
          useValue: mockAnalyticsInsightsGenerator,
        },
        {
          provide: PainPointsService,
          useValue: mockPainPointsService,
        },
      ],
    }).compile();

    service = module.get<AnalyticsInsightsService>(AnalyticsInsightsService);
    analyticsInsightsGenerator = module.get(AnalyticsInsightsGeneratorService);
    painPointsService = module.get(PainPointsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getVolumeVsConversionInsight', () => {
    it('should return volume vs conversion insight successfully', async () => {
      const mockVolumeData = [
        {
          volumeRange: '0-50',
          count: 5,
          conversionRate: 40.0,
        },
      ];

      const mockInsight: InsightDto = {
        insight: 'Higher interaction volumes correlate with better conversion rates.',
      };

      mockPainPointsService.getVolumeVsConversion.mockResolvedValue(mockVolumeData);
      mockAnalyticsInsightsGenerator.generateVolumeVsConversionInsight.mockResolvedValue(
        mockInsight,
      );

      const result = await service.getVolumeVsConversionInsight();

      expect(result).toEqual(mockInsight);
      expect(painPointsService.getVolumeVsConversion).toHaveBeenCalledTimes(1);
      expect(analyticsInsightsGenerator.generateVolumeVsConversionInsight).toHaveBeenCalledWith(
        mockVolumeData,
      );
    });

    it('should return fallback when no volume data available', async () => {
      mockPainPointsService.getVolumeVsConversion.mockResolvedValue([]);

      const result = await service.getVolumeVsConversionInsight();

      expect(result.insight).toBe('No volume vs conversion data available to analyze.');
      expect(analyticsInsightsGenerator.generateVolumeVsConversionInsight).not.toHaveBeenCalled();
    });

    it('should handle null volume data', async () => {
      mockPainPointsService.getVolumeVsConversion.mockResolvedValue(null as any);

      const result = await service.getVolumeVsConversionInsight();

      expect(result.insight).toBe('No volume vs conversion data available to analyze.');
    });

    it('should handle errors gracefully', async () => {
      mockPainPointsService.getVolumeVsConversion.mockRejectedValue(new Error('Service error'));

      const result = await service.getVolumeVsConversionInsight();

      expect(result.insight).toBe('Unable to generate insight at this time.');
    });
  });

  describe('getPainPointsInsight', () => {
    it('should return pain points insight successfully', async () => {
      const mockPainPoints = [
        {
          painPoint: 'High workload',
          count: 10,
          conversionRate: 60.0,
        },
      ];

      const mockInsight: InsightDto = {
        insight: 'High workload is the most significant pain point.',
      };

      mockPainPointsService.getTopPainPoints.mockResolvedValue(mockPainPoints);
      mockAnalyticsInsightsGenerator.generatePainPointsInsight.mockResolvedValue(mockInsight);

      const result = await service.getPainPointsInsight();

      expect(result).toEqual(mockInsight);
      expect(painPointsService.getTopPainPoints).toHaveBeenCalledTimes(1);
      expect(analyticsInsightsGenerator.generatePainPointsInsight).toHaveBeenCalledWith(
        mockPainPoints,
      );
    });

    it('should return fallback when no pain points available', async () => {
      mockPainPointsService.getTopPainPoints.mockResolvedValue([]);

      const result = await service.getPainPointsInsight();

      expect(result.insight).toBe('No pain points data available to analyze.');
      expect(analyticsInsightsGenerator.generatePainPointsInsight).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockPainPointsService.getTopPainPoints.mockRejectedValue(new Error('Service error'));

      const result = await service.getPainPointsInsight();

      expect(result.insight).toBe('Unable to generate insight at this time.');
    });
  });
});

