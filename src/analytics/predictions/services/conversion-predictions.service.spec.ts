import { Test, TestingModule } from '@nestjs/testing';
import { ConversionPredictionsService } from './conversion-predictions.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { PredictionsGeneratorService } from '../../../llm/generators/predictions-generator.service';
import { ANALYTICS_CONSTANTS } from '../../../common/constants';
import { Client } from '@prisma/client';

describe('ConversionPredictionsService', () => {
  let service: ConversionPredictionsService;
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
        ConversionPredictionsService,
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

    service = module.get<ConversionPredictionsService>(ConversionPredictionsService);
    prismaService = module.get(PrismaService);
    predictionsGenerator = module.get(PredictionsGeneratorService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getConversionPredictions', () => {
    it('should return conversion predictions successfully', async () => {
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

      const result = await service.getConversionPredictions();

      expect(result.length).toBe(2);
      expect(result[0].clientName).toBe('Client A');
      expect(result[0].probability).toBe(0.85);
      expect(result[0].industry).toBe('Technology');
      expect(result[0].seller).toBe('Seller 1');
      expect(result[0].urgencyLevel).toBe('immediate');
      expect(prismaService.client.findMany).toHaveBeenCalledWith({
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
      mockPrismaService.client.findMany.mockResolvedValue([]);

      const result = await service.getConversionPredictions();

      expect(result).toEqual([]);
      expect(mockPredictionsGenerator.generateConversionPredictions).not.toHaveBeenCalled();
    });

    it('should handle null values with Unknown fallback', async () => {
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

      const result = await service.getConversionPredictions();

      expect(result[0].industry).toBe('Unknown');
      expect(result[0].urgencyLevel).toBe('Unknown');
      expect(result[0].seller).toBe('Seller 1');
    });

    it('should handle errors gracefully', async () => {
      mockPrismaService.client.findMany.mockRejectedValue(new Error('Database error'));

      const result = await service.getConversionPredictions();

      expect(result).toEqual([]);
    });

    it('should limit to RECENT_WEEKS constant', async () => {
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

      await service.getConversionPredictions();

      expect(prismaService.client.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: ANALYTICS_CONSTANTS.LIMITS.RECENT_WEEKS,
        }),
      );
    });
  });
});

