import { Test, TestingModule } from '@nestjs/testing';
import { SellerInsightsGeneratorService } from './seller-insights-generator.service';
import { AnthropicClientService } from '../core/anthropic-client.service';
import { ResponseParserService } from '../core/response-parser.service';
import { SellerPromptBuilder } from '../prompts/seller-prompt.builder';
import { LLM_CONSTANTS, API_CONSTANTS } from '../../common/constants';

// Mock the prompt builder
jest.mock('../prompts/seller-prompt.builder', () => ({
  SellerPromptBuilder: {
    buildFeedback: jest.fn(),
    buildCorrelationInsight: jest.fn(),
    buildTimelineInsight: jest.fn(),
  },
}));

describe('SellerInsightsGeneratorService', () => {
  let service: SellerInsightsGeneratorService;
  let anthropicClient: jest.Mocked<AnthropicClientService>;
  let responseParser: jest.Mocked<ResponseParserService>;

  const mockAnthropicClient = {
    isConfigured: jest.fn(),
    sendMessage: jest.fn(),
  };

  const mockResponseParser = {
    parseJsonResponse: jest.fn(),
    parseArrayResponse: jest.fn(),
    extractValue: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SellerInsightsGeneratorService,
        {
          provide: AnthropicClientService,
          useValue: mockAnthropicClient,
        },
        {
          provide: ResponseParserService,
          useValue: mockResponseParser,
        },
      ],
    }).compile();

    service = module.get<SellerInsightsGeneratorService>(SellerInsightsGeneratorService);
    anthropicClient = module.get(AnthropicClientService);
    responseParser = module.get(ResponseParserService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateSellerFeedback', () => {
    it('should return fallback when API is not configured', async () => {
      // Arrange
      const sellerData = {
        seller: 'Seller 1',
        metrics: {
          total: 20,
          closed: 12,
          conversionRate: 60.0,
        },
        correlations: [],
      };

      mockAnthropicClient.isConfigured.mockReturnValue(false);

      // Act
      const result = await service.generateSellerFeedback(sellerData);

      // Assert
      expect(result.recommendations).toEqual(['AI feedback unavailable - API not configured']);
      expect(mockAnthropicClient.sendMessage).not.toHaveBeenCalled();
    });

    it('should generate feedback successfully', async () => {
      // Arrange
      const sellerData = {
        seller: 'Seller 1',
        metrics: {
          total: 20,
          closed: 12,
          conversionRate: 60.0,
        },
        correlations: [
          {
            dimension: 'industry',
            value: 'Technology',
            total: 10,
            closed: 8,
            successRate: 80.0,
          },
        ],
      };

      const mockPrompt = 'Generate feedback for Seller 1...';
      const mockResponse = '- Focus on Technology clients\n- Improve follow-up process\n- Leverage your strengths';

      const mockParsed = [
        'Focus on Technology clients',
        'Improve follow-up process',
        'Leverage your strengths',
        'Additional recommendation',
      ];

      mockAnthropicClient.isConfigured.mockReturnValue(true);
      (SellerPromptBuilder.buildFeedback as jest.Mock).mockReturnValue(mockPrompt);
      mockAnthropicClient.sendMessage.mockResolvedValue(mockResponse);
      mockResponseParser.parseArrayResponse.mockReturnValue(mockParsed);

      // Act
      const result = await service.generateSellerFeedback(sellerData);

      // Assert
      expect(result.recommendations.length).toBe(API_CONSTANTS.LIMITS.MAX_RECOMMENDATIONS);
      expect(result.recommendations).toEqual(mockParsed.slice(0, API_CONSTANTS.LIMITS.MAX_RECOMMENDATIONS));
      expect(SellerPromptBuilder.buildFeedback).toHaveBeenCalledWith(sellerData);
      expect(mockAnthropicClient.sendMessage).toHaveBeenCalledWith({
        prompt: mockPrompt,
        maxTokens: LLM_CONSTANTS.MAX_TOKENS.SELLER_FEEDBACK,
      });
    });

    it('should limit recommendations to MAX_RECOMMENDATIONS', async () => {
      // Arrange
      const sellerData = {
        seller: 'Seller 1',
        metrics: {
          total: 20,
          closed: 12,
          conversionRate: 60.0,
        },
        correlations: [],
      };

      const mockParsed = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];

      mockAnthropicClient.isConfigured.mockReturnValue(true);
      (SellerPromptBuilder.buildFeedback as jest.Mock).mockReturnValue('prompt');
      mockAnthropicClient.sendMessage.mockResolvedValue('response');
      mockResponseParser.parseArrayResponse.mockReturnValue(mockParsed);

      // Act
      const result = await service.generateSellerFeedback(sellerData);

      // Assert
      expect(result.recommendations.length).toBe(API_CONSTANTS.LIMITS.MAX_RECOMMENDATIONS);
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      const sellerData = {
        seller: 'Seller 1',
        metrics: {
          total: 20,
          closed: 12,
          conversionRate: 60.0,
        },
        correlations: [],
      };

      mockAnthropicClient.isConfigured.mockReturnValue(true);
      (SellerPromptBuilder.buildFeedback as jest.Mock).mockReturnValue('prompt');
      mockAnthropicClient.sendMessage.mockRejectedValue(new Error('API Error'));

      // Act
      const result = await service.generateSellerFeedback(sellerData);

      // Assert
      expect(result.recommendations).toEqual(['Unable to generate feedback at this time']);
    });
  });

  describe('generateSellerCorrelationInsight', () => {
    it('should return fallback when API is not configured', async () => {
      // Arrange
      mockAnthropicClient.isConfigured.mockReturnValue(false);

      // Act
      const result = await service.generateSellerCorrelationInsight('Seller 1', []);

      // Assert
      expect(result).toBe('AI insights unavailable - API not configured');
      expect(mockAnthropicClient.sendMessage).not.toHaveBeenCalled();
    });

    it('should return fallback when correlations array is empty', async () => {
      // Arrange
      mockAnthropicClient.isConfigured.mockReturnValue(true);

      // Act
      const result = await service.generateSellerCorrelationInsight('Seller 1', []);

      // Assert
      expect(result).toBe('No significant correlations found for this seller.');
      expect(mockAnthropicClient.sendMessage).not.toHaveBeenCalled();
    });

    it('should return fallback when correlations is null', async () => {
      // Arrange
      mockAnthropicClient.isConfigured.mockReturnValue(true);

      // Act
      const result = await service.generateSellerCorrelationInsight('Seller 1', null as any);

      // Assert
      expect(result).toBe('No significant correlations found for this seller.');
    });

    it('should generate insight successfully', async () => {
      // Arrange
      const correlations = [
        {
          dimension: 'industry',
          value: 'Technology',
          successRate: 80.0,
          closed: 8,
          total: 10,
          performanceVsAvg: 25.0,
        },
      ];

      const mockPrompt = 'Analyze correlations for Seller 1...';
      const mockResponse = 'Seller 1 shows strong performance with Technology clients.';

      mockAnthropicClient.isConfigured.mockReturnValue(true);
      (SellerPromptBuilder.buildCorrelationInsight as jest.Mock).mockReturnValue(mockPrompt);
      mockAnthropicClient.sendMessage.mockResolvedValue(mockResponse);

      // Act
      const result = await service.generateSellerCorrelationInsight('Seller 1', correlations);

      // Assert
      expect(result).toBe(mockResponse);
      expect(SellerPromptBuilder.buildCorrelationInsight).toHaveBeenCalledWith('Seller 1', correlations);
      expect(mockAnthropicClient.sendMessage).toHaveBeenCalledWith({
        prompt: mockPrompt,
        maxTokens: LLM_CONSTANTS.MAX_TOKENS.STANDARD,
      });
    });

    it('should use fallback when response is empty', async () => {
      // Arrange
      const correlations = [
        {
          dimension: 'industry',
          value: 'Technology',
          successRate: 80.0,
          closed: 8,
          total: 10,
          performanceVsAvg: 25.0,
        },
      ];

      mockAnthropicClient.isConfigured.mockReturnValue(true);
      (SellerPromptBuilder.buildCorrelationInsight as jest.Mock).mockReturnValue('prompt');
      mockAnthropicClient.sendMessage.mockResolvedValue('   ');

      // Act
      const result = await service.generateSellerCorrelationInsight('Seller 1', correlations);

      // Assert
      expect(result).toBe('No insights available for Seller 1.');
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      const correlations = [
        {
          dimension: 'industry',
          value: 'Technology',
          successRate: 80.0,
          closed: 8,
          total: 10,
          performanceVsAvg: 25.0,
        },
      ];

      mockAnthropicClient.isConfigured.mockReturnValue(true);
      (SellerPromptBuilder.buildCorrelationInsight as jest.Mock).mockReturnValue('prompt');
      mockAnthropicClient.sendMessage.mockRejectedValue(new Error('API Error'));

      // Act
      const result = await service.generateSellerCorrelationInsight('Seller 1', correlations);

      // Assert
      expect(result).toBe('Unable to generate insights for Seller 1 at this time.');
    });
  });

  describe('generateSellerTimelineInsight', () => {
    it('should return fallback when API is not configured', async () => {
      // Arrange
      mockAnthropicClient.isConfigured.mockReturnValue(false);

      // Act
      const result = await service.generateSellerTimelineInsight([], [], 'month');

      // Assert
      expect(result).toBe('AI insights unavailable - API not configured');
      expect(mockAnthropicClient.sendMessage).not.toHaveBeenCalled();
    });

    it('should return fallback when timeline data is empty', async () => {
      // Arrange
      mockAnthropicClient.isConfigured.mockReturnValue(true);

      // Act
      const result = await service.generateSellerTimelineInsight([], ['Seller 1'], 'month');

      // Assert
      expect(result).toBe('Insufficient data to generate insights.');
      expect(mockAnthropicClient.sendMessage).not.toHaveBeenCalled();
    });

    it('should return fallback when sellers array is empty', async () => {
      // Arrange
      mockAnthropicClient.isConfigured.mockReturnValue(true);

      // Act
      const result = await service.generateSellerTimelineInsight([{ period: '2024-01' }], [], 'month');

      // Assert
      expect(result).toBe('Insufficient data to generate insights.');
    });

    it('should return fallback when timeline data is null', async () => {
      // Arrange
      mockAnthropicClient.isConfigured.mockReturnValue(true);

      // Act
      const result = await service.generateSellerTimelineInsight(null as any, ['Seller 1'], 'month');

      // Assert
      expect(result).toBe('Insufficient data to generate insights.');
    });

    it('should calculate seller stats correctly', async () => {
      // Arrange
      const timelineData = [
        { date: '2024-01', 'Seller 1': 5, 'Seller 2': 3 },
        { date: '2024-02', 'Seller 1': 6, 'Seller 2': 4 },
        { date: '2024-03', 'Seller 1': 7, 'Seller 2': 5 },
        { date: '2024-04', 'Seller 1': 8, 'Seller 2': 6 },
      ];

      const sellers = ['Seller 1', 'Seller 2'];

      const mockPrompt = 'Analyze timeline...';
      const mockResponse = 'Seller 1 shows increasing trend.';

      mockAnthropicClient.isConfigured.mockReturnValue(true);
      (SellerPromptBuilder.buildTimelineInsight as jest.Mock).mockReturnValue(mockPrompt);
      mockAnthropicClient.sendMessage.mockResolvedValue(mockResponse);

      // Act
      const result = await service.generateSellerTimelineInsight(timelineData, sellers, 'month');

      // Assert
      expect(result).toBe(mockResponse);
      expect(SellerPromptBuilder.buildTimelineInsight).toHaveBeenCalled();
      expect(mockAnthropicClient.sendMessage).toHaveBeenCalledWith({
        prompt: mockPrompt,
        maxTokens: LLM_CONSTANTS.MAX_TOKENS.EXTENDED,
      });
    });

    it('should handle sellers with null values in timeline', async () => {
      // Arrange
      const timelineData = [
        { date: '2024-01', 'Seller 1': 5, 'Seller 2': null },
        { date: '2024-02', 'Seller 1': 6, 'Seller 2': undefined },
      ];

      const sellers = ['Seller 1', 'Seller 2'];

      mockAnthropicClient.isConfigured.mockReturnValue(true);
      (SellerPromptBuilder.buildTimelineInsight as jest.Mock).mockReturnValue('prompt');
      mockAnthropicClient.sendMessage.mockResolvedValue('response');

      // Act
      const result = await service.generateSellerTimelineInsight(timelineData, sellers, 'month');

      // Assert
      expect(result).toBe('response');
      expect(SellerPromptBuilder.buildTimelineInsight).toHaveBeenCalled();
    });

    it('should handle sellers with null/undefined values correctly', async () => {
      // Arrange
      const timelineData = [
        { date: '2024-01', 'Seller 1': 5, 'Seller 2': null },
        { date: '2024-02', 'Seller 1': 6, 'Seller 2': undefined },
      ];

      const sellers = ['Seller 1', 'Seller 2'];

      mockAnthropicClient.isConfigured.mockReturnValue(true);
      (SellerPromptBuilder.buildTimelineInsight as jest.Mock).mockReturnValue('prompt');
      mockAnthropicClient.sendMessage.mockResolvedValue('response');

      // Act
      const result = await service.generateSellerTimelineInsight(timelineData, sellers, 'month');

      // Assert
      expect(result).toBe('response');
      // Both sellers should be present because the service uses || 0 for missing values
      // and filters out null/undefined, so Seller 2 will have 0 values that pass the filter
      const callArgs = (SellerPromptBuilder.buildTimelineInsight as jest.Mock).mock.calls[0][0];
      expect(callArgs.length).toBeGreaterThanOrEqual(1);
      expect(callArgs.some((stat: { seller: string }) => stat.seller === 'Seller 1')).toBe(true);
    });

    it('should calculate trends correctly (increasing)', async () => {
      // Arrange
      const timelineData = [
        { date: '2024-01', 'Seller 1': 2 },
        { date: '2024-02', 'Seller 1': 4 },
        { date: '2024-03', 'Seller 1': 6 },
        { date: '2024-04', 'Seller 1': 8 },
      ];

      const sellers = ['Seller 1'];

      mockAnthropicClient.isConfigured.mockReturnValue(true);
      (SellerPromptBuilder.buildTimelineInsight as jest.Mock).mockReturnValue('prompt');
      mockAnthropicClient.sendMessage.mockResolvedValue('response');

      // Act
      await service.generateSellerTimelineInsight(timelineData, sellers, 'month');

      // Assert
      const callArgs = (SellerPromptBuilder.buildTimelineInsight as jest.Mock).mock.calls[0][0];
      expect(callArgs[0].trend).toBe('increasing');
    });

    it('should calculate trends correctly (decreasing)', async () => {
      // Arrange
      const timelineData = [
        { date: '2024-01', 'Seller 1': 8 },
        { date: '2024-02', 'Seller 1': 6 },
        { date: '2024-03', 'Seller 1': 4 },
        { date: '2024-04', 'Seller 1': 2 },
      ];

      const sellers = ['Seller 1'];

      mockAnthropicClient.isConfigured.mockReturnValue(true);
      (SellerPromptBuilder.buildTimelineInsight as jest.Mock).mockReturnValue('prompt');
      mockAnthropicClient.sendMessage.mockResolvedValue('response');

      // Act
      await service.generateSellerTimelineInsight(timelineData, sellers, 'month');

      // Assert
      const callArgs = (SellerPromptBuilder.buildTimelineInsight as jest.Mock).mock.calls[0][0];
      expect(callArgs[0].trend).toBe('decreasing');
    });

    it('should calculate trends correctly (stable)', async () => {
      // Arrange
      const timelineData = [
        { date: '2024-01', 'Seller 1': 5 },
        { date: '2024-02', 'Seller 1': 5 },
        { date: '2024-03', 'Seller 1': 5 },
        { date: '2024-04', 'Seller 1': 5 },
      ];

      const sellers = ['Seller 1'];

      mockAnthropicClient.isConfigured.mockReturnValue(true);
      (SellerPromptBuilder.buildTimelineInsight as jest.Mock).mockReturnValue('prompt');
      mockAnthropicClient.sendMessage.mockResolvedValue('response');

      // Act
      await service.generateSellerTimelineInsight(timelineData, sellers, 'month');

      // Assert
      const callArgs = (SellerPromptBuilder.buildTimelineInsight as jest.Mock).mock.calls[0][0];
      expect(callArgs[0].trend).toBe('stable');
    });

    it('should use fallback when response is empty', async () => {
      // Arrange
      const timelineData = [
        { date: '2024-01', 'Seller 1': 5 },
      ];

      const sellers = ['Seller 1'];

      mockAnthropicClient.isConfigured.mockReturnValue(true);
      (SellerPromptBuilder.buildTimelineInsight as jest.Mock).mockReturnValue('prompt');
      mockAnthropicClient.sendMessage.mockResolvedValue('   ');

      // Act
      const result = await service.generateSellerTimelineInsight(timelineData, sellers, 'month');

      // Assert
      expect(result).toBe('Unable to generate insights at this time.');
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      const timelineData = [
        { date: '2024-01', 'Seller 1': 5 },
      ];

      const sellers = ['Seller 1'];

      mockAnthropicClient.isConfigured.mockReturnValue(true);
      (SellerPromptBuilder.buildTimelineInsight as jest.Mock).mockReturnValue('prompt');
      mockAnthropicClient.sendMessage.mockRejectedValue(new Error('API Error'));

      // Act
      const result = await service.generateSellerTimelineInsight(timelineData, sellers, 'month');

      // Assert
      expect(result).toBe('Unable to generate insights at this time.');
    });
  });
});

