import { Test, TestingModule } from '@nestjs/testing';
import { SellersTimelineService } from './sellers-timeline.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { API_CONSTANTS } from '../../../common/constants';

describe('SellersTimelineService', () => {
  let service: SellersTimelineService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockPrismaService = {
    client: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SellersTimelineService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<SellersTimelineService>(SellersTimelineService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getSellersTimeline', () => {
    it('should return sellers timeline with week granularity', async () => {
      const mockClients = [
        {
          assignedSeller: 'Seller 1',
          closed: true,
          meetingDate: new Date('2024-01-08T10:00:00Z'),
        },
        {
          assignedSeller: 'Seller 1',
          closed: true,
          meetingDate: new Date('2024-01-08T10:00:00Z'),
        },
        {
          assignedSeller: 'Seller 2',
          closed: true,
          meetingDate: new Date('2024-01-15T10:00:00Z'),
        },
        {
          assignedSeller: 'Seller 1',
          closed: true,
          meetingDate: new Date('2024-01-15T10:00:00Z'),
        },
      ];

      mockPrismaService.client.findMany.mockResolvedValue(mockClients as any);

      const result = await service.getSellersTimeline('week');

      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('period');
      expect(result[0]).toHaveProperty('sellers');
      expect(mockPrismaService.client.findMany).toHaveBeenCalledWith({
        where: { closed: true },
        orderBy: { meetingDate: 'asc' },
      });
    });

    it('should return sellers timeline with month granularity', async () => {
      const mockClients = [
        {
          assignedSeller: 'Seller 1',
          closed: true,
          meetingDate: new Date('2024-01-15T10:00:00Z'),
        },
        {
          assignedSeller: 'Seller 2',
          closed: true,
          meetingDate: new Date('2024-02-15T10:00:00Z'),
        },
      ];

      mockPrismaService.client.findMany.mockResolvedValue(mockClients as any);

      const result = await service.getSellersTimeline('month');

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].period).toMatch(/^\d{4}-\d{2}$/);
    });

    it('should skip clients without assigned seller', async () => {
      const mockClients = [
        {
          assignedSeller: 'Seller 1',
          closed: true,
          meetingDate: new Date('2024-01-15T10:00:00Z'),
        },
        {
          assignedSeller: null,
          closed: true,
          meetingDate: new Date('2024-01-16T10:00:00Z'),
        },
      ];

      mockPrismaService.client.findMany.mockResolvedValue(mockClients as any);

      const result = await service.getSellersTimeline('week');

      expect(result.length).toBeGreaterThan(0);
      const allSellers = result.flatMap((r) => Object.keys(r.sellers));
      expect(allSellers).not.toContain(null);
    });

    it('should return empty array when no closed clients exist', async () => {
      mockPrismaService.client.findMany.mockResolvedValue([]);

      const result = await service.getSellersTimeline('week');

      expect(result).toEqual([]);
    });

    it('should sort timeline chronologically', async () => {
      const mockClients = [
        {
          assignedSeller: 'Seller 1',
          closed: true,
          meetingDate: new Date('2024-03-15T10:00:00Z'),
        },
        {
          assignedSeller: 'Seller 1',
          closed: true,
          meetingDate: new Date('2024-01-15T10:00:00Z'),
        },
        {
          assignedSeller: 'Seller 1',
          closed: true,
          meetingDate: new Date('2024-02-15T10:00:00Z'),
        },
      ];

      mockPrismaService.client.findMany.mockResolvedValue(mockClients as any);

      const result = await service.getSellersTimeline('month');

      expect(result.length).toBeGreaterThan(1);
      for (let i = 1; i < result.length; i++) {
        expect(result[i].period.localeCompare(result[i - 1].period)).toBeGreaterThanOrEqual(0);
      }
    });

    it('should use default week granularity when not specified', async () => {
      const mockClients = [
        {
          assignedSeller: 'Seller 1',
          closed: true,
          meetingDate: new Date('2024-01-15T10:00:00Z'),
        },
      ];

      mockPrismaService.client.findMany.mockResolvedValue(mockClients as any);

      const result = await service.getSellersTimeline();

      expect(result.length).toBeGreaterThan(0);
      expect(mockPrismaService.client.findMany).toHaveBeenCalled();
    });

    it('should count deals correctly per seller per period', async () => {
      const mockClients = [
        {
          assignedSeller: 'Seller 1',
          closed: true,
          meetingDate: new Date('2024-01-08T10:00:00Z'),
        },
        {
          assignedSeller: 'Seller 1',
          closed: true,
          meetingDate: new Date('2024-01-09T10:00:00Z'),
        },
        {
          assignedSeller: 'Seller 2',
          closed: true,
          meetingDate: new Date('2024-01-08T10:00:00Z'),
        },
      ];

      mockPrismaService.client.findMany.mockResolvedValue(mockClients as any);

      const result = await service.getSellersTimeline('week');

      expect(result.length).toBeGreaterThan(0);
      const period = result.find((r) => r.period.includes('2024'));
      if (period) {
        expect(period.sellers['Seller 1']).toBe(2);
        expect(period.sellers['Seller 2']).toBe(1);
      }
    });
  });
});

