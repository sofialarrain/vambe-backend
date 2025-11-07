import { Test, TestingModule } from '@nestjs/testing';
import { TimelineInsightsService } from './timeline-insights.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { AnalyticsInsightsGeneratorService } from '../../../llm/generators/analytics-insights-generator.service';
import { Client } from '@prisma/client';
import { TimelineInsightDto } from '../../../common/dto/analytics';

describe('TimelineInsightsService', () => {
  let service: TimelineInsightsService;
  let prismaService: jest.Mocked<PrismaService>;
  let analyticsInsightsGenerator: jest.Mocked<AnalyticsInsightsGeneratorService>;

  const mockPrismaService = {
    client: {
      findMany: jest.fn(),
    },
  };

  const mockAnalyticsInsightsGenerator = {
    generateTimelineInsight: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TimelineInsightsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: AnalyticsInsightsGeneratorService,
          useValue: mockAnalyticsInsightsGenerator,
        },
      ],
    }).compile();

    service = module.get<TimelineInsightsService>(TimelineInsightsService);
    prismaService = module.get(PrismaService);
    analyticsInsightsGenerator = module.get(AnalyticsInsightsGeneratorService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getTimelineInsight', () => {
    it('should return timeline insight successfully', async () => {
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

      const result = await service.getTimelineInsight();

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
      const janDate1 = new Date(Date.UTC(2024, 0, 15, 12, 0, 0));
      const janDate2 = new Date(Date.UTC(2024, 0, 20, 12, 0, 0));
      const febDate = new Date(Date.UTC(2024, 1, 10, 12, 0, 0));

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

      await service.getTimelineInsight();

      const callArgs = mockAnalyticsInsightsGenerator.generateTimelineInsight.mock.calls[0][0];
      expect(callArgs.length).toBe(2);

      const januaryData = callArgs.find((item: { month: string }) => item.month?.includes('January'));
      const februaryData = callArgs.find((item: { month: string }) => item.month?.includes('February'));

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

      await service.getTimelineInsight();

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

      await service.getTimelineInsight();

      const callArgs = mockAnalyticsInsightsGenerator.generateTimelineInsight.mock.calls[0][0];
      expect(callArgs[0].avgSentiment).toBeDefined();
      expect(callArgs[0].avgSentiment).toBe('positive');
    });

    it('should handle null sentiment and industry values', async () => {
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

      await service.getTimelineInsight();

      const callArgs = mockAnalyticsInsightsGenerator.generateTimelineInsight.mock.calls[0][0];
      expect(callArgs[0].avgSentiment).toBe('positive');
    });

    it('should return fallback when no clients exist', async () => {
      mockPrismaService.client.findMany.mockResolvedValue([]);

      const result = await service.getTimelineInsight();

      expect(result.keyFindings).toEqual(['No timeline data available to analyze.']);
      expect(result.reasons).toEqual([]);
      expect(result.recommendations).toEqual([]);
      expect(mockAnalyticsInsightsGenerator.generateTimelineInsight).not.toHaveBeenCalled();
    });

    it('should sort timeline data chronologically', async () => {
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

      await service.getTimelineInsight();

      const callArgs = mockAnalyticsInsightsGenerator.generateTimelineInsight.mock.calls[0][0];
      expect(callArgs.length).toBe(3);

      const januaryData = callArgs.find((item: { month: string }) => item.month?.includes('January'));
      const februaryData = callArgs.find((item: { month: string }) => item.month?.includes('February'));
      const marchData = callArgs.find((item: { month: string }) => item.month?.includes('March'));

      expect(januaryData).toBeDefined();
      expect(februaryData).toBeDefined();
      expect(marchData).toBeDefined();

      const januaryIndex = callArgs.findIndex((item: { month: string }) => item.month?.includes('January'));
      const februaryIndex = callArgs.findIndex((item: { month: string }) => item.month?.includes('February'));
      const marchIndex = callArgs.findIndex((item: { month: string }) => item.month?.includes('March'));

      expect(januaryIndex).toBeLessThan(februaryIndex);
      expect(februaryIndex).toBeLessThan(marchIndex);
    });

    it('should handle errors gracefully', async () => {
      mockPrismaService.client.findMany.mockRejectedValue(new Error('Database error'));

      const result = await service.getTimelineInsight();

      expect(result.keyFindings).toEqual(['Unable to generate timeline insights at this time.']);
      expect(result.reasons).toEqual([]);
      expect(result.recommendations).toEqual([]);
    });

    it('should handle case when totalMeetings is 0 (avoid division by zero)', async () => {
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

      await service.getTimelineInsight();

      const callArgs = mockAnalyticsInsightsGenerator.generateTimelineInsight.mock.calls[0][0];
      expect(callArgs[0].conversionRate).toBe(0);
      expect(callArgs[0].totalMeetings).toBe(1);
      expect(callArgs[0].totalClosed).toBe(0);
    });

    it('should limit top industries to 3 per month', async () => {
      const mockClients: Partial<Client>[] = [];

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

      await service.getTimelineInsight();

      const callArgs = mockAnalyticsInsightsGenerator.generateTimelineInsight.mock.calls[0][0];
      expect(callArgs[0].topIndustries?.length).toBeLessThanOrEqual(3);
    });
  });
});

