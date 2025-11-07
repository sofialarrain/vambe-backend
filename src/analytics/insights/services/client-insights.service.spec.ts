import { Test, TestingModule } from '@nestjs/testing';
import { ClientInsightsService } from './client-insights.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { ClientInsightsGeneratorService } from '../../../llm/generators/client-insights-generator.service';
import { Client } from '@prisma/client';
import {
  InsightDto,
  ClientPerceptionInsightDto,
} from '../../../common/dto/analytics';

describe('ClientInsightsService', () => {
  let service: ClientInsightsService;
  let prismaService: jest.Mocked<PrismaService>;
  let clientInsightsGenerator: jest.Mocked<ClientInsightsGeneratorService>;

  const mockPrismaService = {
    client: {
      findMany: jest.fn(),
    },
  };

  const mockClientInsightsGenerator = {
    generateClientPerceptionInsight: jest.fn(),
    generateClientSolutionsInsight: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientInsightsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ClientInsightsGeneratorService,
          useValue: mockClientInsightsGenerator,
        },
      ],
    }).compile();

    service = module.get<ClientInsightsService>(ClientInsightsService);
    prismaService = module.get(PrismaService);
    clientInsightsGenerator = module.get(ClientInsightsGeneratorService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getClientPerceptionInsight', () => {
    it('should return client perception insight successfully', async () => {
      const mockClients: Partial<Client>[] = [
        {
          id: '1',
          transcription: 'Great product, very helpful.',
          closed: true,
          sentiment: 'positive',
        },
        {
          id: '2',
          transcription: 'Need more features.',
          closed: false,
          sentiment: 'neutral',
        },
      ];

      const mockInsight: ClientPerceptionInsightDto = {
        positiveAspects: 'Clients appreciate the automation.',
        concerns: 'Feature requests mentioned.',
        successFactors: 'Positive sentiment correlates with closed deals.',
        recommendations: 'Continue focusing on automation features.',
      };

      mockPrismaService.client.findMany.mockResolvedValue(mockClients as Client[]);
      mockClientInsightsGenerator.generateClientPerceptionInsight.mockResolvedValue(mockInsight);

      const result = await service.getClientPerceptionInsight();

      expect(result).toEqual(mockInsight);
      expect(mockPrismaService.client.findMany).toHaveBeenCalledWith({
        where: {
          processed: true,
        },
        select: {
          transcription: true,
          closed: true,
          sentiment: true,
        },
        take: 20,
        orderBy: {
          createdAt: 'desc',
        },
      });
      expect(mockClientInsightsGenerator.generateClientPerceptionInsight).toHaveBeenCalledWith([
        {
          transcription: 'Great product, very helpful.',
          closed: true,
          sentiment: 'positive',
        },
        {
          transcription: 'Need more features.',
          closed: false,
          sentiment: 'neutral',
        },
      ]);
    });

    it('should filter out clients with empty transcriptions', async () => {
      const mockClients: Partial<Client>[] = [
        {
          id: '1',
          transcription: '   ',
          closed: true,
          sentiment: 'positive',
        },
        {
          id: '2',
          transcription: undefined,
          closed: false,
          sentiment: 'neutral',
        },
        {
          id: '3',
          transcription: 'Valid transcription',
          closed: true,
          sentiment: 'positive',
        },
      ];

      const mockInsight: ClientPerceptionInsightDto = {
        positiveAspects: 'Valid insights',
        concerns: '',
        successFactors: '',
        recommendations: '',
      };

      mockPrismaService.client.findMany.mockResolvedValue(mockClients as Client[]);
      mockClientInsightsGenerator.generateClientPerceptionInsight.mockResolvedValue(mockInsight);

      const result = await service.getClientPerceptionInsight();

      expect(mockClientInsightsGenerator.generateClientPerceptionInsight).toHaveBeenCalledWith([
        {
          transcription: 'Valid transcription',
          closed: true,
          sentiment: 'positive',
        },
      ]);
    });

    it('should return fallback when no valid transcriptions available', async () => {
      const mockClients: Partial<Client>[] = [
        {
          id: '1',
          transcription: '',
          closed: true,
          sentiment: 'positive',
        },
        {
          id: '2',
          transcription: undefined,
          closed: false,
          sentiment: 'neutral',
        },
      ];

      mockPrismaService.client.findMany.mockResolvedValue(mockClients as Client[]);

      const result = await service.getClientPerceptionInsight();

      expect(result.positiveAspects).toBe('No client transcripts available for perception analysis.');
      expect(result.concerns).toBe('');
      expect(mockClientInsightsGenerator.generateClientPerceptionInsight).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockPrismaService.client.findMany.mockRejectedValue(new Error('Database error'));

      const result = await service.getClientPerceptionInsight();

      expect(result.positiveAspects).toBe('Unable to generate analysis at this time.');
      expect(result.concerns).toBe('Unable to generate analysis at this time.');
    });
  });

  describe('getClientSolutionsInsight', () => {
    it('should return client solutions insight successfully', async () => {
      const mockClients: Partial<Client>[] = [
        {
          id: '1',
          transcription: 'We need automation and API integration.',
          closed: true,
          mainMotivation: 'Efficiency',
          technicalRequirements: ['API integration', 'Real-time updates'],
        },
      ];

      const mockInsight: InsightDto = {
        insight: 'Clients are seeking automation and API integration solutions.',
      };

      mockPrismaService.client.findMany.mockResolvedValue(mockClients as Client[]);
      mockClientInsightsGenerator.generateClientSolutionsInsight.mockResolvedValue(mockInsight);

      const result = await service.getClientSolutionsInsight();

      expect(result).toEqual(mockInsight);
      expect(mockPrismaService.client.findMany).toHaveBeenCalledWith({
        where: {
          processed: true,
        },
        select: {
          transcription: true,
          closed: true,
          mainMotivation: true,
          technicalRequirements: true,
        },
        take: 30,
        orderBy: {
          createdAt: 'desc',
        },
      });
      expect(mockClientInsightsGenerator.generateClientSolutionsInsight).toHaveBeenCalledWith([
        {
          transcription: 'We need automation and API integration.',
          closed: true,
          mainMotivation: 'Efficiency',
          technicalRequirements: ['API integration', 'Real-time updates'],
        },
      ]);
    });

    it('should filter out clients with empty transcriptions', async () => {
      const mockClients: Partial<Client>[] = [
        {
          id: '1',
          transcription: '',
          closed: true,
          mainMotivation: 'Efficiency',
          technicalRequirements: [],
        },
        {
          id: '2',
          transcription: 'Valid transcription',
          closed: false,
          mainMotivation: undefined,
          technicalRequirements: undefined,
        },
      ];

      const mockInsight: InsightDto = {
        insight: 'Valid insights',
      };

      mockPrismaService.client.findMany.mockResolvedValue(mockClients as Client[]);
      mockClientInsightsGenerator.generateClientSolutionsInsight.mockResolvedValue(mockInsight);

      const result = await service.getClientSolutionsInsight();

      expect(mockClientInsightsGenerator.generateClientSolutionsInsight).toHaveBeenCalledWith([
        {
          transcription: 'Valid transcription',
          closed: false,
          mainMotivation: undefined,
          technicalRequirements: undefined,
        },
      ]);
    });

    it('should return fallback when no valid transcriptions available', async () => {
      mockPrismaService.client.findMany.mockResolvedValue([
        {
          id: '1',
          transcription: '',
          closed: true,
          mainMotivation: undefined,
          technicalRequirements: undefined,
        },
      ] as unknown as Client[]);

      const result = await service.getClientSolutionsInsight();

      expect(result.insight).toBe('No client transcripts available for solutions analysis.');
      expect(mockClientInsightsGenerator.generateClientSolutionsInsight).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockPrismaService.client.findMany.mockRejectedValue(new Error('Database error'));

      const result = await service.getClientSolutionsInsight();

      expect(result.insight).toBe('Unable to generate insight at this time.');
    });
  });
});

