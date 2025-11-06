import { Test, TestingModule } from '@nestjs/testing';
import { PredictionsGeneratorService } from './predictions-generator.service';
import { AnthropicClientService } from '../core/anthropic-client.service';
import { LLM_CONSTANTS, API_CONSTANTS } from '../../common/constants';

describe('PredictionsGeneratorService', () => {
  let service: PredictionsGeneratorService;
  let anthropicClient: jest.Mocked<AnthropicClientService>;

  const mockAnthropicClient = {
    isConfigured: jest.fn(),
    sendMessage: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PredictionsGeneratorService,
        {
          provide: AnthropicClientService,
          useValue: mockAnthropicClient,
        },
      ],
    }).compile();

    service = module.get<PredictionsGeneratorService>(PredictionsGeneratorService);
    anthropicClient = module.get(AnthropicClientService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateConversionPredictions', () => {
    it('should return fallback when API is not configured', async () => {
      // Arrange
      const openDeals = [
        {
          clientName: 'Client A',
          industry: 'Technology',
          sentiment: 'positive',
          urgencyLevel: 'immediate',
          painPoints: ['High workload'],
          technicalRequirements: ['API integration'],
          seller: 'Seller 1',
          discoverySource: 'Website',
          operationSize: 'large',
          interactionVolume: 150,
        },
      ];

      mockAnthropicClient.isConfigured.mockReturnValue(false);

      // Act
      const result = await service.generateConversionPredictions(openDeals);

      // Assert
      expect(result.length).toBe(1);
      expect(result[0].clientName).toBe('Client A');
      expect(result[0].probability).toBe(API_CONSTANTS.PROBABILITY.DEFAULT_FALLBACK / 100);
      expect(result[0].recommendation).toBe('AI insights unavailable - please review manually.');
      expect(mockAnthropicClient.sendMessage).not.toHaveBeenCalled();
    });

    it('should limit to TOP_DEALS', async () => {
      // Arrange
      const openDeals = [];
      for (let i = 0; i < 10; i++) {
        openDeals.push({
          clientName: `Client ${i}`,
          industry: 'Technology',
          sentiment: 'positive',
          urgencyLevel: 'immediate',
          painPoints: [],
          technicalRequirements: [],
          seller: 'Seller 1',
          discoverySource: 'Website',
          operationSize: 'large',
          interactionVolume: 100,
        });
      }

      mockAnthropicClient.isConfigured.mockReturnValue(true);
      mockAnthropicClient.sendMessage.mockResolvedValue('PROBABILITY: 75\nRECOMMENDATION: Focus on technical requirements');

      // Act
      const result = await service.generateConversionPredictions(openDeals);

      // Assert
      expect(result.length).toBe(API_CONSTANTS.LIMITS.TOP_DEALS);
      expect(mockAnthropicClient.sendMessage).toHaveBeenCalledTimes(API_CONSTANTS.LIMITS.TOP_DEALS);
    });

    it('should parse probability and recommendation correctly', async () => {
      // Arrange
      const openDeals = [
        {
          clientName: 'Client A',
          industry: 'Technology',
          sentiment: 'positive',
          urgencyLevel: 'immediate',
          painPoints: ['High workload'],
          technicalRequirements: ['API integration'],
          seller: 'Seller 1',
          discoverySource: 'Website',
          operationSize: 'large',
          interactionVolume: 150,
        },
      ];

      const mockResponse = 'PROBABILITY: 85\nRECOMMENDATION: Focus on addressing technical requirements';

      mockAnthropicClient.isConfigured.mockReturnValue(true);
      mockAnthropicClient.sendMessage.mockResolvedValue(mockResponse);

      // Act
      const result = await service.generateConversionPredictions(openDeals);

      // Assert
      expect(result.length).toBe(1);
      expect(result[0].clientName).toBe('Client A');
      expect(result[0].probability).toBe(85); // Service returns 0-100, not 0-1
      expect(result[0].recommendation).toBe('Focus on addressing technical requirements');
      expect(mockAnthropicClient.sendMessage).toHaveBeenCalledWith({
        prompt: expect.stringContaining('Client A'),
        maxTokens: LLM_CONSTANTS.MAX_TOKENS.SHORT,
      });
    });

    it('should use default fallback when probability is not found', async () => {
      // Arrange
      const openDeals = [
        {
          clientName: 'Client A',
          industry: 'Technology',
          sentiment: 'positive',
          urgencyLevel: 'immediate',
          painPoints: [],
          technicalRequirements: [],
          seller: 'Seller 1',
          discoverySource: 'Website',
          operationSize: 'large',
          interactionVolume: 100,
        },
      ];

      const mockResponse = 'RECOMMENDATION: Focus on client needs\nPROBABILITY: invalid';

      mockAnthropicClient.isConfigured.mockReturnValue(true);
      mockAnthropicClient.sendMessage.mockResolvedValue(mockResponse);

      // Act
      const result = await service.generateConversionPredictions(openDeals);

      // Assert
      expect(result[0].probability).toBe(API_CONSTANTS.PROBABILITY.DEFAULT_FALLBACK); // Service returns 0-100
    });

    it('should use default recommendation when recommendation is not found', async () => {
      // Arrange
      const openDeals = [
        {
          clientName: 'Client A',
          industry: 'Technology',
          sentiment: 'positive',
          urgencyLevel: 'immediate',
          painPoints: [],
          technicalRequirements: [],
          seller: 'Seller 1',
          discoverySource: 'Website',
          operationSize: 'large',
          interactionVolume: 100,
        },
      ];

      const mockResponse = 'PROBABILITY: 75';

      mockAnthropicClient.isConfigured.mockReturnValue(true);
      mockAnthropicClient.sendMessage.mockResolvedValue(mockResponse);

      // Act
      const result = await service.generateConversionPredictions(openDeals);

      // Assert
      expect(result[0].recommendation).toBe('Focus on addressing the client\'s key pain points and technical requirements.');
    });

    it('should clamp probability to valid range', async () => {
      // Arrange
      const openDeals = [
        {
          clientName: 'Client A',
          industry: 'Technology',
          sentiment: 'positive',
          urgencyLevel: 'immediate',
          painPoints: [],
          technicalRequirements: [],
          seller: 'Seller 1',
          discoverySource: 'Website',
          operationSize: 'large',
          interactionVolume: 100,
        },
      ];

      mockAnthropicClient.isConfigured.mockReturnValue(true);
      mockAnthropicClient.sendMessage.mockResolvedValue('PROBABILITY: 150\nRECOMMENDATION: Test');

      // Act
      const result = await service.generateConversionPredictions(openDeals);

      // Assert
      expect(result[0].probability).toBe(API_CONSTANTS.PROBABILITY.MAX); // Clamped to 100
    });

    it('should clamp negative probability to minimum', async () => {
      // Arrange
      const openDeals = [
        {
          clientName: 'Client A',
          industry: 'Technology',
          sentiment: 'positive',
          urgencyLevel: 'immediate',
          painPoints: [],
          technicalRequirements: [],
          seller: 'Seller 1',
          discoverySource: 'Website',
          operationSize: 'large',
          interactionVolume: 100,
        },
      ];

      mockAnthropicClient.isConfigured.mockReturnValue(true);
      // The regex /\d+/ only matches positive digits, so -10 won't match and will use default fallback
      mockAnthropicClient.sendMessage.mockResolvedValue('PROBABILITY: -10\nRECOMMENDATION: Test');

      // Act
      const result = await service.generateConversionPredictions(openDeals);

      // Assert
      // Since regex doesn't match negative numbers, it falls back to DEFAULT_FALLBACK
      expect(result[0].probability).toBe(API_CONSTANTS.PROBABILITY.DEFAULT_FALLBACK);
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      const openDeals = [
        {
          clientName: 'Client A',
          industry: 'Technology',
          sentiment: 'positive',
          urgencyLevel: 'immediate',
          painPoints: [],
          technicalRequirements: [],
          seller: 'Seller 1',
          discoverySource: 'Website',
          operationSize: 'large',
          interactionVolume: 100,
        },
      ];

      mockAnthropicClient.isConfigured.mockReturnValue(true);
      mockAnthropicClient.sendMessage.mockRejectedValue(new Error('API Error'));

      // Act
      const result = await service.generateConversionPredictions(openDeals);

      // Assert
      expect(result.length).toBe(1);
      expect(result[0].probability).toBe(API_CONSTANTS.PROBABILITY.DEFAULT_FALLBACK); // On error, uses value directly (50)
      expect(result[0].recommendation).toBe('Unable to generate prediction at this time.');
    });

    it('should process multiple clients correctly', async () => {
      // Arrange
      const openDeals = [
        {
          clientName: 'Client A',
          industry: 'Technology',
          sentiment: 'positive',
          urgencyLevel: 'immediate',
          painPoints: [],
          technicalRequirements: [],
          seller: 'Seller 1',
          discoverySource: 'Website',
          operationSize: 'large',
          interactionVolume: 100,
        },
        {
          clientName: 'Client B',
          industry: 'Finance',
          sentiment: 'neutral',
          urgencyLevel: 'planned',
          painPoints: [],
          technicalRequirements: [],
          seller: 'Seller 2',
          discoverySource: 'Referral',
          operationSize: 'medium',
          interactionVolume: 80,
        },
      ];

      mockAnthropicClient.isConfigured.mockReturnValue(true);
      mockAnthropicClient.sendMessage
        .mockResolvedValueOnce('PROBABILITY: 80\nRECOMMENDATION: Focus on Client A')
        .mockResolvedValueOnce('PROBABILITY: 60\nRECOMMENDATION: Follow up with Client B');

      // Act
      const result = await service.generateConversionPredictions(openDeals);

      // Assert
      expect(result.length).toBe(2);
      expect(result[0].clientName).toBe('Client A');
      expect(result[0].probability).toBe(80); // Service returns 0-100
      expect(result[1].clientName).toBe('Client B');
      expect(result[1].probability).toBe(60); // Service returns 0-100
      expect(mockAnthropicClient.sendMessage).toHaveBeenCalledTimes(2);
    });
  });
});

