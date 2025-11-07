import { Test, TestingModule } from '@nestjs/testing';
import { SellersRankingsService } from './sellers-rankings.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { ANALYTICS_CONSTANTS } from '../../../common/constants';
import { getSimulatedCurrentDate, getSimulatedCurrentYear } from '../../../common/utils/date.utils';

jest.mock('../../../common/utils/date.utils', () => ({
  getSimulatedCurrentDate: jest.fn(),
  getSimulatedCurrentYear: jest.fn(),
}));

describe('SellersRankingsService', () => {
  let service: SellersRankingsService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockPrismaService = {
    client: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SellersRankingsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<SellersRankingsService>(SellersRankingsService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getSellerOfWeek', () => {
    it('should return seller of the week with default current week', async () => {
      const mockDate = new Date('2024-01-15T10:00:00Z');
      (getSimulatedCurrentDate as jest.Mock).mockReturnValue(mockDate);

      const mockClients = [
        { assignedSeller: 'Seller 1', closed: true },
        { assignedSeller: 'Seller 1', closed: true },
        { assignedSeller: 'Seller 1', closed: false },
        { assignedSeller: 'Seller 2', closed: true },
        { assignedSeller: 'Seller 2', closed: false },
      ];

      mockPrismaService.client.findMany.mockResolvedValue(mockClients as any);

      const result = await service.getSellerOfWeek();

      expect(result.weekPodium).toHaveLength(2);
      expect(result.weekPodium[0].seller).toBe('Seller 1');
      expect(result.weekPodium[0].closed).toBe(2);
      expect(result.weekPodium[0].total).toBe(3);
      expect(result.weekPodium[1].seller).toBe('Seller 2');
      expect(result.weekPodium[1].closed).toBe(1);
      expect(result.weekPodium[1].total).toBe(2);
      expect(result.weekRange).toBeDefined();
    });

    it('should return seller of the week with specific week start date', async () => {
      const weekStart = '2024-01-01';
      const mockClients = [
        { assignedSeller: 'Seller 1', closed: true },
        { assignedSeller: 'Seller 1', closed: true },
      ];

      mockPrismaService.client.findMany.mockResolvedValue(mockClients as any);

      const result = await service.getSellerOfWeek(weekStart);

      expect(result.weekPodium).toHaveLength(1);
      expect(result.weekPodium[0].seller).toBe('Seller 1');
      expect(result.weekPodium[0].closed).toBe(2);
      expect(result.weekPodium[0].total).toBe(2);
    });

    it('should filter by year when provided', async () => {
      const weekStart = '2024-01-01';
      const year = 2024;
      const mockClients = [{ assignedSeller: 'Seller 1', closed: true }];

      mockPrismaService.client.findMany.mockResolvedValue(mockClients as any);

      const result = await service.getSellerOfWeek(weekStart, year);

      expect(result.weekPodium).toHaveLength(1);
      expect(mockPrismaService.client.findMany).toHaveBeenCalled();
    });

    it('should limit results to TOP_SELLERS', async () => {
      const mockDate = new Date('2024-01-15T10:00:00Z');
      (getSimulatedCurrentDate as jest.Mock).mockReturnValue(mockDate);

      const mockClients = Array.from({ length: 20 }, (_, i) => ({
        assignedSeller: `Seller ${i + 1}`,
        closed: true,
      }));

      mockPrismaService.client.findMany.mockResolvedValue(mockClients as any);

      const result = await service.getSellerOfWeek();

      expect(result.weekPodium.length).toBeLessThanOrEqual(ANALYTICS_CONSTANTS.LIMITS.TOP_SELLERS);
    });

    it('should return empty podium when no clients exist', async () => {
      const mockDate = new Date('2024-01-15T10:00:00Z');
      (getSimulatedCurrentDate as jest.Mock).mockReturnValue(mockDate);
      mockPrismaService.client.findMany.mockResolvedValue([]);

      const result = await service.getSellerOfWeek();

      expect(result.weekPodium).toEqual([]);
      expect(result.weekRange).toBeDefined();
    });
  });

  describe('getAnnualSellerRanking', () => {
    it('should return annual seller ranking for default year', async () => {
      const currentYear = 2024;
      (getSimulatedCurrentYear as jest.Mock).mockReturnValue(currentYear);

      const closedClients = [
        { assignedSeller: 'Seller 1', closed: true },
        { assignedSeller: 'Seller 1', closed: true },
        { assignedSeller: 'Seller 2', closed: true },
      ];

      const allClients = [
        ...closedClients,
        { assignedSeller: 'Seller 1', closed: false },
        { assignedSeller: 'Seller 2', closed: false },
      ];

      mockPrismaService.client.findMany
        .mockResolvedValueOnce(closedClients as any)
        .mockResolvedValueOnce(allClients as any);

      const result = await service.getAnnualSellerRanking();

      expect(result.year).toBe(currentYear);
      expect(result.ranking).toHaveLength(2);
      expect(result.ranking[0].seller).toBe('Seller 1');
      expect(result.ranking[0].closed).toBe(2);
      expect(result.ranking[0].total).toBe(3);
      expect(result.ranking[1].seller).toBe('Seller 2');
      expect(result.ranking[1].closed).toBe(1);
      expect(result.ranking[1].total).toBe(2);
    });

    it('should return annual seller ranking for specific year', async () => {
      const year = 2023;
      const closedClients = [{ assignedSeller: 'Seller 1', closed: true }];
      const allClients = [{ assignedSeller: 'Seller 1', closed: true }];

      mockPrismaService.client.findMany
        .mockResolvedValueOnce(closedClients as any)
        .mockResolvedValueOnce(allClients as any);

      const result = await service.getAnnualSellerRanking(year);

      expect(result.year).toBe(year);
      expect(result.ranking).toHaveLength(1);
      expect(result.ranking[0].seller).toBe('Seller 1');
    });

    it('should calculate conversion rate correctly', async () => {
      const year = 2024;
      const closedClients = [
        { assignedSeller: 'Seller 1', closed: true },
        { assignedSeller: 'Seller 1', closed: true },
      ];
      const allClients = [
        ...closedClients,
        { assignedSeller: 'Seller 1', closed: false },
        { assignedSeller: 'Seller 1', closed: false },
      ];

      mockPrismaService.client.findMany
        .mockResolvedValueOnce(closedClients as any)
        .mockResolvedValueOnce(allClients as any);

      const result = await service.getAnnualSellerRanking(year);

      expect(result.ranking[0].conversionRate).toBe(50.0);
    });

    it('should return zero conversion rate when no total clients', async () => {
      const year = 2024;
      const closedClients = [{ assignedSeller: 'Seller 1', closed: true }];
      const allClients: any[] = [];

      mockPrismaService.client.findMany
        .mockResolvedValueOnce(closedClients as any)
        .mockResolvedValueOnce(allClients);

      const result = await service.getAnnualSellerRanking(year);

      expect(result.ranking[0].conversionRate).toBe(0);
    });

    it('should return empty ranking when no clients exist', async () => {
      const year = 2024;
      mockPrismaService.client.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await service.getAnnualSellerRanking(year);

      expect(result.ranking).toEqual([]);
      expect(result.year).toBe(year);
    });
  });
});

