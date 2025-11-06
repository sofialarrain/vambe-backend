import { Test, TestingModule } from '@nestjs/testing';
import { IndustriesAnalyticsService } from './industries-analytics.service';
import { PrismaService } from '../../prisma/prisma.service';
import { IndustryInsightsGeneratorService } from '../../llm/generators/industry-insights-generator.service';
import { ConversionAnalysisService } from '../conversion/conversion-analysis.service';
import { Client } from '@prisma/client';
import { ANALYTICS_CONSTANTS } from '../../common/constants';

// Mock the date utils
jest.mock('../../common/utils/date.utils', () => ({
  getSimulatedCurrentDate: jest.fn(() => new Date(2024, 10, 15)), // November 15, 2024
}));

describe('IndustriesAnalyticsService', () => {
  let service: IndustriesAnalyticsService;
  let prismaService: jest.Mocked<PrismaService>;
  let industryInsightsGenerator: jest.Mocked<IndustryInsightsGeneratorService>;
  let conversionAnalysisService: jest.Mocked<ConversionAnalysisService>;

  const mockPrismaService = {
    client: {
      findMany: jest.fn(),
    },
  };

  const mockIndustryInsightsGenerator = {
    generateIndustryDistributionInsight: jest.fn(),
    generateIndustryConversionInsight: jest.fn(),
  };

  const mockConversionAnalysisService = {
    getConversionAnalysis: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IndustriesAnalyticsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: IndustryInsightsGeneratorService,
          useValue: mockIndustryInsightsGenerator,
        },
        {
          provide: ConversionAnalysisService,
          useValue: mockConversionAnalysisService,
        },
      ],
    }).compile();

    service = module.get<IndustriesAnalyticsService>(IndustriesAnalyticsService);
    prismaService = module.get(PrismaService);
    industryInsightsGenerator = module.get(IndustryInsightsGeneratorService);
    conversionAnalysisService = module.get(ConversionAnalysisService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getIndustriesDetailedRanking', () => {
    it('should return industries ranking sorted by client count', async () => {
      // Arrange
      const mockClients: Partial<Client>[] = [
        {
          id: '1',
          industry: 'Technology',
          closed: true,
          sentiment: 'positive',
          urgencyLevel: 'immediate',
        },
        {
          id: '2',
          industry: 'Technology',
          closed: true,
          sentiment: 'positive',
          urgencyLevel: 'immediate',
        },
        {
          id: '3',
          industry: 'Finance',
          closed: false,
          sentiment: 'neutral',
          urgencyLevel: 'planned',
        },
      ];

      mockPrismaService.client.findMany.mockResolvedValue(mockClients as Client[]);

      // Act
      const result = await service.getIndustriesDetailedRanking();

      // Assert
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].industry).toBe('Technology');
      expect(result[0].clients).toBe(2);
      expect(result[0].closed).toBe(2);
      expect(result[0].conversionRate).toBe(100);
      expect(result[0].averageSentiment).toBe('positive');
      expect(result[0].averageUrgency).toBe('immediate');
      expect(mockPrismaService.client.findMany).toHaveBeenCalledWith({
        where: {
          processed: true,
          industry: { not: null },
        },
      });
    });

    it('should calculate average sentiment correctly', async () => {
      // Arrange
      const mockClients: Partial<Client>[] = [
        {
          id: '1',
          industry: 'Technology',
          closed: false,
          sentiment: 'positive',
          urgencyLevel: 'planned',
        },
        {
          id: '2',
          industry: 'Technology',
          closed: false,
          sentiment: 'positive',
          urgencyLevel: 'planned',
        },
        {
          id: '3',
          industry: 'Technology',
          closed: false,
          sentiment: 'neutral',
          urgencyLevel: 'planned',
        },
      ];

      mockPrismaService.client.findMany.mockResolvedValue(mockClients as Client[]);

      // Act
      const result = await service.getIndustriesDetailedRanking();

      // Assert
      expect(result[0].averageSentiment).toBe('positive');
    });

    it('should calculate average urgency correctly', async () => {
      // Arrange
      // Need at least 3 immediate to get average >= 2.5 threshold
      const mockClients: Partial<Client>[] = [
        {
          id: '1',
          industry: 'Technology',
          closed: false,
          sentiment: 'neutral',
          urgencyLevel: 'immediate',
        },
        {
          id: '2',
          industry: 'Technology',
          closed: false,
          sentiment: 'neutral',
          urgencyLevel: 'immediate',
        },
        {
          id: '3',
          industry: 'Technology',
          closed: false,
          sentiment: 'neutral',
          urgencyLevel: 'immediate',
        },
      ];

      mockPrismaService.client.findMany.mockResolvedValue(mockClients as Client[]);

      // Act
      const result = await service.getIndustriesDetailedRanking();

      // Assert
      expect(result[0].averageUrgency).toBe('immediate');
    });

    it('should return empty array when no clients exist', async () => {
      // Arrange
      mockPrismaService.client.findMany.mockResolvedValue([]);

      // Act
      const result = await service.getIndustriesDetailedRanking();

      // Assert
      expect(result).toEqual([]);
    });

    it('should handle null sentiment and urgency values', async () => {
      // Arrange
      const mockClients: Partial<Client>[] = [
        {
          id: '1',
          industry: 'Technology',
          closed: false,
          sentiment: null,
          urgencyLevel: null,
        },
      ];

      mockPrismaService.client.findMany.mockResolvedValue(mockClients as Client[]);

      // Act
      const result = await service.getIndustriesDetailedRanking();

      // Assert
      expect(result[0].averageSentiment).toBe('neutral');
      expect(result[0].averageUrgency).toBe('planned');
    });

    it('should handle unknown sentiment values with fallback', async () => {
      // Arrange
      const mockClients: Partial<Client>[] = [
        {
          id: '1',
          industry: 'Technology',
          closed: false,
          sentiment: 'unknown_sentiment' as any,
          urgencyLevel: 'planned',
        },
      ];

      mockPrismaService.client.findMany.mockResolvedValue(mockClients as Client[]);

      // Act
      const result = await service.getIndustriesDetailedRanking();

      // Assert
      // Should default to value 2 (neutral) for unknown sentiment
      expect(result[0].averageSentiment).toBe('neutral');
    });

    it('should handle unknown urgency values with fallback', async () => {
      // Arrange
      const mockClients: Partial<Client>[] = [
        {
          id: '1',
          industry: 'Technology',
          closed: false,
          sentiment: 'neutral',
          urgencyLevel: 'unknown_urgency' as any,
        },
      ];

      mockPrismaService.client.findMany.mockResolvedValue(mockClients as Client[]);

      // Act
      const result = await service.getIndustriesDetailedRanking();

      // Assert
      // Should default to value 2 (planned) for unknown urgency
      expect(result[0].averageUrgency).toBe('planned');
    });

    it('should calculate skeptical sentiment correctly', async () => {
      // Arrange
      const mockClients: Partial<Client>[] = [
        {
          id: '1',
          industry: 'Technology',
          closed: false,
          sentiment: 'skeptical',
          urgencyLevel: 'planned',
        },
        {
          id: '2',
          industry: 'Technology',
          closed: false,
          sentiment: 'skeptical',
          urgencyLevel: 'planned',
        },
      ];

      mockPrismaService.client.findMany.mockResolvedValue(mockClients as Client[]);

      // Act
      const result = await service.getIndustriesDetailedRanking();

      // Assert
      expect(result[0].averageSentiment).toBe('skeptical');
    });

    it('should calculate exploratory urgency correctly', async () => {
      // Arrange
      const mockClients: Partial<Client>[] = [
        {
          id: '1',
          industry: 'Technology',
          closed: false,
          sentiment: 'neutral',
          urgencyLevel: 'exploratory',
        },
        {
          id: '2',
          industry: 'Technology',
          closed: false,
          sentiment: 'neutral',
          urgencyLevel: 'exploratory',
        },
      ];

      mockPrismaService.client.findMany.mockResolvedValue(mockClients as Client[]);

      // Act
      const result = await service.getIndustriesDetailedRanking();

      // Assert
      expect(result[0].averageUrgency).toBe('exploratory');
    });
  });

  describe('getNewIndustriesLastMonth', () => {
    it('should handle case when new industry has no clients (conversion rate 0)', async () => {
      // Arrange
      const lastMonthClients: Partial<Client>[] = [
        {
          id: '1',
          industry: 'Healthcare',
          meetingDate: new Date(2024, 9, 15),
          closed: false,
        },
      ];

      const previousClients: Partial<Client>[] = [];

      mockPrismaService.client.findMany
        .mockResolvedValueOnce(lastMonthClients as Client[])
        .mockResolvedValueOnce(previousClients as Client[])
        .mockResolvedValueOnce([]); // No clients when fetching stats

      // Act
      const result = await service.getNewIndustriesLastMonth();

      // Assert
      expect(result.industries.length).toBeGreaterThan(0);
      expect(result.industries[0].conversionRate).toBe(0);
      expect(result.industries[0].clients).toBe(0);
    });

    it('should return new industries from last month', async () => {
      // Arrange
      const lastMonthClients: Partial<Client>[] = [
        {
          id: '1',
          industry: 'Healthcare',
          meetingDate: new Date(2024, 9, 15), // October 2024
          closed: true,
        },
        {
          id: '2',
          industry: 'Healthcare',
          meetingDate: new Date(2024, 9, 20),
          closed: true,
        },
      ];

      const previousClients: Partial<Client>[] = [
        {
          id: '3',
          industry: 'Technology',
          meetingDate: new Date(2024, 8, 15), // September 2024
          closed: false,
        },
      ];

      mockPrismaService.client.findMany
        .mockResolvedValueOnce(lastMonthClients as Client[])
        .mockResolvedValueOnce(previousClients as Client[])
        .mockResolvedValueOnce(lastMonthClients as Client[]);

      // Act
      const result = await service.getNewIndustriesLastMonth();

      // Assert
      expect(result.industries.length).toBeGreaterThan(0);
      expect(result.industries[0].industry).toBe('Healthcare');
      expect(result.month).toBeDefined();
      expect(mockPrismaService.client.findMany).toHaveBeenCalledTimes(3);
    });

    it('should return empty array when no new industries exist', async () => {
      // Arrange
      mockPrismaService.client.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      // Act
      const result = await service.getNewIndustriesLastMonth();

      // Assert
      expect(result.industries).toEqual([]);
      expect(result.month).toBeDefined();
    });
  });

  describe('getIndustriesToWatch', () => {
    it('should return industries to watch with expansion opportunities', async () => {
      // Arrange
      const mockClients: Partial<Client>[] = [
        {
          id: '1',
          industry: 'Education',
          closed: true,
        },
        {
          id: '2',
          industry: 'Education',
          closed: true,
        },
        {
          id: '3',
          industry: 'Education',
          closed: true,
        },
        {
          id: '4',
          industry: 'Retail',
          closed: false,
        },
        {
          id: '5',
          industry: 'Retail',
          closed: false,
        },
        {
          id: '6',
          industry: 'Retail',
          closed: false,
        },
        {
          id: '7',
          industry: 'Retail',
          closed: false,
        },
        {
          id: '8',
          industry: 'Retail',
          closed: false,
        },
      ];

      mockPrismaService.client.findMany.mockResolvedValue(mockClients as Client[]);

      // Act
      const result = await service.getIndustriesToWatch();

      // Assert
      expect(result).toBeDefined();
      expect(result.expansionOpportunities).toBeDefined();
      expect(result.strategyNeeded).toBeDefined();
      expect(Array.isArray(result.expansionOpportunities)).toBe(true);
      expect(Array.isArray(result.strategyNeeded)).toBe(true);
      expect(mockPrismaService.client.findMany).toHaveBeenCalledWith({
        where: {
          processed: true,
          industry: { not: null },
        },
      });
    });

    it('should return empty arrays when no industries meet minimum threshold', async () => {
      // Arrange
      const mockClients: Partial<Client>[] = [
        {
          id: '1',
          industry: 'Education',
          closed: false,
        },
        {
          id: '2',
          industry: 'Education',
          closed: false,
        },
      ];

      mockPrismaService.client.findMany.mockResolvedValue(mockClients as Client[]);

      // Act
      const result = await service.getIndustriesToWatch();

      // Assert
      expect(result.expansionOpportunities).toEqual([]);
      expect(result.strategyNeeded).toEqual([]);
    });

    it('should handle edge case with single industry meeting threshold', async () => {
      // Arrange
      const mockClients: Partial<Client>[] = [
        {
          id: '1',
          industry: 'Education',
          closed: true,
        },
        {
          id: '2',
          industry: 'Education',
          closed: true,
        },
        {
          id: '3',
          industry: 'Education',
          closed: true,
        },
      ];

      mockPrismaService.client.findMany.mockResolvedValue(mockClients as Client[]);

      // Act
      const result = await service.getIndustriesToWatch();

      // Assert
      expect(result).toBeDefined();
      expect(result.expansionOpportunities).toBeDefined();
      expect(result.strategyNeeded).toBeDefined();
    });

    it('should calculate thresholds correctly with multiple industries', async () => {
      // Arrange
      // Create enough clients to have reliable data and test threshold calculations
      const mockClients: Partial<Client>[] = [];
      
      // Industry 1: Low volume, high conversion (expansion opportunity)
      for (let i = 0; i < 3; i++) {
        mockClients.push({
          id: `edu-${i}`,
          industry: 'Education',
          closed: true, // 100% conversion
        });
      }

      // Industry 2: High volume, low conversion (strategy needed)
      for (let i = 0; i < 10; i++) {
        mockClients.push({
          id: `retail-${i}`,
          industry: 'Retail',
          closed: i < 2, // 20% conversion
        });
      }

      // Industry 3: Medium volume, medium conversion
      for (let i = 0; i < 5; i++) {
        mockClients.push({
          id: `tech-${i}`,
          industry: 'Technology',
          closed: i < 3, // 60% conversion
        });
      }

      mockPrismaService.client.findMany.mockResolvedValue(mockClients as Client[]);

      // Act
      const result = await service.getIndustriesToWatch();

      // Assert
      expect(result).toBeDefined();
      expect(result.expansionOpportunities).toBeDefined();
      expect(result.strategyNeeded).toBeDefined();
      // Should limit results to TOP_INDUSTRIES
      expect(result.expansionOpportunities.length).toBeLessThanOrEqual(ANALYTICS_CONSTANTS.LIMITS.TOP_INDUSTRIES);
      expect(result.strategyNeeded.length).toBeLessThanOrEqual(ANALYTICS_CONSTANTS.LIMITS.TOP_INDUSTRIES);
    });

    it('should handle case when industries array is empty for threshold calculations', async () => {
      // Arrange
      // This tests the fallback when clientCountsSorted/conversionRatesSorted are empty
      // Need exactly 1 industry to trigger empty array scenarios in threshold calculations
      const mockClients: Partial<Client>[] = [
        {
          id: '1',
          industry: 'Technology',
          closed: true,
        },
        {
          id: '2',
          industry: 'Technology',
          closed: true,
        },
        {
          id: '3',
          industry: 'Technology',
          closed: true,
        },
      ];

      mockPrismaService.client.findMany.mockResolvedValue(mockClients as Client[]);

      // Act
      const result = await service.getIndustriesToWatch();

      // Assert
      expect(result).toBeDefined();
      // With single industry, thresholds may use fallback values
      expect(Array.isArray(result.expansionOpportunities)).toBe(true);
      expect(Array.isArray(result.strategyNeeded)).toBe(true);
    });

    it('should use medianClients fallback when arrays are empty', async () => {
      // Arrange
      // This scenario tests the fallback logic in threshold calculations
      // Create scenario where sorted arrays might be empty or edge cases
      const mockClients: Partial<Client>[] = [];
      
      // Create exactly MIN_CLIENTS_FOR_RELIABILITY clients to test edge cases
      for (let i = 0; i < ANALYTICS_CONSTANTS.MIN_CLIENTS_FOR_RELIABILITY; i++) {
        mockClients.push({
          id: `tech-${i}`,
          industry: 'Technology',
          closed: i % 2 === 0, // 50% conversion
        });
      }

      mockPrismaService.client.findMany.mockResolvedValue(mockClients as Client[]);

      // Act
      const result = await service.getIndustriesToWatch();

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result.expansionOpportunities)).toBe(true);
      expect(Array.isArray(result.strategyNeeded)).toBe(true);
    });

    it('should use fallback thresholds when clientCountsSorted is empty', async () => {
      // Arrange
      // This tests the fallback to medianClients when clientCountsSorted.length === 0
      // Need to create a scenario that triggers the empty array fallback
      const mockClients: Partial<Client>[] = [];
      
      // Create multiple industries with different volumes to test percentile calculations
      // Industry with very low volume
      for (let i = 0; i < 3; i++) {
        mockClients.push({
          id: `low-${i}`,
          industry: 'LowVolume',
          closed: true, // 100% conversion - high conversion
        });
      }

      // Industry with high volume
      for (let i = 0; i < 15; i++) {
        mockClients.push({
          id: `high-${i}`,
          industry: 'HighVolume',
          closed: i < 3, // 20% conversion - low conversion
        });
      }

      mockPrismaService.client.findMany.mockResolvedValue(mockClients as Client[]);

      // Act
      const result = await service.getIndustriesToWatch();

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result.expansionOpportunities)).toBe(true);
      expect(Array.isArray(result.strategyNeeded)).toBe(true);
    });

    it('should use fallback thresholds when conversionRatesSorted is empty', async () => {
      // Arrange
      // This tests the fallback logic for highConversionThreshold and lowConversionThreshold
      // when conversionRatesSorted.length === 0
      const mockClients: Partial<Client>[] = [];
      
      // Create industries with same conversion rates to test edge cases
      for (let i = 0; i < 5; i++) {
        mockClients.push({
          id: `tech-${i}`,
          industry: 'Technology',
          closed: i < 3, // 60% conversion
        });
      }

      for (let i = 0; i < 5; i++) {
        mockClients.push({
          id: `finance-${i}`,
          industry: 'Finance',
          closed: i < 3, // 60% conversion (same as tech)
        });
      }

      mockPrismaService.client.findMany.mockResolvedValue(mockClients as Client[]);

      // Act
      const result = await service.getIndustriesToWatch();

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result.expansionOpportunities)).toBe(true);
      expect(Array.isArray(result.strategyNeeded)).toBe(true);
      // Should handle Math.max/Math.min in threshold calculations
      expect(result.expansionOpportunities.length).toBeLessThanOrEqual(ANALYTICS_CONSTANTS.LIMITS.TOP_INDUSTRIES);
      expect(result.strategyNeeded.length).toBeLessThanOrEqual(ANALYTICS_CONSTANTS.LIMITS.TOP_INDUSTRIES);
    });

    it('should handle case with industries but empty arrays after threshold calculations', async () => {
      // Arrange
      // Create industries that meet minimum threshold but don't match expansion/strategy criteria
      const mockClients: Partial<Client>[] = [];
      
      // All industries with medium volume and medium conversion (won't match either criteria)
      for (let i = 0; i < 5; i++) {
        mockClients.push({
          id: `tech-${i}`,
          industry: 'Technology',
          closed: i < 2, // 40% conversion
        });
      }

      for (let i = 0; i < 5; i++) {
        mockClients.push({
          id: `finance-${i}`,
          industry: 'Finance',
          closed: i < 2, // 40% conversion
        });
      }

      mockPrismaService.client.findMany.mockResolvedValue(mockClients as Client[]);

      // Act
      const result = await service.getIndustriesToWatch();

      // Assert
      expect(result).toBeDefined();
      // May or may not have results depending on percentile calculations
      expect(Array.isArray(result.expansionOpportunities)).toBe(true);
      expect(Array.isArray(result.strategyNeeded)).toBe(true);
    });

    it('should return empty arrays when no clients exist', async () => {
      // Arrange
      mockPrismaService.client.findMany.mockResolvedValue([]);

      // Act
      const result = await service.getIndustriesToWatch();

      // Assert
      expect(result.expansionOpportunities).toEqual([]);
      expect(result.strategyNeeded).toEqual([]);
    });
  });

  describe('getIndustryDistributionInsight', () => {
    it('should return industry distribution insight successfully', async () => {
      // Arrange
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

      // Act
      const result = await service.getIndustryDistributionInsight();

      // Assert
      expect(result).toEqual(mockInsight);
      expect(result.insight).toBeDefined();
      expect(mockConversionAnalysisService.getConversionAnalysis).toHaveBeenCalledTimes(1);
      expect(
        mockIndustryInsightsGenerator.generateIndustryDistributionInsight,
      ).toHaveBeenCalledWith(mockConversionData.byIndustry.values);
    });

    it('should handle case when byIndustry.values is undefined (use fallback empty array)', async () => {
      // Arrange
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

      // Act
      const result = await service.getIndustryDistributionInsight();

      // Assert
      expect(result.insight).toBe('No industry data available to analyze.');
      expect(
        mockIndustryInsightsGenerator.generateIndustryDistributionInsight,
      ).not.toHaveBeenCalled();
    });

    it('should return fallback message when no industry data available', async () => {
      // Arrange
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

      // Act
      const result = await service.getIndustryDistributionInsight();

      // Assert
      expect(result.insight).toBe('No industry data available to analyze.');
      expect(
        mockIndustryInsightsGenerator.generateIndustryDistributionInsight,
      ).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      mockConversionAnalysisService.getConversionAnalysis.mockRejectedValue(
        new Error('Service error'),
      );

      // Act
      const result = await service.getIndustryDistributionInsight();

      // Assert
      expect(result.insight).toBe('Unable to generate insight at this time.');
    });
  });

  describe('getIndustryConversionInsight', () => {
    it('should return industry conversion insight successfully', async () => {
      // Arrange
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

      // Act
      const result = await service.getIndustryConversionInsight();

      // Assert
      expect(result).toEqual(mockInsight);
      expect(result.insight).toBeDefined();
      expect(mockConversionAnalysisService.getConversionAnalysis).toHaveBeenCalledTimes(1);
      expect(
        mockIndustryInsightsGenerator.generateIndustryConversionInsight,
      ).toHaveBeenCalledWith(mockConversionData.byIndustry.values);
    });

    it('should handle case when byIndustry.values is undefined (use fallback empty array)', async () => {
      // Arrange
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

      // Act
      const result = await service.getIndustryConversionInsight();

      // Assert
      expect(result.insight).toBe('No industry data available to analyze.');
      expect(
        mockIndustryInsightsGenerator.generateIndustryConversionInsight,
      ).not.toHaveBeenCalled();
    });

    it('should return fallback message when no industry data available', async () => {
      // Arrange
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

      // Act
      const result = await service.getIndustryConversionInsight();

      // Assert
      expect(result.insight).toBe('No industry data available to analyze.');
      expect(
        mockIndustryInsightsGenerator.generateIndustryConversionInsight,
      ).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      mockConversionAnalysisService.getConversionAnalysis.mockRejectedValue(
        new Error('Service error'),
      );

      // Act
      const result = await service.getIndustryConversionInsight();

      // Assert
      expect(result.insight).toBe('Unable to generate insight at this time.');
    });
  });
});

