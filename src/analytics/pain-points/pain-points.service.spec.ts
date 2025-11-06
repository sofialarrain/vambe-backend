import { Test, TestingModule } from '@nestjs/testing';
import { PainPointsService } from './pain-points.service';
import { PrismaService } from '../../prisma/prisma.service';
import { Client } from '@prisma/client';

describe('PainPointsService', () => {
  let service: PainPointsService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockPrismaService = {
    client: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PainPointsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<PainPointsService>(PainPointsService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getTopPainPoints', () => {
    it('should return top pain points successfully', async () => {
      // Arrange
      const mockClients: Partial<Client>[] = [
        {
          id: '1',
          painPoints: ['High workload', 'Budget constraints'],
          closed: true,
        },
        {
          id: '2',
          painPoints: ['High workload'],
          closed: false,
        },
        {
          id: '3',
          painPoints: ['Budget constraints'],
          closed: true,
        },
      ];

      mockPrismaService.client.findMany.mockResolvedValue(mockClients as Client[]);

      // Act
      const result = await service.getTopPainPoints();

      // Assert
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].painPoint).toBeDefined();
      expect(result[0].count).toBeGreaterThan(0);
      expect(result[0].conversionRate).toBeGreaterThanOrEqual(0);
      expect(result[0].conversionRate).toBeLessThanOrEqual(100);
      expect(mockPrismaService.client.findMany).toHaveBeenCalledWith({
        where: {
          processed: true,
          painPoints: { isEmpty: false },
        },
      });
    });

    it('should normalize pain points with variations', async () => {
      // Arrange
      const mockClients: Partial<Client>[] = [
        {
          id: '1',
          painPoints: ['High workload', 'high workload', 'High Workload'],
          closed: true,
        },
        {
          id: '2',
          painPoints: ['high workload'],
          closed: false,
        },
      ];

      mockPrismaService.client.findMany.mockResolvedValue(mockClients as Client[]);

      // Act
      const result = await service.getTopPainPoints();

      // Assert
      expect(result.length).toBe(1);
      expect(result[0].count).toBe(4); // All variations should be grouped
      expect(result[0].painPoint).toBe('High workload'); // Should use most common name
    });

    it('should calculate conversion rate correctly', async () => {
      // Arrange
      const mockClients: Partial<Client>[] = [
        {
          id: '1',
          painPoints: ['High workload'],
          closed: true,
        },
        {
          id: '2',
          painPoints: ['High workload'],
          closed: true,
        },
        {
          id: '3',
          painPoints: ['High workload'],
          closed: false,
        },
      ];

      mockPrismaService.client.findMany.mockResolvedValue(mockClients as Client[]);

      // Act
      const result = await service.getTopPainPoints();

      // Assert
      expect(result[0].count).toBe(3);
      expect(result[0].conversionRate).toBeCloseTo(66.67, 1); // 2/3 * 100
    });

    it('should return empty array when no pain points available', async () => {
      // Arrange
      mockPrismaService.client.findMany.mockResolvedValue([]);

      // Act
      const result = await service.getTopPainPoints();

      // Assert
      expect(result).toEqual([]);
    });

    it('should limit results to top 10', async () => {
      // Arrange
      const mockClients: Partial<Client>[] = [];
      for (let i = 0; i < 15; i++) {
        mockClients.push({
          id: `client-${i}`,
          painPoints: [`Pain Point ${i}`],
          closed: false,
        });
      }

      mockPrismaService.client.findMany.mockResolvedValue(mockClients as Client[]);

      // Act
      const result = await service.getTopPainPoints();

      // Assert
      expect(result.length).toBeLessThanOrEqual(10);
    });

    it('should sort by count descending', async () => {
      // Arrange
      const mockClients: Partial<Client>[] = [
        {
          id: '1',
          painPoints: ['Low count'],
          closed: false,
        },
        {
          id: '2',
          painPoints: ['High count', 'High count'],
          closed: false,
        },
        {
          id: '3',
          painPoints: ['High count'],
          closed: false,
        },
      ];

      mockPrismaService.client.findMany.mockResolvedValue(mockClients as Client[]);

      // Act
      const result = await service.getTopPainPoints();

      // Assert
      expect(result[0].count).toBeGreaterThanOrEqual(result[1]?.count || 0);
    });
  });

  describe('getTopTechnicalRequirements', () => {
    it('should return top technical requirements successfully', async () => {
      // Arrange
      const mockClients: Partial<Client>[] = [
        {
          id: '1',
          technicalRequirements: ['API integration', 'Real-time updates'],
        },
        {
          id: '2',
          technicalRequirements: ['API integration'],
        },
        {
          id: '3',
          technicalRequirements: ['Real-time updates', 'Real-time updates'],
        },
      ];

      mockPrismaService.client.findMany.mockResolvedValue(mockClients as Client[]);

      // Act
      const result = await service.getTopTechnicalRequirements();

      // Assert
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].requirement).toBeDefined();
      expect(result[0].count).toBeGreaterThan(0);
      expect(mockPrismaService.client.findMany).toHaveBeenCalledWith({
        where: {
          processed: true,
          technicalRequirements: { isEmpty: false },
        },
      });
    });

    it('should count requirements correctly', async () => {
      // Arrange
      const mockClients: Partial<Client>[] = [
        {
          id: '1',
          technicalRequirements: ['API integration'],
        },
        {
          id: '2',
          technicalRequirements: ['API integration', 'API integration'],
        },
      ];

      mockPrismaService.client.findMany.mockResolvedValue(mockClients as Client[]);

      // Act
      const result = await service.getTopTechnicalRequirements();

      // Assert
      const apiIntegration = result.find(r => r.requirement === 'API integration');
      expect(apiIntegration).toBeDefined();
      expect(apiIntegration?.count).toBe(3); // 1 + 2
    });

    it('should return empty array when no technical requirements available', async () => {
      // Arrange
      mockPrismaService.client.findMany.mockResolvedValue([]);

      // Act
      const result = await service.getTopTechnicalRequirements();

      // Assert
      expect(result).toEqual([]);
    });

    it('should limit results to top 10', async () => {
      // Arrange
      const mockClients: Partial<Client>[] = [];
      for (let i = 0; i < 15; i++) {
        mockClients.push({
          id: `client-${i}`,
          technicalRequirements: [`Requirement ${i}`],
        });
      }

      mockPrismaService.client.findMany.mockResolvedValue(mockClients as Client[]);

      // Act
      const result = await service.getTopTechnicalRequirements();

      // Assert
      expect(result.length).toBeLessThanOrEqual(10);
    });

    it('should sort by count descending', async () => {
      // Arrange
      const mockClients: Partial<Client>[] = [
        {
          id: '1',
          technicalRequirements: ['Low count'],
        },
        {
          id: '2',
          technicalRequirements: ['High count', 'High count'],
        },
      ];

      mockPrismaService.client.findMany.mockResolvedValue(mockClients as Client[]);

      // Act
      const result = await service.getTopTechnicalRequirements();

      // Assert
      expect(result[0].count).toBeGreaterThanOrEqual(result[1]?.count || 0);
    });
  });

  describe('getVolumeVsConversion', () => {
    it('should return volume vs conversion data for all ranges', async () => {
      // Arrange
      const mockClients: Partial<Client>[] = [
        {
          id: '1',
          interactionVolume: 25,
          closed: true,
        },
        {
          id: '2',
          interactionVolume: 75,
          closed: false,
        },
        {
          id: '3',
          interactionVolume: 150,
          closed: true,
        },
        {
          id: '4',
          interactionVolume: 250,
          closed: true,
        },
        {
          id: '5',
          interactionVolume: 350,
          closed: false,
        },
      ];

      mockPrismaService.client.findMany.mockResolvedValue(mockClients as Client[]);

      // Act
      const result = await service.getVolumeVsConversion();

      // Assert
      expect(result.length).toBe(5);
      expect(result[0].volumeRange).toBe('0-50');
      expect(result[1].volumeRange).toBe('51-100');
      expect(result[2].volumeRange).toBe('101-200');
      expect(result[3].volumeRange).toBe('201-300');
      expect(result[4].volumeRange).toBe('300+');
      expect(mockPrismaService.client.findMany).toHaveBeenCalledWith({
        where: {
          processed: true,
          interactionVolume: { not: null },
        },
      });
    });

    it('should calculate conversion rate correctly for each range', async () => {
      // Arrange
      const mockClients: Partial<Client>[] = [
        {
          id: '1',
          interactionVolume: 25,
          closed: true,
        },
        {
          id: '2',
          interactionVolume: 25,
          closed: true,
        },
        {
          id: '3',
          interactionVolume: 25,
          closed: false,
        },
      ];

      mockPrismaService.client.findMany.mockResolvedValue(mockClients as Client[]);

      // Act
      const result = await service.getVolumeVsConversion();

      // Assert
      const range0_50 = result.find(r => r.volumeRange === '0-50');
      expect(range0_50).toBeDefined();
      expect(range0_50?.count).toBe(3);
      expect(range0_50?.conversionRate).toBeCloseTo(66.67, 1); // 2/3 * 100
    });

    it('should handle empty ranges with zero conversion rate', async () => {
      // Arrange
      const mockClients: Partial<Client>[] = [];

      mockPrismaService.client.findMany.mockResolvedValue(mockClients as Client[]);

      // Act
      const result = await service.getVolumeVsConversion();

      // Assert
      expect(result.length).toBe(5);
      result.forEach(range => {
        expect(range.count).toBe(0);
        expect(range.conversionRate).toBe(0);
      });
    });

    it('should correctly categorize clients into volume ranges', async () => {
      // Arrange
      const mockClients: Partial<Client>[] = [
        { id: '1', interactionVolume: 0, closed: false },
        { id: '2', interactionVolume: 50, closed: false },
        { id: '3', interactionVolume: 51, closed: false },
        { id: '4', interactionVolume: 100, closed: false },
        { id: '5', interactionVolume: 101, closed: false },
        { id: '6', interactionVolume: 200, closed: false },
        { id: '7', interactionVolume: 201, closed: false },
        { id: '8', interactionVolume: 300, closed: false },
        { id: '9', interactionVolume: 301, closed: false },
        { id: '10', interactionVolume: 500, closed: false },
      ];

      mockPrismaService.client.findMany.mockResolvedValue(mockClients as Client[]);

      // Act
      const result = await service.getVolumeVsConversion();

      // Assert
      expect(result[0].count).toBe(2); // 0-50: 0, 50
      expect(result[1].count).toBe(2); // 51-100: 51, 100
      expect(result[2].count).toBe(2); // 101-200: 101, 200
      expect(result[3].count).toBe(2); // 201-300: 201, 300
      expect(result[4].count).toBe(2); // 300+: 301, 500
    });

    it('should handle edge cases correctly', async () => {
      // Arrange
      const mockClients: Partial<Client>[] = [
        {
          id: '1',
          interactionVolume: 50,
          closed: true,
        },
        {
          id: '2',
          interactionVolume: 51,
          closed: false,
        },
        {
          id: '3',
          interactionVolume: 300,
          closed: true,
        },
        {
          id: '4',
          interactionVolume: 301,
          closed: false,
        },
      ];

      mockPrismaService.client.findMany.mockResolvedValue(mockClients as Client[]);

      // Act
      const result = await service.getVolumeVsConversion();

      // Assert
      const range0_50 = result.find(r => r.volumeRange === '0-50');
      const range51_100 = result.find(r => r.volumeRange === '51-100');
      const range201_300 = result.find(r => r.volumeRange === '201-300');
      const range300Plus = result.find(r => r.volumeRange === '300+');

      expect(range0_50?.count).toBe(1);
      expect(range51_100?.count).toBe(1);
      expect(range201_300?.count).toBe(1);
      expect(range300Plus?.count).toBe(1);
    });
  });
});

