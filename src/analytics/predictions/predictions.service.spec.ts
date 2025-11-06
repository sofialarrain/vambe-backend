import { Test, TestingModule } from '@nestjs/testing';
import { PredictionsService } from './predictions.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PredictionsGeneratorService } from '../../llm/generators/predictions-generator.service';
import { getSimulatedCurrentDate } from '../../common/utils/date.utils';
import { ANALYTICS_CONSTANTS } from '../../common/constants';
import { Client } from '@prisma/client';

// Mock the date utils
jest.mock('../../common/utils/date.utils', () => ({
  getSimulatedCurrentDate: jest.fn(() => new Date(2024, 10, 15)), // November 15, 2024
}));

describe('PredictionsService', () => {
  let service: PredictionsService;
  let prismaService: jest.Mocked<PrismaService>;
  let predictionsGenerator: jest.Mocked<PredictionsGeneratorService>;

  const mockPrismaService = {
    client: {
      findMany: jest.fn(),
    },
  };

  const mockPredictionsGenerator = {
    generateConversionPredictions: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PredictionsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: PredictionsGeneratorService,
          useValue: mockPredictionsGenerator,
        },
      ],
    }).compile();

    service = module.get<PredictionsService>(PredictionsService);
    prismaService = module.get(PrismaService);
    predictionsGenerator = module.get(PredictionsGeneratorService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getConversionPredictions', () => {
    it('should return conversion predictions successfully', async () => {
      // Arrange
      const mockOpenDeals: Partial<Client>[] = [
        {
          id: '1',
          name: 'Client A',
          industry: 'Technology',
          sentiment: 'positive',
          urgencyLevel: 'immediate',
          painPoints: ['High workload'],
          technicalRequirements: ['API integration'],
          assignedSeller: 'Seller 1',
          discoverySource: 'Website',
          operationSize: 'large',
          interactionVolume: 150,
          closed: false,
        },
        {
          id: '2',
          name: 'Client B',
          industry: 'Finance',
          sentiment: 'neutral',
          urgencyLevel: 'planned',
          painPoints: [],
          technicalRequirements: [],
          assignedSeller: 'Seller 2',
          discoverySource: 'Referral',
          operationSize: 'medium',
          interactionVolume: 100,
          closed: false,
        },
      ];

      const mockPredictions = [
        {
          clientName: 'Client A',
          probability: 0.85,
          recommendation: 'High probability of conversion.',
        },
        {
          clientName: 'Client B',
          probability: 0.65,
          recommendation: 'Moderate probability.',
        },
      ];

      mockPrismaService.client.findMany.mockResolvedValue(mockOpenDeals as Client[]);
      mockPredictionsGenerator.generateConversionPredictions.mockResolvedValue(mockPredictions);

      // Act
      const result = await service.getConversionPredictions();

      // Assert
      expect(result.length).toBe(2);
      expect(result[0].clientName).toBe('Client A');
      expect(result[0].probability).toBe(0.85);
      expect(result[0].industry).toBe('Technology');
      expect(result[0].seller).toBe('Seller 1');
      expect(result[0].urgencyLevel).toBe('immediate');
      expect(mockPrismaService.client.findMany).toHaveBeenCalledWith({
        where: {
          processed: true,
          closed: false,
        },
        select: {
          name: true,
          industry: true,
          sentiment: true,
          urgencyLevel: true,
          painPoints: true,
          technicalRequirements: true,
          assignedSeller: true,
          discoverySource: true,
          operationSize: true,
          interactionVolume: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: ANALYTICS_CONSTANTS.LIMITS.RECENT_WEEKS,
      });
    });

    it('should return empty array when no open deals available', async () => {
      // Arrange
      mockPrismaService.client.findMany.mockResolvedValue([]);

      // Act
      const result = await service.getConversionPredictions();

      // Assert
      expect(result).toEqual([]);
      expect(mockPredictionsGenerator.generateConversionPredictions).not.toHaveBeenCalled();
    });

    it('should handle null values with Unknown fallback', async () => {
      // Arrange
      const mockOpenDeals: Partial<Client>[] = [
        {
          id: '1',
          name: 'Client A',
          industry: null,
          sentiment: null,
          urgencyLevel: null,
          painPoints: [],
          technicalRequirements: [],
          assignedSeller: 'Seller 1',
          discoverySource: null,
          operationSize: null,
          interactionVolume: null,
          closed: false,
        },
      ];

      const mockPredictions = [
        {
          clientName: 'Client A',
          probability: 0.5,
          recommendation: 'Test recommendation',
        },
      ];

      mockPrismaService.client.findMany.mockResolvedValue(mockOpenDeals as Client[]);
      mockPredictionsGenerator.generateConversionPredictions.mockResolvedValue(mockPredictions);

      // Act
      const result = await service.getConversionPredictions();

      // Assert
      expect(result[0].industry).toBe('Unknown');
      expect(result[0].urgencyLevel).toBe('Unknown');
      expect(result[0].seller).toBe('Seller 1');
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      mockPrismaService.client.findMany.mockRejectedValue(new Error('Database error'));

      // Act
      const result = await service.getConversionPredictions();

      // Assert
      expect(result).toEqual([]);
    });

    it('should limit to RECENT_WEEKS constant', async () => {
      // Arrange
      const mockOpenDeals: Partial<Client>[] = [];
      for (let i = 0; i < 20; i++) {
        mockOpenDeals.push({
          id: `client-${i}`,
          name: `Client ${i}`,
          industry: 'Technology',
          sentiment: 'positive',
          urgencyLevel: 'immediate',
          painPoints: [],
          technicalRequirements: [],
          assignedSeller: 'Seller 1',
          discoverySource: 'Website',
          operationSize: 'large',
          interactionVolume: 100,
          closed: false,
        });
      }

      mockPrismaService.client.findMany.mockResolvedValue(mockOpenDeals as Client[]);
      mockPredictionsGenerator.generateConversionPredictions.mockResolvedValue([]);

      // Act
      await service.getConversionPredictions();

      // Assert
      expect(mockPrismaService.client.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: ANALYTICS_CONSTANTS.LIMITS.RECENT_WEEKS,
        }),
      );
    });
  });

  describe('getFutureProjection', () => {
    it('should return projection with insufficient data message when no clients', async () => {
      // Arrange
      mockPrismaService.client.findMany.mockResolvedValue([]);

      // Act
      const result = await service.getFutureProjection();

      // Assert
      expect(result.nextWeek.estimatedClosed).toBe(0);
      expect(result.nextWeek.estimatedMeetings).toBe(0);
      expect(result.nextWeek.confidence).toBe('low');
      expect(result.message).toBe('Insufficient data for projection.');
    });

    it('should return projection with limited data message when less than 2 weeks', async () => {
      // Arrange
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

      // Act
      const result = await service.getFutureProjection();

      // Assert
      expect(result.nextWeek.estimatedClosed).toBeGreaterThanOrEqual(0);
      expect(result.nextWeek.confidence).toBe('low');
      expect(result.message).toContain('Limited data available');
    });

    it('should calculate projection with sufficient data', async () => {
      // Arrange
      const currentDate = getSimulatedCurrentDate();
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      
      // Create data for multiple weeks
      const mockClients: Partial<Client>[] = [];
      
      // Week 1 (4 weeks ago)
      for (let i = 1; i <= 7; i++) {
        mockClients.push({
          id: `week1-${i}`,
          meetingDate: new Date(year, month - 1, i),
          closed: i % 2 === 0,
        });
      }
      
      // Week 2 (3 weeks ago)
      for (let i = 8; i <= 14; i++) {
        mockClients.push({
          id: `week2-${i}`,
          meetingDate: new Date(year, month - 1, i),
          closed: i % 2 === 0,
        });
      }
      
      // Week 3 (2 weeks ago)
      for (let i = 15; i <= 21; i++) {
        mockClients.push({
          id: `week3-${i}`,
          meetingDate: new Date(year, month - 1, i),
          closed: i % 2 === 0,
        });
      }
      
      // Week 4 (1 week ago)
      for (let i = 22; i <= 28; i++) {
        mockClients.push({
          id: `week4-${i}`,
          meetingDate: new Date(year, month - 1, i),
          closed: i % 2 === 0,
        });
      }

      mockPrismaService.client.findMany.mockResolvedValue(mockClients as Client[]);

      // Act
      const result = await service.getFutureProjection();

      // Assert
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
      // Arrange
      mockPrismaService.client.findMany.mockRejectedValue(new Error('Database error'));

      // Act
      const result = await service.getFutureProjection();

      // Assert
      expect(result.nextWeek.estimatedClosed).toBe(0);
      expect(result.nextWeek.estimatedMeetings).toBe(0);
      expect(result.nextWeek.confidence).toBe('low');
      expect(result.message).toBe('Unable to generate projection at this time.');
    });

    it('should include timeline data in projection', async () => {
      // Arrange
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

      // Act
      const result = await service.getFutureProjection();

      // Assert
      expect(result.timelineData).toBeDefined();
      expect(Array.isArray(result.timelineData)).toBe(true);
      if (result.timelineData && result.timelineData.length > 0) {
        expect(result.timelineData[0].date).toBeDefined();
        expect(result.timelineData[0].period).toBeDefined();
        expect(['current', 'projected']).toContain(result.timelineData[0].period);
      }
    });

    it('should calculate trends correctly', async () => {
      // Arrange
      const currentDate = getSimulatedCurrentDate();
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      
      // Previous month data
      const previousMonthClients: Partial<Client>[] = [];
      for (let i = 1; i <= 10; i++) {
        previousMonthClients.push({
          id: `prev-${i}`,
          meetingDate: new Date(year, month - 1, i),
          closed: i % 2 === 0,
        });
      }
      
      // Current month data (more closed deals)
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

      // Act
      const result = await service.getFutureProjection();

      // Assert
      expect(result.nextWeek.trend).toBeDefined();
      expect(['increasing', 'decreasing', 'stable', 'neutral']).toContain(result.nextWeek.trend);
      expect(result.nextWeek.trendClosed).toBeDefined();
      expect(result.nextWeek.trendMeetings).toBeDefined();
    });
  });
});

