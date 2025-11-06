import { Test, TestingModule } from '@nestjs/testing';
import { PainPointsController } from './pain-points.controller';
import { PainPointsService } from './pain-points.service';
import { PainPointDto, TechnicalRequirementDto, VolumeVsConversionDto } from '../../common/dto/analytics';

describe('PainPointsController', () => {
  let controller: PainPointsController;
  let service: jest.Mocked<PainPointsService>;

  const mockPainPointsService = {
    getTopPainPoints: jest.fn(),
    getTopTechnicalRequirements: jest.fn(),
    getVolumeVsConversion: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PainPointsController],
      providers: [
        {
          provide: PainPointsService,
          useValue: mockPainPointsService,
        },
      ],
    }).compile();

    controller = module.get<PainPointsController>(PainPointsController);
    service = module.get(PainPointsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getPainPoints', () => {
    it('should return top pain points successfully', async () => {
      // Arrange
      const mockPainPoints: PainPointDto[] = [
        {
          painPoint: 'High workload',
          count: 10,
          conversionRate: 60.0,
        },
        {
          painPoint: 'Budget constraints',
          count: 8,
          conversionRate: 45.5,
        },
      ];

      mockPainPointsService.getTopPainPoints.mockResolvedValue(mockPainPoints);

      // Act
      const result = await controller.getPainPoints();

      // Assert
      expect(result).toEqual(mockPainPoints);
      expect(result.length).toBe(2);
      expect(result[0].painPoint).toBe('High workload');
      expect(service.getTopPainPoints).toHaveBeenCalledTimes(1);
      expect(service.getTopPainPoints).toHaveBeenCalledWith();
    });

    it('should return empty array when no pain points available', async () => {
      // Arrange
      mockPainPointsService.getTopPainPoints.mockResolvedValue([]);

      // Act
      const result = await controller.getPainPoints();

      // Assert
      expect(result).toEqual([]);
      expect(service.getTopPainPoints).toHaveBeenCalledTimes(1);
    });
  });

  describe('getTechnicalRequirements', () => {
    it('should return top technical requirements successfully', async () => {
      // Arrange
      const mockRequirements: TechnicalRequirementDto[] = [
        {
          requirement: 'API integration',
          count: 15,
        },
        {
          requirement: 'Real-time updates',
          count: 12,
        },
      ];

      mockPainPointsService.getTopTechnicalRequirements.mockResolvedValue(mockRequirements);

      // Act
      const result = await controller.getTechnicalRequirements();

      // Assert
      expect(result).toEqual(mockRequirements);
      expect(result.length).toBe(2);
      expect(result[0].requirement).toBe('API integration');
      expect(service.getTopTechnicalRequirements).toHaveBeenCalledTimes(1);
      expect(service.getTopTechnicalRequirements).toHaveBeenCalledWith();
    });

    it('should return empty array when no technical requirements available', async () => {
      // Arrange
      mockPainPointsService.getTopTechnicalRequirements.mockResolvedValue([]);

      // Act
      const result = await controller.getTechnicalRequirements();

      // Assert
      expect(result).toEqual([]);
      expect(service.getTopTechnicalRequirements).toHaveBeenCalledTimes(1);
    });
  });

  describe('getVolumeVsConversion', () => {
    it('should return volume vs conversion data successfully', async () => {
      // Arrange
      const mockVolumeData: VolumeVsConversionDto[] = [
        {
          volumeRange: '0-50',
          count: 5,
          conversionRate: 40.0,
        },
        {
          volumeRange: '51-100',
          count: 8,
          conversionRate: 62.5,
        },
      ];

      mockPainPointsService.getVolumeVsConversion.mockResolvedValue(mockVolumeData);

      // Act
      const result = await controller.getVolumeVsConversion();

      // Assert
      expect(result).toEqual(mockVolumeData);
      expect(result.length).toBe(2);
      expect(result[0].volumeRange).toBe('0-50');
      expect(service.getVolumeVsConversion).toHaveBeenCalledTimes(1);
      expect(service.getVolumeVsConversion).toHaveBeenCalledWith();
    });

    it('should return all volume ranges even when empty', async () => {
      // Arrange
      const mockVolumeData: VolumeVsConversionDto[] = [
        {
          volumeRange: '0-50',
          count: 0,
          conversionRate: 0,
        },
        {
          volumeRange: '51-100',
          count: 0,
          conversionRate: 0,
        },
        {
          volumeRange: '101-200',
          count: 0,
          conversionRate: 0,
        },
        {
          volumeRange: '201-300',
          count: 0,
          conversionRate: 0,
        },
        {
          volumeRange: '300+',
          count: 0,
          conversionRate: 0,
        },
      ];

      mockPainPointsService.getVolumeVsConversion.mockResolvedValue(mockVolumeData);

      // Act
      const result = await controller.getVolumeVsConversion();

      // Assert
      expect(result).toEqual(mockVolumeData);
      expect(result.length).toBe(5);
      expect(service.getVolumeVsConversion).toHaveBeenCalledTimes(1);
    });
  });
});

