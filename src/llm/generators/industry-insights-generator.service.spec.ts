import { Test, TestingModule } from '@nestjs/testing';
import { IndustryInsightsGeneratorService } from './industry-insights-generator.service';
import { AnthropicClientService } from '../core/anthropic-client.service';
import { IndustryPromptBuilder } from '../prompts/industry-prompt.builder';
import { LLM_CONSTANTS } from '../../common/constants';

// Mock the prompt builder
jest.mock('../prompts/industry-prompt.builder', () => ({
  IndustryPromptBuilder: {
    buildDistributionInsight: jest.fn(),
    buildConversionInsight: jest.fn(),
  },
}));

describe('IndustryInsightsGeneratorService', () => {
  let service: IndustryInsightsGeneratorService;
  let anthropicClient: jest.Mocked<AnthropicClientService>;

  const mockAnthropicClient = {
    isConfigured: jest.fn(),
    sendMessage: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IndustryInsightsGeneratorService,
        {
          provide: AnthropicClientService,
          useValue: mockAnthropicClient,
        },
      ],
    }).compile();

    service = module.get<IndustryInsightsGeneratorService>(IndustryInsightsGeneratorService);
    anthropicClient = module.get(AnthropicClientService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateIndustryDistributionInsight', () => {
    it('should return fallback when API is not configured', async () => {
      // Arrange
      mockAnthropicClient.isConfigured.mockReturnValue(false);

      // Act
      const result = await service.generateIndustryDistributionInsight([
        {
          value: 'Technology',
          count: 10,
          closed: 6,
          conversionRate: 60.0,
        },
      ]);

      // Assert
      expect(result.insight).toBe('AI insights unavailable - API not configured');
      expect(mockAnthropicClient.sendMessage).not.toHaveBeenCalled();
    });

    it('should generate insight successfully', async () => {
      // Arrange
      const industryData = [
        {
          value: 'Technology',
          count: 10,
          closed: 6,
          conversionRate: 60.0,
        },
        {
          value: 'Finance',
          count: 8,
          closed: 4,
          conversionRate: 50.0,
        },
      ];

      const mockPrompt = 'Analyze industry distribution...';
      const mockResponse = 'Technology industry shows strong representation with 10 clients.';

      mockAnthropicClient.isConfigured.mockReturnValue(true);
      (IndustryPromptBuilder.buildDistributionInsight as jest.Mock).mockReturnValue(mockPrompt);
      mockAnthropicClient.sendMessage.mockResolvedValue(mockResponse);

      // Act
      const result = await service.generateIndustryDistributionInsight(industryData);

      // Assert
      expect(result.insight).toBe(mockResponse);
      expect(IndustryPromptBuilder.buildDistributionInsight).toHaveBeenCalledWith(industryData);
      expect(mockAnthropicClient.sendMessage).toHaveBeenCalledWith({
        prompt: mockPrompt,
        maxTokens: LLM_CONSTANTS.MAX_TOKENS.STANDARD,
      });
    });

    it('should use fallback when response is empty', async () => {
      // Arrange
      const industryData = [
        {
          value: 'Technology',
          count: 10,
          closed: 6,
          conversionRate: 60.0,
        },
      ];

      mockAnthropicClient.isConfigured.mockReturnValue(true);
      (IndustryPromptBuilder.buildDistributionInsight as jest.Mock).mockReturnValue('prompt');
      mockAnthropicClient.sendMessage.mockResolvedValue('   ');

      // Act
      const result = await service.generateIndustryDistributionInsight(industryData);

      // Assert
      expect(result.insight).toBe('The client base shows diverse industry representation with varying concentration levels.');
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      const industryData = [
        {
          value: 'Technology',
          count: 10,
          closed: 6,
          conversionRate: 60.0,
        },
      ];

      mockAnthropicClient.isConfigured.mockReturnValue(true);
      (IndustryPromptBuilder.buildDistributionInsight as jest.Mock).mockReturnValue('prompt');
      mockAnthropicClient.sendMessage.mockRejectedValue(new Error('API Error'));

      // Act
      const result = await service.generateIndustryDistributionInsight(industryData);

      // Assert
      expect(result.insight).toBe('Unable to generate insight at this time. The distribution shows diverse industry representation.');
    });
  });

  describe('generateIndustryConversionInsight', () => {
    it('should return fallback when API is not configured', async () => {
      // Arrange
      mockAnthropicClient.isConfigured.mockReturnValue(false);

      // Act
      const result = await service.generateIndustryConversionInsight([
        {
          value: 'Technology',
          count: 10,
          closed: 6,
          conversionRate: 60.0,
        },
      ]);

      // Assert
      expect(result.insight).toBe('AI insights unavailable - API not configured');
      expect(mockAnthropicClient.sendMessage).not.toHaveBeenCalled();
    });

    it('should return fallback when no reliable industries', async () => {
      // Arrange
      const industryData = [
        {
          value: 'Technology',
          count: 2, // Less than 3 (MIN_CLIENTS_FOR_RELIABILITY)
          closed: 1,
          conversionRate: 50.0,
        },
      ];

      mockAnthropicClient.isConfigured.mockReturnValue(true);

      // Act
      const result = await service.generateIndustryConversionInsight(industryData);

      // Assert
      expect(result.insight).toBe('Insufficient data to analyze conversion rates reliably.');
      expect(mockAnthropicClient.sendMessage).not.toHaveBeenCalled();
    });

    it('should filter industries by reliability threshold', async () => {
      // Arrange
      const industryData = [
        {
          value: 'Technology',
          count: 5, // >= 3, reliable
          closed: 3,
          conversionRate: 60.0,
        },
        {
          value: 'Finance',
          count: 2, // < 3, not reliable
          closed: 1,
          conversionRate: 50.0,
        },
        {
          value: 'Healthcare',
          count: 4, // >= 3, reliable
          closed: 2,
          conversionRate: 50.0,
        },
      ];

      const mockPrompt = 'Analyze conversion rates...';
      const mockResponse = 'Technology shows highest conversion rate.';

      mockAnthropicClient.isConfigured.mockReturnValue(true);
      (IndustryPromptBuilder.buildConversionInsight as jest.Mock).mockReturnValue(mockPrompt);
      mockAnthropicClient.sendMessage.mockResolvedValue(mockResponse);

      // Act
      const result = await service.generateIndustryConversionInsight(industryData);

      // Assert
      expect(result.insight).toBe(mockResponse);
      expect(IndustryPromptBuilder.buildConversionInsight).toHaveBeenCalledWith([
        industryData[0], // Technology
        industryData[2], // Healthcare
      ]);
    });

    it('should generate insight successfully with reliable industries', async () => {
      // Arrange
      const industryData = [
        {
          value: 'Technology',
          count: 10,
          closed: 8,
          conversionRate: 80.0,
        },
        {
          value: 'Finance',
          count: 5,
          closed: 3,
          conversionRate: 60.0,
        },
      ];

      const mockPrompt = 'Analyze conversion rates...';
      const mockResponse = 'Technology industry shows excellent conversion performance.';

      mockAnthropicClient.isConfigured.mockReturnValue(true);
      (IndustryPromptBuilder.buildConversionInsight as jest.Mock).mockReturnValue(mockPrompt);
      mockAnthropicClient.sendMessage.mockResolvedValue(mockResponse);

      // Act
      const result = await service.generateIndustryConversionInsight(industryData);

      // Assert
      expect(result.insight).toBe(mockResponse);
      expect(mockAnthropicClient.sendMessage).toHaveBeenCalledWith({
        prompt: mockPrompt,
        maxTokens: LLM_CONSTANTS.MAX_TOKENS.MEDIUM,
      });
    });

    it('should use fallback with top industry when response is empty', async () => {
      // Arrange
      const industryData = [
        {
          value: 'Technology',
          count: 10,
          closed: 8,
          conversionRate: 80.0,
        },
        {
          value: 'Finance',
          count: 5,
          closed: 3,
          conversionRate: 60.0,
        },
      ];

      mockAnthropicClient.isConfigured.mockReturnValue(true);
      (IndustryPromptBuilder.buildConversionInsight as jest.Mock).mockReturnValue('prompt');
      mockAnthropicClient.sendMessage.mockResolvedValue('   ');

      // Act
      const result = await service.generateIndustryConversionInsight(industryData);

      // Assert
      expect(result.insight).toContain('Technology');
      expect(result.insight).toContain('80.0%');
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      const industryData = [
        {
          value: 'Technology',
          count: 10,
          closed: 6,
          conversionRate: 60.0,
        },
      ];

      mockAnthropicClient.isConfigured.mockReturnValue(true);
      (IndustryPromptBuilder.buildConversionInsight as jest.Mock).mockReturnValue('prompt');
      mockAnthropicClient.sendMessage.mockRejectedValue(new Error('API Error'));

      // Act
      const result = await service.generateIndustryConversionInsight(industryData);

      // Assert
      expect(result.insight).toBe('Unable to generate insight at this time.');
    });
  });
});

