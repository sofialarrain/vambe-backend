import { Test, TestingModule } from '@nestjs/testing';
import { PredictionsController } from './predictions.controller';
import { PredictionsService } from './predictions.service';
import { ConversionPredictionDto, FutureProjectionDto } from '../../common/dto/analytics';

describe('PredictionsController', () => {
  let controller: PredictionsController;
  let service: jest.Mocked<PredictionsService>;

  const mockPredictionsService = {
    getFutureProjection: jest.fn(),
    getConversionPredictions: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PredictionsController],
      providers: [
        {
          provide: PredictionsService,
          useValue: mockPredictionsService,
        },
      ],
    }).compile();

    controller = module.get<PredictionsController>(PredictionsController);
    service = module.get(PredictionsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getFutureProjection', () => {
    it('should return future projection successfully', async () => {
      // Arrange
      const mockProjection: FutureProjectionDto = {
        nextWeek: {
          estimatedClosed: 5,
          estimatedMeetings: 12,
          confidence: 'high',
          trend: 'increasing',
          trendClosed: 'increasing',
          trendMeetings: 'stable',
        },
        nextMonth: {
          estimatedClosed: 20,
          estimatedMeetings: 48,
          confidence: 'high',
          trend: 'increasing',
          trendClosed: 'increasing',
          trendMeetings: 'stable',
        },
        message: 'Based on current month performance (2.50 closed deals per day) (4.00 meetings per day), we estimate 5 closed deals and 12 meetings next week, and 20 closed deals and 48 meetings next month.',
        dataPoints: 4,
        timelineData: [],
      };

      mockPredictionsService.getFutureProjection.mockResolvedValue(mockProjection);

      // Act
      const result = await controller.getFutureProjection();

      // Assert
      expect(result).toEqual(mockProjection);
      expect(result.nextWeek.estimatedClosed).toBe(5);
      expect(result.nextMonth.estimatedClosed).toBe(20);
      expect(service.getFutureProjection).toHaveBeenCalledTimes(1);
      expect(service.getFutureProjection).toHaveBeenCalledWith();
    });

    it('should handle empty data gracefully', async () => {
      // Arrange
      const mockProjection: FutureProjectionDto = {
        nextWeek: {
          estimatedClosed: 0,
          estimatedMeetings: 0,
          confidence: 'low',
          trend: 'neutral',
        },
        nextMonth: {
          estimatedClosed: 0,
          estimatedMeetings: 0,
          confidence: 'low',
          trend: 'neutral',
        },
        message: 'Insufficient data for projection.',
      };

      mockPredictionsService.getFutureProjection.mockResolvedValue(mockProjection);

      // Act
      const result = await controller.getFutureProjection();

      // Assert
      expect(result).toEqual(mockProjection);
      expect(result.message).toBe('Insufficient data for projection.');
      expect(service.getFutureProjection).toHaveBeenCalledTimes(1);
    });
  });

  describe('getConversionPredictions', () => {
    it('should return conversion predictions successfully', async () => {
      // Arrange
      const mockPredictions: ConversionPredictionDto[] = [
        {
          clientName: 'Client A',
          probability: 0.85,
          recommendation: 'High probability of conversion. Focus on addressing technical requirements.',
          industry: 'Technology',
          seller: 'Seller 1',
          urgencyLevel: 'immediate',
        },
        {
          clientName: 'Client B',
          probability: 0.65,
          recommendation: 'Moderate probability. Follow up with pain point solutions.',
          industry: 'Finance',
          seller: 'Seller 2',
          urgencyLevel: 'planned',
        },
      ];

      mockPredictionsService.getConversionPredictions.mockResolvedValue(mockPredictions);

      // Act
      const result = await controller.getConversionPredictions();

      // Assert
      expect(result).toEqual(mockPredictions);
      expect(result.length).toBe(2);
      expect(result[0].clientName).toBe('Client A');
      expect(result[0].probability).toBe(0.85);
      expect(service.getConversionPredictions).toHaveBeenCalledTimes(1);
      expect(service.getConversionPredictions).toHaveBeenCalledWith();
    });

    it('should return empty array when no open deals available', async () => {
      // Arrange
      mockPredictionsService.getConversionPredictions.mockResolvedValue([]);

      // Act
      const result = await controller.getConversionPredictions();

      // Assert
      expect(result).toEqual([]);
      expect(service.getConversionPredictions).toHaveBeenCalledTimes(1);
    });
  });
});

