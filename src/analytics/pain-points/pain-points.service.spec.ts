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
    $queryRaw: jest.fn(),
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
      const mockRawResults = [
        {
          pain_point: 'High workload',
          count: BigInt(3),
          closed_count: BigInt(2),
        },
        {
          pain_point: 'Budget constraints',
          count: BigInt(2),
          closed_count: BigInt(1),
        },
      ];

      mockPrismaService.$queryRaw.mockResolvedValue(mockRawResults);

      const result = await service.getTopPainPoints();

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].painPoint).toBeDefined();
      expect(result[0].count).toBeGreaterThan(0);
      expect(result[0].conversionRate).toBeGreaterThanOrEqual(0);
      expect(result[0].conversionRate).toBeLessThanOrEqual(100);
      expect(mockPrismaService.$queryRaw).toHaveBeenCalled();
    });

    it('should normalize pain points with variations', async () => {
      const mockRawResults = [
        {
          pain_point: 'High workload',
          count: BigInt(2),
          closed_count: BigInt(1),
        },
        {
          pain_point: 'high workload',
          count: BigInt(1),
          closed_count: BigInt(0),
        },
        {
          pain_point: 'High Workload',
          count: BigInt(1),
          closed_count: BigInt(1),
        },
      ];

      mockPrismaService.$queryRaw.mockResolvedValue(mockRawResults);

      const result = await service.getTopPainPoints();

      expect(result.length).toBe(1);
      expect(result[0].count).toBe(4);
      expect(result[0].painPoint).toBe('High workload');
    });

    it('should calculate conversion rate correctly', async () => {
      const mockRawResults = [
        {
          pain_point: 'High workload',
          count: BigInt(3),
          closed_count: BigInt(2),
        },
      ];

      mockPrismaService.$queryRaw.mockResolvedValue(mockRawResults);

      const result = await service.getTopPainPoints();

      expect(result[0].count).toBe(3);
      expect(result[0].conversionRate).toBeCloseTo(66.67, 1);
    });

    it('should return empty array when no pain points available', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([]);

      const result = await service.getTopPainPoints();

      expect(result).toEqual([]);
    });

    it('should limit results to top 10', async () => {
      const mockRawResults = Array.from({ length: 15 }, (_, i) => ({
        pain_point: `Pain Point ${i}`,
        count: BigInt(1),
        closed_count: BigInt(0),
      }));

      mockPrismaService.$queryRaw.mockResolvedValue(mockRawResults);

      const result = await service.getTopPainPoints();

      expect(result.length).toBeLessThanOrEqual(10);
    });

    it('should sort by count descending', async () => {
      const mockRawResults = [
        {
          pain_point: 'High count',
          count: BigInt(3),
          closed_count: BigInt(0),
        },
        {
          pain_point: 'Low count',
          count: BigInt(1),
          closed_count: BigInt(0),
        },
      ];

      mockPrismaService.$queryRaw.mockResolvedValue(mockRawResults);

      const result = await service.getTopPainPoints();

      expect(result[0].count).toBeGreaterThanOrEqual(result[1]?.count || 0);
    });
  });

  describe('getTopTechnicalRequirements', () => {
    it('should return top technical requirements successfully', async () => {
      const mockRawResults = [
        {
          requirement: 'API integration',
          count: BigInt(3),
        },
        {
          requirement: 'Real-time updates',
          count: BigInt(3),
        },
      ];

      mockPrismaService.$queryRaw.mockResolvedValue(mockRawResults);

      const result = await service.getTopTechnicalRequirements();

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].requirement).toBeDefined();
      expect(result[0].count).toBeGreaterThan(0);
      expect(mockPrismaService.$queryRaw).toHaveBeenCalled();
    });

    it('should count requirements correctly', async () => {
      const mockRawResults = [
        {
          requirement: 'API integration',
          count: BigInt(3),
        },
      ];

      mockPrismaService.$queryRaw.mockResolvedValue(mockRawResults);

      const result = await service.getTopTechnicalRequirements();

      const apiIntegration = result.find(r => r.requirement === 'API integration');
      expect(apiIntegration).toBeDefined();
      expect(apiIntegration?.count).toBe(3);
    });

    it('should return empty array when no technical requirements available', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([]);

      const result = await service.getTopTechnicalRequirements();

      expect(result).toEqual([]);
    });

    it('should limit results to top 10', async () => {
      const mockRawResults = Array.from({ length: 10 }, (_, i) => ({
        requirement: `Requirement ${i}`,
        count: BigInt(1),
      }));

      mockPrismaService.$queryRaw.mockResolvedValue(mockRawResults);

      const result = await service.getTopTechnicalRequirements();

      expect(result.length).toBeLessThanOrEqual(10);
    });

    it('should sort by count descending', async () => {
      const mockRawResults = [
        {
          requirement: 'High count',
          count: BigInt(3),
        },
        {
          requirement: 'Low count',
          count: BigInt(1),
        },
      ];

      mockPrismaService.$queryRaw.mockResolvedValue(mockRawResults);

      const result = await service.getTopTechnicalRequirements();

      expect(result[0].count).toBeGreaterThanOrEqual(result[1]?.count || 0);
    });
  });

  describe('getVolumeVsConversion', () => {
    it('should return volume vs conversion data for all ranges', async () => {
      const mockRawResults = [
        { volume_range: '0-50', count: BigInt(1), closed_count: BigInt(1) },
        { volume_range: '51-100', count: BigInt(1), closed_count: BigInt(0) },
        { volume_range: '101-200', count: BigInt(1), closed_count: BigInt(1) },
        { volume_range: '201-300', count: BigInt(1), closed_count: BigInt(1) },
        { volume_range: '300+', count: BigInt(1), closed_count: BigInt(0) },
      ];

      mockPrismaService.$queryRaw.mockResolvedValue(mockRawResults);

      const result = await service.getVolumeVsConversion();

      expect(result.length).toBe(5);
      expect(result[0].volumeRange).toBe('0-50');
      expect(result[1].volumeRange).toBe('51-100');
      expect(result[2].volumeRange).toBe('101-200');
      expect(result[3].volumeRange).toBe('201-300');
      expect(result[4].volumeRange).toBe('300+');
      expect(mockPrismaService.$queryRaw).toHaveBeenCalled();
    });

    it('should calculate conversion rate correctly for each range', async () => {
      const mockRawResults = [
        { volume_range: '0-50', count: BigInt(3), closed_count: BigInt(2) },
      ];

      mockPrismaService.$queryRaw.mockResolvedValue(mockRawResults);

      const result = await service.getVolumeVsConversion();

      const range0_50 = result.find(r => r.volumeRange === '0-50');
      expect(range0_50).toBeDefined();
      expect(range0_50?.count).toBe(3);
      expect(range0_50?.conversionRate).toBeCloseTo(66.67, 1); // 2/3 * 100
    });

    it('should handle empty ranges with zero conversion rate', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([]);

      const result = await service.getVolumeVsConversion();

      expect(result.length).toBe(5);
      result.forEach(range => {
        expect(range.count).toBe(0);
        expect(range.conversionRate).toBe(0);
      });
    });

    it('should correctly categorize clients into volume ranges', async () => {
      const mockRawResults = [
        { volume_range: '0-50', count: BigInt(2), closed_count: BigInt(0) },
        { volume_range: '51-100', count: BigInt(2), closed_count: BigInt(0) },
        { volume_range: '101-200', count: BigInt(2), closed_count: BigInt(0) },
        { volume_range: '201-300', count: BigInt(2), closed_count: BigInt(0) },
        { volume_range: '300+', count: BigInt(2), closed_count: BigInt(0) },
      ];

      mockPrismaService.$queryRaw.mockResolvedValue(mockRawResults);

      const result = await service.getVolumeVsConversion();

      expect(result[0].count).toBe(2);
      expect(result[1].count).toBe(2);
      expect(result[2].count).toBe(2);
      expect(result[3].count).toBe(2);
      expect(result[4].count).toBe(2);
    });

    it('should handle edge cases correctly', async () => {
      const mockRawResults = [
        { volume_range: '0-50', count: BigInt(1), closed_count: BigInt(1) },
        { volume_range: '51-100', count: BigInt(1), closed_count: BigInt(0) },
        { volume_range: '201-300', count: BigInt(1), closed_count: BigInt(1) },
        { volume_range: '300+', count: BigInt(1), closed_count: BigInt(0) },
      ];

      mockPrismaService.$queryRaw.mockResolvedValue(mockRawResults);

      const result = await service.getVolumeVsConversion();

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

