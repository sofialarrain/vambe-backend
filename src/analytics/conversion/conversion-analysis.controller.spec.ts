import { Test, TestingModule } from '@nestjs/testing';
import { ConversionAnalysisController } from './conversion-analysis.controller';
import { ConversionAnalysisService } from './conversion-analysis.service';
import { ConversionAnalysisDto, TimelineMetricsDto } from '../../common/dto/analytics';

describe('ConversionAnalysisController', () => {
  let controller: ConversionAnalysisController;
  let service: jest.Mocked<ConversionAnalysisService>;

  const mockConversionAnalysisService = {
    getConversionAnalysis: jest.fn(),
    getTimelineMetrics: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConversionAnalysisController],
      providers: [
        {
          provide: ConversionAnalysisService,
          useValue: mockConversionAnalysisService,
        },
      ],
    }).compile();

    controller = module.get<ConversionAnalysisController>(
      ConversionAnalysisController,
    );
    service = module.get(ConversionAnalysisService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getTimeline', () => {
    it('should return timeline metrics successfully', async () => {
      // Arrange
      const mockTimelineMetrics: TimelineMetricsDto[] = [
        {
          date: '2024-01-15',
          total: 5,
          closed: 3,
        },
        {
          date: '2024-01-16',
          total: 8,
          closed: 5,
        },
      ];

      mockConversionAnalysisService.getTimelineMetrics.mockResolvedValue(
        mockTimelineMetrics,
      );

      // Act
      const result = await controller.getTimeline();

      // Assert
      expect(result).toEqual(mockTimelineMetrics);
      expect(service.getTimelineMetrics).toHaveBeenCalledTimes(1);
      expect(service.getTimelineMetrics).toHaveBeenCalledWith();
    });

    it('should return empty array when no timeline data exists', async () => {
      // Arrange
      mockConversionAnalysisService.getTimelineMetrics.mockResolvedValue([]);

      // Act
      const result = await controller.getTimeline();

      // Assert
      expect(result).toEqual([]);
      expect(service.getTimelineMetrics).toHaveBeenCalledTimes(1);
    });

    it('should handle service errors', async () => {
      // Arrange
      const error = new Error('Database connection failed');
      mockConversionAnalysisService.getTimelineMetrics.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.getTimeline()).rejects.toThrow(
        'Database connection failed',
      );
      expect(service.getTimelineMetrics).toHaveBeenCalledTimes(1);
    });
  });

  describe('getConversionAnalysis', () => {
    it('should return conversion analysis successfully', async () => {
      // Arrange
      const mockConversionAnalysis: ConversionAnalysisDto = {
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
        bySentiment: {
          dimension: 'sentiment',
          values: [
            {
              value: 'positive',
              count: 8,
              closed: 5,
              conversionRate: 62.5,
            },
          ],
        },
        byUrgency: {
          dimension: 'urgencyLevel',
          values: [
            {
              value: 'immediate',
              count: 5,
              closed: 4,
              conversionRate: 80.0,
            },
          ],
        },
        byDiscovery: {
          dimension: 'discoverySource',
          values: [
            {
              value: 'LinkedIn',
              count: 7,
              closed: 4,
              conversionRate: 57.14,
            },
          ],
        },
        byOperationSize: {
          dimension: 'operationSize',
          values: [
            {
              value: 'large',
              count: 6,
              closed: 4,
              conversionRate: 66.67,
            },
          ],
        },
      };

      mockConversionAnalysisService.getConversionAnalysis.mockResolvedValue(
        mockConversionAnalysis,
      );

      // Act
      const result = await controller.getConversionAnalysis();

      // Assert
      expect(result).toEqual(mockConversionAnalysis);
      expect(result.byIndustry).toBeDefined();
      expect(result.bySentiment).toBeDefined();
      expect(result.byUrgency).toBeDefined();
      expect(result.byDiscovery).toBeDefined();
      expect(result.byOperationSize).toBeDefined();
      expect(service.getConversionAnalysis).toHaveBeenCalledTimes(1);
      expect(service.getConversionAnalysis).toHaveBeenCalledWith();
    });

    it('should return conversion analysis with empty values', async () => {
      // Arrange
      const mockEmptyConversionAnalysis: ConversionAnalysisDto = {
        byIndustry: {
          dimension: 'industry',
          values: [],
        },
        bySentiment: {
          dimension: 'sentiment',
          values: [],
        },
        byUrgency: {
          dimension: 'urgencyLevel',
          values: [],
        },
        byDiscovery: {
          dimension: 'discoverySource',
          values: [],
        },
        byOperationSize: {
          dimension: 'operationSize',
          values: [],
        },
      };

      mockConversionAnalysisService.getConversionAnalysis.mockResolvedValue(
        mockEmptyConversionAnalysis,
      );

      // Act
      const result = await controller.getConversionAnalysis();

      // Assert
      expect(result).toEqual(mockEmptyConversionAnalysis);
      expect(result.byIndustry.values).toEqual([]);
      expect(result.bySentiment.values).toEqual([]);
      expect(service.getConversionAnalysis).toHaveBeenCalledTimes(1);
    });

    it('should handle service errors', async () => {
      // Arrange
      const error = new Error('Service unavailable');
      mockConversionAnalysisService.getConversionAnalysis.mockRejectedValue(
        error,
      );

      // Act & Assert
      await expect(controller.getConversionAnalysis()).rejects.toThrow(
        'Service unavailable',
      );
      expect(service.getConversionAnalysis).toHaveBeenCalledTimes(1);
    });
  });
});

