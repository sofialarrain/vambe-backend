import { Test, TestingModule } from '@nestjs/testing';
import { OverviewService } from './overview.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ANALYTICS_CONSTANTS } from '../../common/constants';

describe('OverviewService', () => {
  let service: OverviewService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockPrismaService = {
    client: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
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
      // Arrange
      mockPrismaService.client.count
        .mockResolvedValueOnce(100) // totalClients
        .mockResolvedValueOnce(60) // totalClosed
        .mockResolvedValueOnce(95); // processedClients

      // Act
      const result = await service.getOverview();

      // Assert
      expect(result.totalClients).toBe(100);
      expect(result.totalClosed).toBe(60);
      expect(result.totalOpen).toBe(40); // 100 - 60
      expect(result.conversionRate).toBe(60.0); // (60/100) * 100
      expect(result.processedClients).toBe(95);
      expect(result.unprocessedClients).toBe(5); // 100 - 95

      expect(mockPrismaService.client.count).toHaveBeenCalledTimes(3);
      expect(mockPrismaService.client.count).toHaveBeenNthCalledWith(1);
      expect(mockPrismaService.client.count).toHaveBeenNthCalledWith(2, { where: { closed: true } });
      expect(mockPrismaService.client.count).toHaveBeenNthCalledWith(3, { where: { processed: true } });
    });

    it('should return zero conversion rate when no clients exist', async () => {
      // Arrange
      mockPrismaService.client.count
        .mockResolvedValueOnce(0) // totalClients
        .mockResolvedValueOnce(0) // totalClosed
        .mockResolvedValueOnce(0); // processedClients

      // Act
      const result = await service.getOverview();

      // Assert
      expect(result.totalClients).toBe(0);
      expect(result.totalClosed).toBe(0);
      expect(result.totalOpen).toBe(0);
      expect(result.conversionRate).toBe(0);
      expect(result.processedClients).toBe(0);
      expect(result.unprocessedClients).toBe(0);
    });

    it('should use Promise.all for parallel execution', async () => {
      // Arrange
      mockPrismaService.client.count
        .mockResolvedValueOnce(50)
        .mockResolvedValueOnce(30)
        .mockResolvedValueOnce(45);

      // Act
      await service.getOverview();

      // Assert
      // Verify all calls were made (Promise.all ensures parallel execution)
      expect(mockPrismaService.client.count).toHaveBeenCalledTimes(3);
    });

    it('should calculate conversion rate correctly with decimal precision', async () => {
      // Arrange
      mockPrismaService.client.count
        .mockResolvedValueOnce(33) // totalClients
        .mockResolvedValueOnce(10) // totalClosed
        .mockResolvedValueOnce(30); // processedClients

      // Act
      const result = await service.getOverview();

      // Assert
      // 10/33 * 100 = 30.30...
      expect(result.conversionRate).toBeCloseTo(30.3, 1);
    });
  });

  describe('getMetricsByDimension', () => {
    it('should return metrics by dimension successfully', async () => {
      // Arrange
      const mockClients = [
        {
          id: '1',
          industry: 'Technology',
          closed: true,
          interactionVolume: 150,
        },
        {
          id: '2',
          industry: 'Technology',
          closed: false,
          interactionVolume: 200,
        },
        {
          id: '3',
          industry: 'Finance',
          closed: true,
          interactionVolume: null,
        },
      ];

      mockPrismaService.client.findMany.mockResolvedValue(mockClients as any);

      // Act
      const result = await service.getMetricsByDimension('industry');

      // Assert
      expect(result.dimension).toBe('industry');
      expect(result.values.length).toBe(2);
      expect(result.values[0].value).toBe('Technology');
      expect(result.values[0].count).toBe(2);
      expect(result.values[0].closed).toBe(1);
      expect(result.values[0].conversionRate).toBe(50.0);
      expect(result.values[0].totalInteractionVolume).toBe(350); // 150 + 200
      expect(mockPrismaService.client.findMany).toHaveBeenCalledWith({
        where: {
          processed: true,
          industry: { not: null },
        },
      });
    });

    it('should include totalInteractionVolume only for industry dimension', async () => {
      // Arrange
      const mockClients = [
        {
          id: '1',
          sentiment: 'positive',
          closed: true,
          interactionVolume: 150,
        },
        {
          id: '2',
          sentiment: 'positive',
          closed: false,
          interactionVolume: 200,
        },
      ];

      mockPrismaService.client.findMany.mockResolvedValue(mockClients as any);

      // Act
      const result = await service.getMetricsByDimension('sentiment');

      // Assert
      expect(result.dimension).toBe('sentiment');
      expect(result.values[0].totalInteractionVolume).toBeUndefined();
    });

    it('should filter out null values', async () => {
      // Arrange
      const mockClients = [
        {
          id: '1',
          industry: 'Technology',
          closed: true,
        },
        {
          id: '2',
          industry: null,
          closed: false,
        },
        {
          id: '3',
          industry: 'Finance',
          closed: true,
        },
      ];

      mockPrismaService.client.findMany.mockResolvedValue(mockClients as any);

      // Act
      const result = await service.getMetricsByDimension('industry');

      // Assert
      expect(result.values.length).toBe(2);
      expect(result.values.find(v => v.value === null)).toBeUndefined();
    });

    it('should return empty array when no clients match dimension', async () => {
      // Arrange
      mockPrismaService.client.findMany.mockResolvedValue([]);

      // Act
      const result = await service.getMetricsByDimension('sentiment');

      // Assert
      expect(result.dimension).toBe('sentiment');
      expect(result.values).toEqual([]);
    });

    it('should sort values by count descending', async () => {
      // Arrange
      const mockClients = [
        {
          id: '1',
          industry: 'Technology',
          closed: false,
        },
        {
          id: '2',
          industry: 'Finance',
          closed: false,
        },
        {
          id: '3',
          industry: 'Finance',
          closed: false,
        },
        {
          id: '4',
          industry: 'Finance',
          closed: false,
        },
      ];

      mockPrismaService.client.findMany.mockResolvedValue(mockClients as any);

      // Act
      const result = await service.getMetricsByDimension('industry');

      // Assert
      expect(result.values[0].value).toBe('Finance');
      expect(result.values[0].count).toBe(3);
      expect(result.values[1].value).toBe('Technology');
      expect(result.values[1].count).toBe(1);
    });

    it('should handle zero conversion rate correctly', async () => {
      // Arrange
      const mockClients = [
        {
          id: '1',
          industry: 'Technology',
          closed: false,
        },
        {
          id: '2',
          industry: 'Technology',
          closed: false,
        },
      ];

      mockPrismaService.client.findMany.mockResolvedValue(mockClients as any);

      // Act
      const result = await service.getMetricsByDimension('industry');

      // Assert
      expect(result.values[0].conversionRate).toBe(0);
    });

    it('should handle 100% conversion rate correctly', async () => {
      // Arrange
      const mockClients = [
        {
          id: '1',
          industry: 'Technology',
          closed: true,
        },
        {
          id: '2',
          industry: 'Technology',
          closed: true,
        },
      ];

      mockPrismaService.client.findMany.mockResolvedValue(mockClients as any);

      // Act
      const result = await service.getMetricsByDimension('industry');

      // Assert
      expect(result.values[0].conversionRate).toBe(100);
    });

    it('should calculate interaction volume correctly for industry dimension', async () => {
      // Arrange
      const mockClients = [
        {
          id: '1',
          industry: 'Technology',
          closed: false,
          interactionVolume: 100,
        },
        {
          id: '2',
          industry: 'Technology',
          closed: false,
          interactionVolume: 150,
        },
        {
          id: '3',
          industry: 'Technology',
          closed: false,
          interactionVolume: null, // Should be ignored
        },
      ];

      mockPrismaService.client.findMany.mockResolvedValue(mockClients as any);

      // Act
      const result = await service.getMetricsByDimension('industry');

      // Assert
      expect(result.values[0].totalInteractionVolume).toBe(250); // 100 + 150
    });

    it('should not include totalInteractionVolume for non-industry dimensions', async () => {
      // Arrange
      const mockClients = [
        {
          id: '1',
          sentiment: 'positive',
          closed: true,
          interactionVolume: 100,
        },
      ];

      mockPrismaService.client.findMany.mockResolvedValue(mockClients as any);

      // Act
      const result = await service.getMetricsByDimension('sentiment');

      // Assert
      expect(result.values[0].totalInteractionVolume).toBeUndefined();
    });
  });
});

