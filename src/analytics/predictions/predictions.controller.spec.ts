import { Test, TestingModule } from '@nestjs/testing';
import { PredictionsController } from './predictions.controller';
import { ConversionPredictionsService } from './services/conversion-predictions.service';
import { FutureProjectionsService } from './services/future-projections.service';
import { ConversionPredictionDto, FutureProjectionDto } from '../../common/dto/analytics';

describe('PredictionsController', () => {
  let controller: PredictionsController;
  let conversionPredictionsService: jest.Mocked<ConversionPredictionsService>;
  let futureProjectionsService: jest.Mocked<FutureProjectionsService>;

  const mockConversionPredictionsService = {
    getConversionPredictions: jest.fn(),
  };

  const mockFutureProjectionsService = {
    getFutureProjection: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PredictionsController],
      providers: [
        {
          provide: ConversionPredictionsService,
          useValue: mockConversionPredictionsService,
        },
        {
          provide: FutureProjectionsService,
          useValue: mockFutureProjectionsService,
        },
      ],
    }).compile();

    controller = module.get<PredictionsController>(PredictionsController);
    conversionPredictionsService = module.get(ConversionPredictionsService);
    futureProjectionsService = module.get(FutureProjectionsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getFutureProjection', () => {
    it('should return future projection successfully', async () => {
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

      mockFutureProjectionsService.getFutureProjection.mockResolvedValue(mockProjection);

      const result = await controller.getFutureProjection();

      expect(result).toEqual(mockProjection);
      expect(result.nextWeek.estimatedClosed).toBe(5);
      expect(result.nextMonth.estimatedClosed).toBe(20);
      expect(futureProjectionsService.getFutureProjection).toHaveBeenCalledTimes(1);
      expect(futureProjectionsService.getFutureProjection).toHaveBeenCalledWith();
    });

    it('should handle empty data gracefully', async () => {
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

      mockFutureProjectionsService.getFutureProjection.mockResolvedValue(mockProjection);

      const result = await controller.getFutureProjection();

      expect(result).toEqual(mockProjection);
      expect(result.message).toBe('Insufficient data for projection.');
      expect(futureProjectionsService.getFutureProjection).toHaveBeenCalledTimes(1);
    });
  });

  describe('getConversionPredictions', () => {
    it('should return conversion predictions successfully', async () => {
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

      mockConversionPredictionsService.getConversionPredictions.mockResolvedValue(mockPredictions);

      const result = await controller.getConversionPredictions();

      expect(result).toEqual(mockPredictions);
      expect(result.length).toBe(2);
      expect(result[0].clientName).toBe('Client A');
      expect(result[0].probability).toBe(0.85);
      expect(conversionPredictionsService.getConversionPredictions).toHaveBeenCalledTimes(1);
      expect(conversionPredictionsService.getConversionPredictions).toHaveBeenCalledWith();
    });

    it('should return empty array when no open deals available', async () => {
      mockConversionPredictionsService.getConversionPredictions.mockResolvedValue([]);

      const result = await controller.getConversionPredictions();

      expect(result).toEqual([]);
      expect(conversionPredictionsService.getConversionPredictions).toHaveBeenCalledTimes(1);
    });
  });
});

