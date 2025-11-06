import { Test, TestingModule } from '@nestjs/testing';
import { OverviewController } from './overview.controller';
import { OverviewService } from './overview.service';
import { OverviewMetricsDto, DimensionMetricsDto } from '../../common/dto/analytics';
import { DimensionQueryDto, DimensionEnum } from '../../common/dto/analytics/queries.dto';

describe('OverviewController', () => {
  let controller: OverviewController;
  let service: jest.Mocked<OverviewService>;

  const mockOverviewService = {
    getOverview: jest.fn(),
    getMetricsByDimension: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OverviewController],
      providers: [
        {
          provide: OverviewService,
          useValue: mockOverviewService,
        },
      ],
    }).compile();

    controller = module.get<OverviewController>(OverviewController);
    service = module.get(OverviewService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getOverview', () => {
    it('should return overview metrics successfully', async () => {
      // Arrange
      const mockOverview: OverviewMetricsDto = {
        totalClients: 100,
        totalClosed: 60,
        totalOpen: 40,
        conversionRate: 60.0,
        processedClients: 95,
        unprocessedClients: 5,
      };

      mockOverviewService.getOverview.mockResolvedValue(mockOverview);

      // Act
      const result = await controller.getOverview();

      // Assert
      expect(result).toEqual(mockOverview);
      expect(result.totalClients).toBe(100);
      expect(result.conversionRate).toBe(60.0);
      expect(service.getOverview).toHaveBeenCalledTimes(1);
      expect(service.getOverview).toHaveBeenCalledWith();
    });

    it('should handle service errors', async () => {
      // Arrange
      const error = new Error('Database connection failed');
      mockOverviewService.getOverview.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.getOverview()).rejects.toThrow('Database connection failed');
      expect(service.getOverview).toHaveBeenCalledTimes(1);
    });
  });

  describe('getByDimension', () => {
    it('should return metrics by dimension successfully', async () => {
      // Arrange
      const query: DimensionQueryDto = { dimension: DimensionEnum.INDUSTRY };
      const mockDimensionMetrics: DimensionMetricsDto = {
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

      mockOverviewService.getMetricsByDimension.mockResolvedValue(mockDimensionMetrics);

      // Act
      const result = await controller.getByDimension(query);

      // Assert
      expect(result).toEqual(mockDimensionMetrics);
      expect(result.dimension).toBe('industry');
      expect(result.values).toBeDefined();
      expect(service.getMetricsByDimension).toHaveBeenCalledTimes(1);
      expect(service.getMetricsByDimension).toHaveBeenCalledWith(query.dimension);
    });

    it('should handle different dimension types', async () => {
      // Arrange
      const query: DimensionQueryDto = { dimension: DimensionEnum.SENTIMENT };
      const mockDimensionMetrics: DimensionMetricsDto = {
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

      mockOverviewService.getMetricsByDimension.mockResolvedValue(mockDimensionMetrics);

      // Act
      const result = await controller.getByDimension(query);

      // Assert
      expect(result.dimension).toBe('sentiment');
      expect(service.getMetricsByDimension).toHaveBeenCalledWith('sentiment');
    });

    it('should handle service errors', async () => {
      // Arrange
      const query: DimensionQueryDto = { dimension: DimensionEnum.INDUSTRY };
      const error = new Error('Service unavailable');
      mockOverviewService.getMetricsByDimension.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.getByDimension(query)).rejects.toThrow('Service unavailable');
      expect(service.getMetricsByDimension).toHaveBeenCalledTimes(1);
    });

    it('should return empty values when no data exists', async () => {
      // Arrange
      const query: DimensionQueryDto = { dimension: DimensionEnum.INDUSTRY };
      const mockEmptyMetrics: DimensionMetricsDto = {
        dimension: 'industry',
        values: [],
      };

      mockOverviewService.getMetricsByDimension.mockResolvedValue(mockEmptyMetrics);

      // Act
      const result = await controller.getByDimension(query);

      // Assert
      expect(result.values).toEqual([]);
      expect(service.getMetricsByDimension).toHaveBeenCalledTimes(1);
    });
  });
});

