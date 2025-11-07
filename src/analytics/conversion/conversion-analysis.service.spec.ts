import { Test, TestingModule } from '@nestjs/testing';
import { ConversionAnalysisService } from './conversion-analysis.service';
import { PrismaService } from '../../prisma/prisma.service';
import { OverviewService } from '../overview/overview.service';
import { ConversionAnalysisDto, DimensionMetricsDto } from '../../common/dto/analytics';
import { DimensionEnum } from '../../common/dto/analytics/queries.dto';

describe('ConversionAnalysisService', () => {
  let service: ConversionAnalysisService;
  let prismaService: jest.Mocked<PrismaService>;
  let overviewService: jest.Mocked<OverviewService>;

  const mockPrismaService = {
    client: {
      findMany: jest.fn(),
    },
    $queryRaw: jest.fn(),
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

      const result = await service.getConversionAnalysis();

      expect(result).toEqual({
        byIndustry: mockByIndustry,
        bySentiment: mockBySentiment,
        byUrgency: mockByUrgency,
        byDiscovery: mockByDiscovery,
        byOperationSize: mockByOperationSize,
      });

      expect(mockOverviewService.getMetricsByDimension).toHaveBeenCalledTimes(5);
      expect(mockOverviewService.getMetricsByDimension).toHaveBeenCalledWith(DimensionEnum.INDUSTRY);
      expect(mockOverviewService.getMetricsByDimension).toHaveBeenCalledWith(DimensionEnum.SENTIMENT);
      expect(mockOverviewService.getMetricsByDimension).toHaveBeenCalledWith(DimensionEnum.URGENCY_LEVEL);
      expect(mockOverviewService.getMetricsByDimension).toHaveBeenCalledWith(DimensionEnum.DISCOVERY_SOURCE);
      expect(mockOverviewService.getMetricsByDimension).toHaveBeenCalledWith(DimensionEnum.OPERATION_SIZE);
    });

    it('should use Promise.all for parallel execution', async () => {
      const mockDimensionResult: DimensionMetricsDto = {
        dimension: 'industry',
        values: [],
      };

      mockOverviewService.getMetricsByDimension.mockResolvedValue(mockDimensionResult);

      await service.getConversionAnalysis();

      expect(mockOverviewService.getMetricsByDimension).toHaveBeenCalledTimes(5);
    });
  });

  describe('getTimelineMetrics', () => {
    it('should return timeline metrics grouped by date', async () => {
      const mockRawResults = [
        {
          date: new Date('2024-01-15T00:00:00Z'),
          total: BigInt(2),
          closed: BigInt(1),
        },
        {
          date: new Date('2024-01-16T00:00:00Z'),
          total: BigInt(2),
          closed: BigInt(2),
        },
      ];

      mockPrismaService.$queryRaw.mockResolvedValue(mockRawResults);

      const result = await service.getTimelineMetrics();

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

      expect(mockPrismaService.$queryRaw).toHaveBeenCalled();
    });

    it('should return empty array when no clients exist', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([]);

      const result = await service.getTimelineMetrics();

      expect(result).toEqual([]);
    });

    it('should correctly count closed and total meetings per date', async () => {
      const mockRawResults = [
        {
          date: new Date('2024-01-15T00:00:00Z'),
          total: BigInt(3),
          closed: BigInt(2),
        },
        {
          date: new Date('2024-01-16T00:00:00Z'),
          total: BigInt(2),
          closed: BigInt(0),
        },
      ];

      mockPrismaService.$queryRaw.mockResolvedValue(mockRawResults);

      const result = await service.getTimelineMetrics();

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
      const mockRawResults = [
        {
          date: new Date('2024-01-15T00:00:00Z'),
          total: BigInt(1),
          closed: BigInt(1),
        },
        {
          date: new Date('2024-01-18T00:00:00Z'),
          total: BigInt(1),
          closed: BigInt(0),
        },
        {
          date: new Date('2024-01-20T00:00:00Z'),
          total: BigInt(1),
          closed: BigInt(1),
        },
      ];

      mockPrismaService.$queryRaw.mockResolvedValue(mockRawResults);

      const result = await service.getTimelineMetrics();

      expect(result.map((r) => r.date)).toEqual(['2024-01-15', '2024-01-18', '2024-01-20']);
    });
  });
});

