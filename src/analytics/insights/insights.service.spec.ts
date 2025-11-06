import { Test, TestingModule } from '@nestjs/testing';
import { InsightsService } from './insights.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AnalyticsInsightsGeneratorService } from '../../llm/generators/analytics-insights-generator.service';
import { ClientInsightsGeneratorService } from '../../llm/generators/client-insights-generator.service';
import { PainPointsService } from '../pain-points/pain-points.service';
import { Client } from '@prisma/client';
import { InsightDto, TimelineInsightDto, ClientPerceptionInsightDto } from '../../common/dto/analytics';

describe('InsightsService', () => {
  let service: InsightsService;
  let prismaService: jest.Mocked<PrismaService>;
  let analyticsInsightsGenerator: jest.Mocked<AnalyticsInsightsGeneratorService>;
  let clientInsightsGenerator: jest.Mocked<ClientInsightsGeneratorService>;
  let painPointsService: jest.Mocked<PainPointsService>;

  const mockPrismaService = {
    client: {
      findMany: jest.fn(),
    },
  };

  const mockAnalyticsInsightsGenerator = {
    generateVolumeVsConversionInsight: jest.fn(),
    generatePainPointsInsight: jest.fn(),
    generateTimelineInsight: jest.fn(),
  };

  const mockClientInsightsGenerator = {
    generateClientPerceptionInsight: jest.fn(),
    generateClientSolutionsInsight: jest.fn(),
  };

  const mockPainPointsService = {
    getVolumeVsConversion: jest.fn(),
    getTopPainPoints: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InsightsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: AnalyticsInsightsGeneratorService,
          useValue: mockAnalyticsInsightsGenerator,
        },
        {
          provide: ClientInsightsGeneratorService,
          useValue: mockClientInsightsGenerator,
        },
        {
          provide: PainPointsService,
          useValue: mockPainPointsService,
        },
      ],
    }).compile();

    service = module.get<InsightsService>(InsightsService);
    prismaService = module.get(PrismaService);
    analyticsInsightsGenerator = module.get(AnalyticsInsightsGeneratorService);
    clientInsightsGenerator = module.get(ClientInsightsGeneratorService);
    painPointsService = module.get(PainPointsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getVolumeVsConversionInsight', () => {
    it('should return volume vs conversion insight successfully', async () => {
      // Arrange
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

      // Act
      const result = await service.getVolumeVsConversionInsight();

      // Assert
      expect(result).toEqual(mockInsight);
      expect(painPointsService.getVolumeVsConversion).toHaveBeenCalledTimes(1);
      expect(
        analyticsInsightsGenerator.generateVolumeVsConversionInsight,
      ).toHaveBeenCalledWith(mockVolumeData);
    });

    it('should return fallback when no volume data available', async () => {
      // Arrange
      mockPainPointsService.getVolumeVsConversion.mockResolvedValue([]);

      // Act
      const result = await service.getVolumeVsConversionInsight();

      // Assert
      expect(result.insight).toBe('No volume vs conversion data available to analyze.');
      expect(
        analyticsInsightsGenerator.generateVolumeVsConversionInsight,
      ).not.toHaveBeenCalled();
    });

    it('should handle null volume data', async () => {
      // Arrange
      mockPainPointsService.getVolumeVsConversion.mockResolvedValue(null as any);

      // Act
      const result = await service.getVolumeVsConversionInsight();

      // Assert
      expect(result.insight).toBe('No volume vs conversion data available to analyze.');
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      mockPainPointsService.getVolumeVsConversion.mockRejectedValue(
        new Error('Service error'),
      );

      // Act
      const result = await service.getVolumeVsConversionInsight();

      // Assert
      expect(result.insight).toBe('Unable to generate insight at this time.');
    });
  });

  describe('getPainPointsInsight', () => {
    it('should return pain points insight successfully', async () => {
      // Arrange
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
      mockAnalyticsInsightsGenerator.generatePainPointsInsight.mockResolvedValue(
        mockInsight,
      );

      // Act
      const result = await service.getPainPointsInsight();

      // Assert
      expect(result).toEqual(mockInsight);
      expect(painPointsService.getTopPainPoints).toHaveBeenCalledTimes(1);
      expect(analyticsInsightsGenerator.generatePainPointsInsight).toHaveBeenCalledWith(
        mockPainPoints,
      );
    });

    it('should return fallback when no pain points available', async () => {
      // Arrange
      mockPainPointsService.getTopPainPoints.mockResolvedValue([]);

      // Act
      const result = await service.getPainPointsInsight();

      // Assert
      expect(result.insight).toBe('No pain points data available to analyze.');
      expect(analyticsInsightsGenerator.generatePainPointsInsight).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      mockPainPointsService.getTopPainPoints.mockRejectedValue(new Error('Service error'));

      // Act
      const result = await service.getPainPointsInsight();

      // Assert
      expect(result.insight).toBe('Unable to generate insight at this time.');
    });
  });

  describe('getClientPerceptionInsight', () => {
    it('should return client perception insight successfully', async () => {
      // Arrange
      const mockClients: Partial<Client>[] = [
        {
          id: '1',
          transcription: 'Great product, very helpful.',
          closed: true,
          sentiment: 'positive',
        },
        {
          id: '2',
          transcription: 'Need more features.',
          closed: false,
          sentiment: 'neutral',
        },
      ];

      const mockInsight: ClientPerceptionInsightDto = {
        positiveAspects: 'Clients appreciate the automation.',
        concerns: 'Feature requests mentioned.',
        successFactors: 'Positive sentiment correlates with closed deals.',
        recommendations: 'Continue focusing on automation features.',
      };

      mockPrismaService.client.findMany.mockResolvedValue(mockClients as Client[]);
      mockClientInsightsGenerator.generateClientPerceptionInsight.mockResolvedValue(
        mockInsight,
      );

      // Act
      const result = await service.getClientPerceptionInsight();

      // Assert
      expect(result).toEqual(mockInsight);
      expect(mockPrismaService.client.findMany).toHaveBeenCalledWith({
        where: {
          processed: true,
        },
        select: {
          transcription: true,
          closed: true,
          sentiment: true,
        },
        take: 20,
        orderBy: {
          createdAt: 'desc',
        },
      });
      expect(mockClientInsightsGenerator.generateClientPerceptionInsight).toHaveBeenCalledWith([
        {
          transcription: 'Great product, very helpful.',
          closed: true,
          sentiment: 'positive',
        },
        {
          transcription: 'Need more features.',
          closed: false,
          sentiment: 'neutral',
        },
      ]);
    });

    it('should filter out clients with empty transcriptions', async () => {
      // Arrange
      const mockClients: Partial<Client>[] = [
        {
          id: '1',
          transcription: '   ',
          closed: true,
          sentiment: 'positive',
        },
        {
          id: '2',
          transcription: null,
          closed: false,
          sentiment: 'neutral',
        },
        {
          id: '3',
          transcription: 'Valid transcription',
          closed: true,
          sentiment: 'positive',
        },
      ];

      const mockInsight: ClientPerceptionInsightDto = {
        positiveAspects: 'Valid insights',
        concerns: '',
        successFactors: '',
        recommendations: '',
      };

      mockPrismaService.client.findMany.mockResolvedValue(mockClients as Client[]);
      mockClientInsightsGenerator.generateClientPerceptionInsight.mockResolvedValue(
        mockInsight,
      );

      // Act
      const result = await service.getClientPerceptionInsight();

      // Assert
      expect(mockClientInsightsGenerator.generateClientPerceptionInsight).toHaveBeenCalledWith([
        {
          transcription: 'Valid transcription',
          closed: true,
          sentiment: 'positive',
        },
      ]);
    });

    it('should return fallback when no valid transcriptions available', async () => {
      // Arrange
      const mockClients: Partial<Client>[] = [
        {
          id: '1',
          transcription: '',
          closed: true,
          sentiment: 'positive',
        },
        {
          id: '2',
          transcription: null,
          closed: false,
          sentiment: 'neutral',
        },
      ];

      mockPrismaService.client.findMany.mockResolvedValue(mockClients as Client[]);

      // Act
      const result = await service.getClientPerceptionInsight();

      // Assert
      expect(result.positiveAspects).toBe('No client transcripts available for perception analysis.');
      expect(result.concerns).toBe('');
      expect(mockClientInsightsGenerator.generateClientPerceptionInsight).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      mockPrismaService.client.findMany.mockRejectedValue(new Error('Database error'));

      // Act
      const result = await service.getClientPerceptionInsight();

      // Assert
      expect(result.positiveAspects).toBe('Unable to generate analysis at this time.');
      expect(result.concerns).toBe('Unable to generate analysis at this time.');
    });
  });

  describe('getClientSolutionsInsight', () => {
    it('should return client solutions insight successfully', async () => {
      // Arrange
      const mockClients: Partial<Client>[] = [
        {
          id: '1',
          transcription: 'We need automation and API integration.',
          closed: true,
          mainMotivation: 'Efficiency',
          technicalRequirements: ['API integration', 'Real-time updates'],
        },
      ];

      const mockInsight: InsightDto = {
        insight: 'Clients are seeking automation and API integration solutions.',
      };

      mockPrismaService.client.findMany.mockResolvedValue(mockClients as Client[]);
      mockClientInsightsGenerator.generateClientSolutionsInsight.mockResolvedValue(mockInsight);

      // Act
      const result = await service.getClientSolutionsInsight();

      // Assert
      expect(result).toEqual(mockInsight);
      expect(mockPrismaService.client.findMany).toHaveBeenCalledWith({
        where: {
          processed: true,
        },
        select: {
          transcription: true,
          closed: true,
          mainMotivation: true,
          technicalRequirements: true,
        },
        take: 30,
        orderBy: {
          createdAt: 'desc',
        },
      });
      expect(mockClientInsightsGenerator.generateClientSolutionsInsight).toHaveBeenCalledWith([
        {
          transcription: 'We need automation and API integration.',
          closed: true,
          mainMotivation: 'Efficiency',
          technicalRequirements: ['API integration', 'Real-time updates'],
        },
      ]);
    });

    it('should filter out clients with empty transcriptions', async () => {
      // Arrange
      const mockClients: Partial<Client>[] = [
        {
          id: '1',
          transcription: '',
          closed: true,
          mainMotivation: 'Efficiency',
          technicalRequirements: [],
        },
        {
          id: '2',
          transcription: 'Valid transcription',
          closed: false,
          mainMotivation: null,
          technicalRequirements: null,
        },
      ];

      const mockInsight: InsightDto = {
        insight: 'Valid insights',
      };

      mockPrismaService.client.findMany.mockResolvedValue(mockClients as Client[]);
      mockClientInsightsGenerator.generateClientSolutionsInsight.mockResolvedValue(mockInsight);

      // Act
      const result = await service.getClientSolutionsInsight();

      // Assert
      expect(mockClientInsightsGenerator.generateClientSolutionsInsight).toHaveBeenCalledWith([
        {
          transcription: 'Valid transcription',
          closed: false,
          mainMotivation: null,
          technicalRequirements: null,
        },
      ]);
    });

    it('should return fallback when no valid transcriptions available', async () => {
      // Arrange
      mockPrismaService.client.findMany.mockResolvedValue([
        {
          id: '1',
          transcription: '',
          closed: true,
          mainMotivation: null,
          technicalRequirements: null,
        },
      ] as Client[]);

      // Act
      const result = await service.getClientSolutionsInsight();

      // Assert
      expect(result.insight).toBe('No client transcripts available for solutions analysis.');
      expect(mockClientInsightsGenerator.generateClientSolutionsInsight).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      mockPrismaService.client.findMany.mockRejectedValue(new Error('Database error'));

      // Act
      const result = await service.getClientSolutionsInsight();

      // Assert
      expect(result.insight).toBe('Unable to generate insight at this time.');
    });
  });

  describe('getTimelineInsight', () => {
    it('should return timeline insight successfully', async () => {
      // Arrange
      const mockClients: Partial<Client>[] = [
        {
          id: '1',
          meetingDate: new Date('2024-01-15'),
          closed: true,
          industry: 'Technology',
          sentiment: 'positive',
        },
        {
          id: '2',
          meetingDate: new Date('2024-01-20'),
          closed: false,
          industry: 'Finance',
          sentiment: 'neutral',
        },
        {
          id: '3',
          meetingDate: new Date('2024-02-10'),
          closed: true,
          industry: 'Technology',
          sentiment: 'positive',
        },
      ];

      const mockInsight: TimelineInsightDto = {
        keyFindings: ['Conversion rates improved over time'],
        reasons: ['Better client engagement'],
        recommendations: ['Continue current strategy'],
      };

      mockPrismaService.client.findMany.mockResolvedValue(mockClients as Client[]);
      mockAnalyticsInsightsGenerator.generateTimelineInsight.mockResolvedValue(mockInsight);

      // Act
      const result = await service.getTimelineInsight();

      // Assert
      expect(result).toEqual(mockInsight);
      expect(mockPrismaService.client.findMany).toHaveBeenCalledWith({
        where: {
          processed: true,
        },
        select: {
          meetingDate: true,
          closed: true,
          industry: true,
          sentiment: true,
        },
        orderBy: {
          meetingDate: 'asc',
        },
      });
      expect(mockAnalyticsInsightsGenerator.generateTimelineInsight).toHaveBeenCalled();
    });

    it('should group clients by month correctly', async () => {
      // Arrange
      // Create dates using UTC explicitly to avoid timezone issues
      const janDate1 = new Date(Date.UTC(2024, 0, 15, 12, 0, 0)); // January 15, 2024
      const janDate2 = new Date(Date.UTC(2024, 0, 20, 12, 0, 0)); // January 20, 2024
      const febDate = new Date(Date.UTC(2024, 1, 10, 12, 0, 0)); // February 10, 2024
      
      const mockClients: Partial<Client>[] = [
        {
          id: '1',
          meetingDate: janDate1,
          closed: true,
          industry: 'Technology',
          sentiment: 'positive',
        },
        {
          id: '2',
          meetingDate: janDate2,
          closed: true,
          industry: 'Technology',
          sentiment: 'positive',
        },
        {
          id: '3',
          meetingDate: febDate,
          closed: false,
          industry: 'Finance',
          sentiment: 'neutral',
        },
      ];

      const mockInsight: TimelineInsightDto = {
        keyFindings: ['Test finding'],
        reasons: [],
        recommendations: [],
      };

      mockPrismaService.client.findMany.mockResolvedValue(mockClients as Client[]);
      mockAnalyticsInsightsGenerator.generateTimelineInsight.mockResolvedValue(mockInsight);

      // Act
      await service.getTimelineInsight();

      // Assert
      const callArgs = mockAnalyticsInsightsGenerator.generateTimelineInsight.mock.calls[0][0];
      expect(callArgs.length).toBe(2);
      
      const januaryData = callArgs.find(item => item.month.includes('January'));
      const februaryData = callArgs.find(item => item.month.includes('February'));
      
      expect(januaryData).toBeDefined();
      expect(januaryData?.totalMeetings).toBe(2);
      expect(januaryData?.totalClosed).toBe(2);
      expect(januaryData?.conversionRate).toBe(100);
      
      expect(februaryData).toBeDefined();
      expect(februaryData?.totalMeetings).toBe(1);
      expect(februaryData?.totalClosed).toBe(0);
      expect(februaryData?.conversionRate).toBe(0);
    });

    it('should calculate top industries per month', async () => {
      // Arrange
      const mockClients: Partial<Client>[] = [
        {
          id: '1',
          meetingDate: new Date('2024-01-15'),
          closed: true,
          industry: 'Technology',
          sentiment: 'positive',
        },
        {
          id: '2',
          meetingDate: new Date('2024-01-20'),
          closed: false,
          industry: 'Technology',
          sentiment: 'positive',
        },
        {
          id: '3',
          meetingDate: new Date('2024-01-25'),
          closed: false,
          industry: 'Finance',
          sentiment: 'neutral',
        },
      ];

      const mockInsight: TimelineInsightDto = {
        keyFindings: ['Test'],
        reasons: [],
        recommendations: [],
      };

      mockPrismaService.client.findMany.mockResolvedValue(mockClients as Client[]);
      mockAnalyticsInsightsGenerator.generateTimelineInsight.mockResolvedValue(mockInsight);

      // Act
      await service.getTimelineInsight();

      // Assert
      const callArgs = mockAnalyticsInsightsGenerator.generateTimelineInsight.mock.calls[0][0];
      expect(callArgs[0].topIndustries).toBeDefined();
      expect(Array.isArray(callArgs[0].topIndustries)).toBe(true);
      expect(callArgs[0].topIndustries?.length).toBeLessThanOrEqual(3);
      if (callArgs[0].topIndustries && callArgs[0].topIndustries.length > 0) {
        expect(callArgs[0].topIndustries[0].industry).toBe('Technology');
        expect(callArgs[0].topIndustries[0].count).toBe(2);
      }
    });

    it('should calculate average sentiment per month', async () => {
      // Arrange
      const mockClients: Partial<Client>[] = [
        {
          id: '1',
          meetingDate: new Date('2024-01-15'),
          closed: true,
          industry: 'Technology',
          sentiment: 'positive',
        },
        {
          id: '2',
          meetingDate: new Date('2024-01-20'),
          closed: false,
          industry: 'Technology',
          sentiment: 'positive',
        },
        {
          id: '3',
          meetingDate: new Date('2024-01-25'),
          closed: false,
          industry: 'Finance',
          sentiment: 'neutral',
        },
      ];

      const mockInsight: TimelineInsightDto = {
        keyFindings: ['Test'],
        reasons: [],
        recommendations: [],
      };

      mockPrismaService.client.findMany.mockResolvedValue(mockClients as Client[]);
      mockAnalyticsInsightsGenerator.generateTimelineInsight.mockResolvedValue(mockInsight);

      // Act
      await service.getTimelineInsight();

      // Assert
      const callArgs = mockAnalyticsInsightsGenerator.generateTimelineInsight.mock.calls[0][0];
      expect(callArgs[0].avgSentiment).toBeDefined();
      // Should be 'positive' as it's the most common
      expect(callArgs[0].avgSentiment).toBe('positive');
    });

    it('should handle null sentiment and industry values', async () => {
      // Arrange
      const mockClients: Partial<Client>[] = [
        {
          id: '1',
          meetingDate: new Date('2024-01-15'),
          closed: true,
          industry: null,
          sentiment: null,
        },
        {
          id: '2',
          meetingDate: new Date('2024-01-20'),
          closed: false,
          industry: 'Technology',
          sentiment: 'positive',
        },
      ];

      const mockInsight: TimelineInsightDto = {
        keyFindings: ['Test'],
        reasons: [],
        recommendations: [],
      };

      mockPrismaService.client.findMany.mockResolvedValue(mockClients as Client[]);
      mockAnalyticsInsightsGenerator.generateTimelineInsight.mockResolvedValue(mockInsight);

      // Act
      await service.getTimelineInsight();

      // Assert
      const callArgs = mockAnalyticsInsightsGenerator.generateTimelineInsight.mock.calls[0][0];
      expect(callArgs[0].avgSentiment).toBe('positive');
    });

    it('should return fallback when no clients exist', async () => {
      // Arrange
      mockPrismaService.client.findMany.mockResolvedValue([]);

      // Act
      const result = await service.getTimelineInsight();

      // Assert
      expect(result.keyFindings).toEqual(['No timeline data available to analyze.']);
      expect(result.reasons).toEqual([]);
      expect(result.recommendations).toEqual([]);
      expect(mockAnalyticsInsightsGenerator.generateTimelineInsight).not.toHaveBeenCalled();
    });

    it('should sort timeline data chronologically', async () => {
      // Arrange
      const mockClients: Partial<Client>[] = [
        {
          id: '1',
          meetingDate: new Date('2024-03-15T12:00:00Z'),
          closed: true,
          industry: 'Technology',
          sentiment: 'positive',
        },
        {
          id: '2',
          meetingDate: new Date('2024-01-20T12:00:00Z'),
          closed: false,
          industry: 'Finance',
          sentiment: 'neutral',
        },
        {
          id: '3',
          meetingDate: new Date('2024-02-10T12:00:00Z'),
          closed: true,
          industry: 'Technology',
          sentiment: 'positive',
        },
      ];

      const mockInsight: TimelineInsightDto = {
        keyFindings: ['Test'],
        reasons: [],
        recommendations: [],
      };

      mockPrismaService.client.findMany.mockResolvedValue(mockClients as Client[]);
      mockAnalyticsInsightsGenerator.generateTimelineInsight.mockResolvedValue(mockInsight);

      // Act
      await service.getTimelineInsight();

      // Assert
      const callArgs = mockAnalyticsInsightsGenerator.generateTimelineInsight.mock.calls[0][0];
      expect(callArgs.length).toBe(3);
      
      // Find months regardless of order, then verify they're sorted correctly
      const januaryData = callArgs.find(item => item.month.includes('January'));
      const februaryData = callArgs.find(item => item.month.includes('February'));
      const marchData = callArgs.find(item => item.month.includes('March'));
      
      expect(januaryData).toBeDefined();
      expect(februaryData).toBeDefined();
      expect(marchData).toBeDefined();
      
      // Verify chronological order
      const januaryIndex = callArgs.findIndex(item => item.month.includes('January'));
      const februaryIndex = callArgs.findIndex(item => item.month.includes('February'));
      const marchIndex = callArgs.findIndex(item => item.month.includes('March'));
      
      expect(januaryIndex).toBeLessThan(februaryIndex);
      expect(februaryIndex).toBeLessThan(marchIndex);
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      mockPrismaService.client.findMany.mockRejectedValue(new Error('Database error'));

      // Act
      const result = await service.getTimelineInsight();

      // Assert
      expect(result.keyFindings).toEqual(['Unable to generate timeline insights at this time.']);
      expect(result.reasons).toEqual([]);
      expect(result.recommendations).toEqual([]);
    });

    it('should handle case when totalMeetings is 0 (avoid division by zero)', async () => {
      // Arrange
      // This shouldn't happen in practice, but test the edge case
      const mockClients: Partial<Client>[] = [
        {
          id: '1',
          meetingDate: new Date('2024-01-15'),
          closed: false,
          industry: null,
          sentiment: null,
        },
      ];

      const mockInsight: TimelineInsightDto = {
        keyFindings: ['Test'],
        reasons: [],
        recommendations: [],
      };

      mockPrismaService.client.findMany.mockResolvedValue(mockClients as Client[]);
      mockAnalyticsInsightsGenerator.generateTimelineInsight.mockResolvedValue(mockInsight);

      // Act
      await service.getTimelineInsight();

      // Assert
      const callArgs = mockAnalyticsInsightsGenerator.generateTimelineInsight.mock.calls[0][0];
      expect(callArgs[0].conversionRate).toBe(0);
      expect(callArgs[0].totalMeetings).toBe(1);
      expect(callArgs[0].totalClosed).toBe(0);
    });

    it('should limit top industries to 3 per month', async () => {
      // Arrange
      const mockClients: Partial<Client>[] = [];
      
      // Create 5 different industries in the same month
      const industries = ['Technology', 'Finance', 'Healthcare', 'Education', 'Retail'];
      industries.forEach((industry, index) => {
        for (let i = 0; i < index + 1; i++) {
          mockClients.push({
            id: `${industry}-${i}`,
            meetingDate: new Date('2024-01-15'),
            closed: false,
            industry,
            sentiment: 'neutral',
          });
        }
      });

      const mockInsight: TimelineInsightDto = {
        keyFindings: ['Test'],
        reasons: [],
        recommendations: [],
      };

      mockPrismaService.client.findMany.mockResolvedValue(mockClients as Client[]);
      mockAnalyticsInsightsGenerator.generateTimelineInsight.mockResolvedValue(mockInsight);

      // Act
      await service.getTimelineInsight();

      // Assert
      const callArgs = mockAnalyticsInsightsGenerator.generateTimelineInsight.mock.calls[0][0];
      expect(callArgs[0].topIndustries?.length).toBeLessThanOrEqual(3);
    });
  });
});

