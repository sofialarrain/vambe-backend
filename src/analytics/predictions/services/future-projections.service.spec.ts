import { Test, TestingModule } from '@nestjs/testing';
import { FutureProjectionsService } from './future-projections.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { getSimulatedCurrentDate } from '../../../common/utils/date.utils';
import { Client } from '@prisma/client';

jest.mock('../../../common/utils/date.utils', () => ({
  getSimulatedCurrentDate: jest.fn(() => new Date(2024, 10, 15)),
}));

describe('FutureProjectionsService', () => {
  let service: FutureProjectionsService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockPrismaService = {
    client: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FutureProjectionsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<FutureProjectionsService>(FutureProjectionsService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getFutureProjection', () => {
    it('should return projection with insufficient data message when no clients', async () => {
      mockPrismaService.client.findMany.mockResolvedValue([]);

      const result = await service.getFutureProjection();

      expect(result.nextWeek.estimatedClosed).toBe(0);
      expect(result.nextWeek.estimatedMeetings).toBe(0);
      expect(result.nextWeek.confidence).toBe('low');
      expect(result.message).toBe('Insufficient data for projection.');
    });

    it('should return projection with limited data message when less than 2 weeks', async () => {
      const currentDate = getSimulatedCurrentDate();
      const mockClients: Partial<Client>[] = [
        {
          id: '1',
          meetingDate: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1),
          closed: true,
        },
        {
          id: '2',
          meetingDate: new Date(currentDate.getFullYear(), currentDate.getMonth(), 2),
          closed: false,
        },
      ];

      mockPrismaService.client.findMany.mockResolvedValue(mockClients as Client[]);

      const result = await service.getFutureProjection();

      expect(result.nextWeek.estimatedClosed).toBeGreaterThanOrEqual(0);
      expect(result.nextWeek.confidence).toBe('low');
      expect(result.message).toContain('Limited data available');
    });

    it('should calculate projection with sufficient data', async () => {
      const currentDate = getSimulatedCurrentDate();
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();

      const mockClients: Partial<Client>[] = [];

      for (let i = 1; i <= 7; i++) {
        mockClients.push({
          id: `week1-${i}`,
          meetingDate: new Date(year, month - 1, i),
          closed: i % 2 === 0,
        });
      }

      for (let i = 8; i <= 14; i++) {
        mockClients.push({
          id: `week2-${i}`,
          meetingDate: new Date(year, month - 1, i),
          closed: i % 2 === 0,
        });
      }

      for (let i = 15; i <= 21; i++) {
        mockClients.push({
          id: `week3-${i}`,
          meetingDate: new Date(year, month - 1, i),
          closed: i % 2 === 0,
        });
      }

      for (let i = 22; i <= 28; i++) {
        mockClients.push({
          id: `week4-${i}`,
          meetingDate: new Date(year, month - 1, i),
          closed: i % 2 === 0,
        });
      }

      mockPrismaService.client.findMany.mockResolvedValue(mockClients as Client[]);

      const result = await service.getFutureProjection();

      expect(result.nextWeek.estimatedClosed).toBeGreaterThanOrEqual(0);
      expect(result.nextWeek.estimatedMeetings).toBeGreaterThanOrEqual(0);
      expect(result.nextMonth.estimatedClosed).toBeGreaterThanOrEqual(0);
      expect(result.nextMonth.estimatedMeetings).toBeGreaterThanOrEqual(0);
      expect(result.nextWeek.confidence).toBeDefined();
      expect(['high', 'medium', 'low']).toContain(result.nextWeek.confidence);
      expect(result.message).toBeDefined();
      expect(result.dataPoints).toBeDefined();
      expect(result.timelineData).toBeDefined();
    });

    it('should handle errors gracefully', async () => {
      mockPrismaService.client.findMany.mockRejectedValue(new Error('Database error'));

      const result = await service.getFutureProjection();

      expect(result.nextWeek.estimatedClosed).toBe(0);
      expect(result.nextWeek.estimatedMeetings).toBe(0);
      expect(result.nextWeek.confidence).toBe('low');
      expect(result.message).toBe('Unable to generate projection at this time.');
    });

    it('should include timeline data in projection', async () => {
      const currentDate = getSimulatedCurrentDate();
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();

      const mockClients: Partial<Client>[] = [
        {
          id: '1',
          meetingDate: new Date(year, month, 1),
          closed: true,
        },
        {
          id: '2',
          meetingDate: new Date(year, month, 2),
          closed: false,
        },
        {
          id: '3',
          meetingDate: new Date(year, month, 3),
          closed: true,
        },
      ];

      mockPrismaService.client.findMany.mockResolvedValue(mockClients as Client[]);

      const result = await service.getFutureProjection();

      expect(result.timelineData).toBeDefined();
      expect(Array.isArray(result.timelineData)).toBe(true);
      if (result.timelineData && result.timelineData.length > 0) {
        expect(result.timelineData[0].date).toBeDefined();
        expect(result.timelineData[0].period).toBeDefined();
        expect(['current', 'projected']).toContain(result.timelineData[0].period);
      }
    });

    it('should calculate trends correctly', async () => {
      const currentDate = getSimulatedCurrentDate();
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();

      const previousMonthClients: Partial<Client>[] = [];
      for (let i = 1; i <= 10; i++) {
        previousMonthClients.push({
          id: `prev-${i}`,
          meetingDate: new Date(year, month - 1, i),
          closed: i % 2 === 0,
        });
      }

      const currentMonthClients: Partial<Client>[] = [];
      for (let i = 1; i <= 15; i++) {
        currentMonthClients.push({
          id: `current-${i}`,
          meetingDate: new Date(year, month, i),
          closed: i % 2 === 0,
        });
      }

      const allClients = [...previousMonthClients, ...currentMonthClients];

      mockPrismaService.client.findMany.mockResolvedValue(allClients as Client[]);

      const result = await service.getFutureProjection();

      expect(result.nextWeek.trend).toBeDefined();
      expect(['increasing', 'decreasing', 'stable', 'neutral']).toContain(result.nextWeek.trend);
      expect(result.nextWeek.trendClosed).toBeDefined();
      expect(result.nextWeek.trendMeetings).toBeDefined();
    });
  });
});

