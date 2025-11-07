import { Test, TestingModule } from '@nestjs/testing';
import { IndustriesInsightsService } from './industries-insights.service';
import { ConversionAnalysisService } from '../../conversion/conversion-analysis.service';
import { IndustryInsightsGeneratorService } from '../../../llm/generators/industry-insights-generator.service';

describe('IndustriesInsightsService', () => {
  let service: IndustriesInsightsService;
  let conversionAnalysisService: jest.Mocked<ConversionAnalysisService>;
  let industryInsightsGenerator: jest.Mocked<IndustryInsightsGeneratorService>;

  const mockConversionAnalysisService = {
    getConversionAnalysis: jest.fn(),
  };

  const mockIndustryInsightsGenerator = {
    generateIndustryDistributionInsight: jest.fn(),
    generateIndustryConversionInsight: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IndustriesInsightsService,
        {
          provide: ConversionAnalysisService,
          useValue: mockConversionAnalysisService,
        },
        {
          provide: IndustryInsightsGeneratorService,
          useValue: mockIndustryInsightsGenerator,
        },
      ],
    }).compile();

    service = module.get<IndustriesInsightsService>(IndustriesInsightsService);
    conversionAnalysisService = module.get(ConversionAnalysisService);
    industryInsightsGenerator = module.get(IndustryInsightsGeneratorService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getIndustryDistributionInsight', () => {
    it('should return industry distribution insight successfully', async () => {
      const mockConversionData = {
        byIndustry: {
          dimension: 'industry',
          values: [
            {
              value: 'Technology',
              count: 10,
              closed: 6,
              conversionRate: 60.0,
            },
          ],
        },
        bySentiment: { dimension: 'sentiment', values: [] },
        byUrgency: { dimension: 'urgencyLevel', values: [] },
        byDiscovery: { dimension: 'discoverySource', values: [] },
        byOperationSize: { dimension: 'operationSize', values: [] },
      };

      const mockInsight = {
        insight: 'Technology is the dominant industry in the client base.',
      };

      mockConversionAnalysisService.getConversionAnalysis.mockResolvedValue(
        mockConversionData as any,
      );
      mockIndustryInsightsGenerator.generateIndustryDistributionInsight.mockResolvedValue(
        mockInsight,
      );

      const result = await service.getIndustryDistributionInsight();

      expect(result).toEqual(mockInsight);
      expect(result.insight).toBeDefined();
      expect(conversionAnalysisService.getConversionAnalysis).toHaveBeenCalledTimes(1);
      expect(industryInsightsGenerator.generateIndustryDistributionInsight).toHaveBeenCalledWith(
        mockConversionData.byIndustry.values,
      );
    });

    it('should handle case when byIndustry.values is undefined', async () => {
      const mockConversionData = {
        byIndustry: {
          dimension: 'industry',
          values: undefined,
        },
        bySentiment: { dimension: 'sentiment', values: [] },
        byUrgency: { dimension: 'urgencyLevel', values: [] },
        byDiscovery: { dimension: 'discoverySource', values: [] },
        byOperationSize: { dimension: 'operationSize', values: [] },
      };

      mockConversionAnalysisService.getConversionAnalysis.mockResolvedValue(
        mockConversionData as any,
      );

      const result = await service.getIndustryDistributionInsight();

      expect(result.insight).toBe('No industry data available to analyze.');
      expect(industryInsightsGenerator.generateIndustryDistributionInsight).not.toHaveBeenCalled();
    });

    it('should return fallback message when no industry data available', async () => {
      const mockConversionData = {
        byIndustry: {
          dimension: 'industry',
          values: [],
        },
        bySentiment: { dimension: 'sentiment', values: [] },
        byUrgency: { dimension: 'urgencyLevel', values: [] },
        byDiscovery: { dimension: 'discoverySource', values: [] },
        byOperationSize: { dimension: 'operationSize', values: [] },
      };

      mockConversionAnalysisService.getConversionAnalysis.mockResolvedValue(
        mockConversionData as any,
      );

      const result = await service.getIndustryDistributionInsight();

      expect(result.insight).toBe('No industry data available to analyze.');
      expect(industryInsightsGenerator.generateIndustryDistributionInsight).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockConversionAnalysisService.getConversionAnalysis.mockRejectedValue(
        new Error('Service error'),
      );

      const result = await service.getIndustryDistributionInsight();

      expect(result.insight).toBe('Unable to generate insight at this time.');
    });
  });

  describe('getIndustryConversionInsight', () => {
    it('should return industry conversion insight successfully', async () => {
      const mockConversionData = {
        byIndustry: {
          dimension: 'industry',
          values: [
            {
              value: 'Technology',
              count: 10,
              closed: 6,
              conversionRate: 60.0,
            },
          ],
        },
        bySentiment: { dimension: 'sentiment', values: [] },
        byUrgency: { dimension: 'urgencyLevel', values: [] },
        byDiscovery: { dimension: 'discoverySource', values: [] },
        byOperationSize: { dimension: 'operationSize', values: [] },
      };

      const mockInsight = {
        insight: 'Technology shows the highest conversion rate at 60%.',
      };

      mockConversionAnalysisService.getConversionAnalysis.mockResolvedValue(
        mockConversionData as any,
      );
      mockIndustryInsightsGenerator.generateIndustryConversionInsight.mockResolvedValue(
        mockInsight,
      );

      const result = await service.getIndustryConversionInsight();

      expect(result).toEqual(mockInsight);
      expect(result.insight).toBeDefined();
      expect(conversionAnalysisService.getConversionAnalysis).toHaveBeenCalledTimes(1);
      expect(industryInsightsGenerator.generateIndustryConversionInsight).toHaveBeenCalledWith(
        mockConversionData.byIndustry.values,
      );
    });

    it('should handle case when byIndustry.values is undefined', async () => {
      const mockConversionData = {
        byIndustry: {
          dimension: 'industry',
          values: undefined,
        },
        bySentiment: { dimension: 'sentiment', values: [] },
        byUrgency: { dimension: 'urgencyLevel', values: [] },
        byDiscovery: { dimension: 'discoverySource', values: [] },
        byOperationSize: { dimension: 'operationSize', values: [] },
      };

      mockConversionAnalysisService.getConversionAnalysis.mockResolvedValue(
        mockConversionData as any,
      );

      const result = await service.getIndustryConversionInsight();

      expect(result.insight).toBe('No industry data available to analyze.');
      expect(industryInsightsGenerator.generateIndustryConversionInsight).not.toHaveBeenCalled();
    });

    it('should return fallback message when no industry data available', async () => {
      const mockConversionData = {
        byIndustry: {
          dimension: 'industry',
          values: [],
        },
        bySentiment: { dimension: 'sentiment', values: [] },
        byUrgency: { dimension: 'urgencyLevel', values: [] },
        byDiscovery: { dimension: 'discoverySource', values: [] },
        byOperationSize: { dimension: 'operationSize', values: [] },
      };

      mockConversionAnalysisService.getConversionAnalysis.mockResolvedValue(
        mockConversionData as any,
      );

      const result = await service.getIndustryConversionInsight();

      expect(result.insight).toBe('No industry data available to analyze.');
      expect(industryInsightsGenerator.generateIndustryConversionInsight).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockConversionAnalysisService.getConversionAnalysis.mockRejectedValue(
        new Error('Service error'),
      );

      const result = await service.getIndustryConversionInsight();

      expect(result.insight).toBe('Unable to generate insight at this time.');
    });
  });
});

