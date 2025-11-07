import { Test, TestingModule } from '@nestjs/testing';
import { SellersMetricsService } from './sellers-metrics.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { ANALYTICS_CONSTANTS } from '../../../common/constants';

describe('SellersMetricsService', () => {
  let service: SellersMetricsService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockPrismaService = {
    client: {
      groupBy: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SellersMetricsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<SellersMetricsService>(SellersMetricsService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getSellerMetrics', () => {
    it('should return seller metrics sorted by conversion rate', async () => {
      // Arrange
      const groupByResult = [
        { assignedSeller: 'Seller 1', _count: { id: 10 } },
        { assignedSeller: 'Seller 2', _count: { id: 8 } },
        { assignedSeller: 'Seller 3', _count: { id: 5 } },
      ];

      mockPrismaService.client.groupBy.mockResolvedValue(groupByResult as any);
      mockPrismaService.client.count
        .mockResolvedValueOnce(8)
        .mockResolvedValueOnce(4)
        .mockResolvedValueOnce(5);

      // Act
      const result = await service.getSellerMetrics();

      // Assert
      expect(result).toHaveLength(3);
      expect(result[0].seller).toBe('Seller 3');
      expect(result[0].conversionRate).toBe(100.0);
      expect(result[1].seller).toBe('Seller 1');
      expect(result[1].conversionRate).toBe(80.0);
      expect(result[2].seller).toBe('Seller 2');
      expect(result[2].conversionRate).toBe(50.0);

      expect(mockPrismaService.client.groupBy).toHaveBeenCalledWith({
        by: ['assignedSeller'],
        _count: { id: true },
      });
      expect(mockPrismaService.client.count).toHaveBeenCalledTimes(3);
    });

    it('should return empty array when no sellers exist', async () => {
      mockPrismaService.client.groupBy.mockResolvedValue([]);

      const result = await service.getSellerMetrics();

      expect(result).toEqual([]);
      expect(mockPrismaService.client.count).not.toHaveBeenCalled();
    });

    it('should calculate conversion rate correctly with decimal places', async () => {
      const groupByResult = [{ assignedSeller: 'Seller 1', _count: { id: 3 } }];
      mockPrismaService.client.groupBy.mockResolvedValue(groupByResult as any);
      mockPrismaService.client.count.mockResolvedValueOnce(1);

      const result = await service.getSellerMetrics();

      expect(result[0].conversionRate).toBeCloseTo(33.33, ANALYTICS_CONSTANTS.DECIMAL_PLACES);
      expect(result[0].total).toBe(3);
      expect(result[0].closed).toBe(1);
    });

    it('should handle zero closed deals correctly', async () => {
      const groupByResult = [{ assignedSeller: 'Seller 1', _count: { id: 5 } }];
      mockPrismaService.client.groupBy.mockResolvedValue(groupByResult as any);
      mockPrismaService.client.count.mockResolvedValueOnce(0);

      const result = await service.getSellerMetrics();

      expect(result[0].conversionRate).toBe(0);
      expect(result[0].total).toBe(5);
      expect(result[0].closed).toBe(0);
    });
  });
});

