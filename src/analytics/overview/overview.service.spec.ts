import { Test, TestingModule } from '@nestjs/testing';
import { OverviewService } from './overview.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ANALYTICS_CONSTANTS } from '../../common/constants';
import { DimensionEnum } from '../../common/dto/analytics/queries.dto';

describe('OverviewService', () => {
  let service: OverviewService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockPrismaService = {
    client: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    $queryRaw: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OverviewService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<OverviewService>(OverviewService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getOverview', () => {
    it('should return overview metrics successfully', async () => {
      mockPrismaService.client.count
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(60)
        .mockResolvedValueOnce(95);

      const result = await service.getOverview();

      expect(result.totalClients).toBe(100);
      expect(result.totalClosed).toBe(60);
      expect(result.totalOpen).toBe(40);
      expect(result.conversionRate).toBe(60.0);
      expect(result.processedClients).toBe(95);
      expect(result.unprocessedClients).toBe(5);

      expect(mockPrismaService.client.count).toHaveBeenCalledTimes(3);
      expect(mockPrismaService.client.count).toHaveBeenNthCalledWith(1);
      expect(mockPrismaService.client.count).toHaveBeenNthCalledWith(2, { where: { closed: true } });
      expect(mockPrismaService.client.count).toHaveBeenNthCalledWith(3, { where: { processed: true } });
    });

    it('should return zero conversion rate when no clients exist', async () => {
      mockPrismaService.client.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      const result = await service.getOverview();

      expect(result.totalClients).toBe(0);
      expect(result.totalClosed).toBe(0);
      expect(result.totalOpen).toBe(0);
      expect(result.conversionRate).toBe(0);
      expect(result.processedClients).toBe(0);
      expect(result.unprocessedClients).toBe(0);
    });

    it('should use Promise.all for parallel execution', async () => {
      mockPrismaService.client.count
        .mockResolvedValueOnce(50)
        .mockResolvedValueOnce(30)
        .mockResolvedValueOnce(45);

      await service.getOverview();

      expect(mockPrismaService.client.count).toHaveBeenCalledTimes(3);
    });

    it('should calculate conversion rate correctly with decimal precision', async () => {
      mockPrismaService.client.count
        .mockResolvedValueOnce(33)
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(30);

      const result = await service.getOverview();

      expect(result.conversionRate).toBeCloseTo(30.3, 1);
    });
  });

  describe('getMetricsByDimension', () => {
    it('should return metrics by dimension successfully', async () => {
      const mockRawResults = [
        {
          value: 'Technology',
          count: BigInt(2),
          closed_count: BigInt(1),
          total_interaction_volume: BigInt(350),
        },
        {
          value: 'Finance',
          count: BigInt(1),
          closed_count: BigInt(1),
          total_interaction_volume: BigInt(0),
        },
      ];

      mockPrismaService.$queryRaw.mockResolvedValue(mockRawResults);

      const result = await service.getMetricsByDimension(DimensionEnum.INDUSTRY);

      expect(result.dimension).toBe('industry');
      expect(result.values.length).toBe(2);
      expect(result.values[0].value).toBe('Technology');
      expect(result.values[0].count).toBe(2);
      expect(result.values[0].closed).toBe(1);
      expect(result.values[0].conversionRate).toBe(50.0);
      expect(result.values[0].totalInteractionVolume).toBe(350);
      expect(mockPrismaService.$queryRaw).toHaveBeenCalled();
    });

    it('should include totalInteractionVolume only for industry dimension', async () => {
      const mockRawResults = [
        {
          value: 'positive',
          count: BigInt(2),
          closed_count: BigInt(1),
        },
      ];

      mockPrismaService.$queryRaw.mockResolvedValue(mockRawResults);

      const result = await service.getMetricsByDimension(DimensionEnum.SENTIMENT);

      expect(result.dimension).toBe('sentiment');
      expect(result.values[0].totalInteractionVolume).toBeUndefined();
      expect(mockPrismaService.$queryRaw).toHaveBeenCalled();
    });

    it('should filter out null values', async () => {
      const mockRawResults = [
        {
          value: 'Technology',
          count: BigInt(1),
          closed_count: BigInt(1),
          total_interaction_volume: BigInt(0),
        },
        {
          value: 'Finance',
          count: BigInt(1),
          closed_count: BigInt(1),
          total_interaction_volume: BigInt(0),
        },
      ];

      mockPrismaService.$queryRaw.mockResolvedValue(mockRawResults);

      const result = await service.getMetricsByDimension(DimensionEnum.INDUSTRY);

      expect(result.values.length).toBe(2);
      expect(result.values.find(v => v.value === null)).toBeUndefined();
    });

    it('should return empty array when no clients match dimension', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([]);

      const result = await service.getMetricsByDimension(DimensionEnum.SENTIMENT);

      expect(result.dimension).toBe('sentiment');
      expect(result.values).toEqual([]);
    });

    it('should sort values by count descending', async () => {
      const mockRawResults = [
        {
          value: 'Finance',
          count: BigInt(3),
          closed_count: BigInt(0),
          total_interaction_volume: BigInt(0),
        },
        {
          value: 'Technology',
          count: BigInt(1),
          closed_count: BigInt(0),
          total_interaction_volume: BigInt(0),
        },
      ];

      mockPrismaService.$queryRaw.mockResolvedValue(mockRawResults);

      const result = await service.getMetricsByDimension(DimensionEnum.INDUSTRY);

      expect(result.values[0].value).toBe('Finance');
      expect(result.values[0].count).toBe(3);
      expect(result.values[1].value).toBe('Technology');
      expect(result.values[1].count).toBe(1);
    });

    it('should handle zero conversion rate correctly', async () => {
      const mockRawResults = [
        {
          value: 'Technology',
          count: BigInt(2),
          closed_count: BigInt(0),
          total_interaction_volume: BigInt(0),
        },
      ];

      mockPrismaService.$queryRaw.mockResolvedValue(mockRawResults);

      const result = await service.getMetricsByDimension(DimensionEnum.INDUSTRY);

      expect(result.values[0].conversionRate).toBe(0);
    });

    it('should handle 100% conversion rate correctly', async () => {
      const mockRawResults = [
        {
          value: 'Technology',
          count: BigInt(2),
          closed_count: BigInt(2),
          total_interaction_volume: BigInt(0),
        },
      ];

      mockPrismaService.$queryRaw.mockResolvedValue(mockRawResults);

      const result = await service.getMetricsByDimension(DimensionEnum.INDUSTRY);

      expect(result.values[0].conversionRate).toBe(100);
    });

    it('should calculate interaction volume correctly for industry dimension', async () => {
      const mockRawResults = [
        {
          value: 'Technology',
          count: BigInt(3),
          closed_count: BigInt(0),
          total_interaction_volume: BigInt(250),
        },
      ];

      mockPrismaService.$queryRaw.mockResolvedValue(mockRawResults);

      const result = await service.getMetricsByDimension(DimensionEnum.INDUSTRY);

      expect(result.values[0].totalInteractionVolume).toBe(250);
    });

    it('should not include totalInteractionVolume for non-industry dimensions', async () => {
      const mockRawResults = [
        {
          value: 'positive',
          count: BigInt(1),
          closed_count: BigInt(1),
        },
      ];

      mockPrismaService.$queryRaw.mockResolvedValue(mockRawResults);

      const result = await service.getMetricsByDimension(DimensionEnum.SENTIMENT);

      expect(result.values[0].totalInteractionVolume).toBeUndefined();
    });
  });
});

