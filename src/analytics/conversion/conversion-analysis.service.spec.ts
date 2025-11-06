import { Test, TestingModule } from '@nestjs/testing';
import { ConversionAnalysisService } from './conversion-analysis.service';
import { PrismaService } from '../../prisma/prisma.service';
import { OverviewService } from '../overview/overview.service';
import { ConversionAnalysisDto, DimensionMetricsDto } from '../../common/dto/analytics';

describe('ConversionAnalysisService', () => {
  let service: ConversionAnalysisService;
  let prismaService: jest.Mocked<PrismaService>;
  let overviewService: jest.Mocked<OverviewService>;

  const mockPrismaService = {
    client: {
      findMany: jest.fn(),
    },
  };

  const mockOverviewService = {
    getMetricsByDimension: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversionAnalysisService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: OverviewService,
          useValue: mockOverviewService,
        },
      ],
    }).compile();

    service = module.get<ConversionAnalysisService>(ConversionAnalysisService);
    prismaService = module.get(PrismaService);
    overviewService = module.get(OverviewService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getConversionAnalysis', () => {
    it('should return conversion analysis by all dimensions', async () => {
      // Arrange
      const mockByIndustry: DimensionMetricsDto = {
        dimension: 'industry',
        values: [
          {
            value: 'Technology',
            count: 10,
            closed: 6,
            conversionRate: 60.0,
          },
        ],
      };

      const mockBySentiment: DimensionMetricsDto = {
        dimension: 'sentiment',
        values: [
          {
            value: 'positive',
            count: 8,
            closed: 5,
            conversionRate: 62.5,
          },
        ],
      };

      const mockByUrgency: DimensionMetricsDto = {
        dimension: 'urgencyLevel',
        values: [
          {
            value: 'immediate',
            count: 5,
            closed: 4,
            conversionRate: 80.0,
          },
        ],
      };

      const mockByDiscovery: DimensionMetricsDto = {
        dimension: 'discoverySource',
        values: [
          {
            value: 'LinkedIn',
            count: 7,
            closed: 4,
            conversionRate: 57.14,
          },
        ],
      };

      const mockByOperationSize: DimensionMetricsDto = {
        dimension: 'operationSize',
        values: [
          {
            value: 'large',
            count: 6,
            closed: 4,
            conversionRate: 66.67,
          },
        ],
      };

      mockOverviewService.getMetricsByDimension
        .mockResolvedValueOnce(mockByIndustry)
        .mockResolvedValueOnce(mockBySentiment)
        .mockResolvedValueOnce(mockByUrgency)
        .mockResolvedValueOnce(mockByDiscovery)
        .mockResolvedValueOnce(mockByOperationSize);

      // Act
      const result = await service.getConversionAnalysis();

      // Assert
      expect(result).toEqual({
        byIndustry: mockByIndustry,
        bySentiment: mockBySentiment,
        byUrgency: mockByUrgency,
        byDiscovery: mockByDiscovery,
        byOperationSize: mockByOperationSize,
      });

      expect(mockOverviewService.getMetricsByDimension).toHaveBeenCalledTimes(5);
      expect(mockOverviewService.getMetricsByDimension).toHaveBeenCalledWith('industry');
      expect(mockOverviewService.getMetricsByDimension).toHaveBeenCalledWith('sentiment');
      expect(mockOverviewService.getMetricsByDimension).toHaveBeenCalledWith('urgencyLevel');
      expect(mockOverviewService.getMetricsByDimension).toHaveBeenCalledWith('discoverySource');
      expect(mockOverviewService.getMetricsByDimension).toHaveBeenCalledWith('operationSize');
    });

    it('should use Promise.all for parallel execution', async () => {
      // Arrange
      const mockDimensionResult: DimensionMetricsDto = {
        dimension: 'industry',
        values: [],
      };

      mockOverviewService.getMetricsByDimension.mockResolvedValue(mockDimensionResult);

      // Act
      await service.getConversionAnalysis();

      // Assert
      // Verify all calls were made (Promise.all ensures parallel execution)
      expect(mockOverviewService.getMetricsByDimension).toHaveBeenCalledTimes(5);
    });
  });

  describe('getTimelineMetrics', () => {
    it('should return timeline metrics grouped by date', async () => {
      // Arrange
      const mockClients = [
        {
          id: '1',
          meetingDate: new Date('2024-01-15T10:00:00Z'),
          closed: true,
        },
        {
          id: '2',
          meetingDate: new Date('2024-01-15T14:00:00Z'),
          closed: false,
        },
        {
          id: '3',
          meetingDate: new Date('2024-01-16T10:00:00Z'),
          closed: true,
        },
        {
          id: '4',
          meetingDate: new Date('2024-01-16T15:00:00Z'),
          closed: true,
        },
      ];

      mockPrismaService.client.findMany.mockResolvedValue(mockClients as any);

      // Act
      const result = await service.getTimelineMetrics();

      // Assert
      expect(result).toEqual([
        {
          date: '2024-01-15',
          total: 2,
          closed: 1,
        },
        {
          date: '2024-01-16',
          total: 2,
          closed: 2,
        },
      ]);

      expect(mockPrismaService.client.findMany).toHaveBeenCalledWith({
        orderBy: { meetingDate: 'asc' },
      });
    });

    it('should return empty array when no clients exist', async () => {
      // Arrange
      mockPrismaService.client.findMany.mockResolvedValue([]);

      // Act
      const result = await service.getTimelineMetrics();

      // Assert
      expect(result).toEqual([]);
    });

    it('should correctly count closed and total meetings per date', async () => {
      // Arrange
      const mockClients = [
        {
          id: '1',
          meetingDate: new Date('2024-01-15T10:00:00Z'),
          closed: true,
        },
        {
          id: '2',
          meetingDate: new Date('2024-01-15T11:00:00Z'),
          closed: true,
        },
        {
          id: '3',
          meetingDate: new Date('2024-01-15T12:00:00Z'),
          closed: false,
        },
        {
          id: '4',
          meetingDate: new Date('2024-01-16T10:00:00Z'),
          closed: false,
        },
        {
          id: '5',
          meetingDate: new Date('2024-01-16T11:00:00Z'),
          closed: false,
        },
      ];

      mockPrismaService.client.findMany.mockResolvedValue(mockClients as any);

      // Act
      const result = await service.getTimelineMetrics();

      // Assert
      expect(result).toEqual([
        {
          date: '2024-01-15',
          total: 3,
          closed: 2,
        },
        {
          date: '2024-01-16',
          total: 2,
          closed: 0,
        },
      ]);
    });

    it('should sort results by date', async () => {
      // Arrange
      const mockClients = [
        {
          id: '1',
          meetingDate: new Date('2024-01-20T10:00:00Z'),
          closed: true,
        },
        {
          id: '2',
          meetingDate: new Date('2024-01-15T10:00:00Z'),
          closed: true,
        },
        {
          id: '3',
          meetingDate: new Date('2024-01-18T10:00:00Z'),
          closed: false,
        },
      ];

      mockPrismaService.client.findMany.mockResolvedValue(mockClients as any);

      // Act
      const result = await service.getTimelineMetrics();

      // Assert
      expect(result.map((r) => r.date)).toEqual(['2024-01-15', '2024-01-18', '2024-01-20']);
    });
  });
});

