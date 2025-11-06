import { Test, TestingModule } from '@nestjs/testing';
import { ClientInsightsGeneratorService } from './client-insights-generator.service';
import { AnthropicClientService } from '../core/anthropic-client.service';
import { ResponseParserService } from '../core/response-parser.service';
import { ClientPromptBuilder } from '../prompts/client-prompt.builder';
import { ClientPerceptionInsightDto } from '../../common/dto/analytics';
import { LLM_CONSTANTS } from '../../common/constants';

// Mock the prompt builder
jest.mock('../prompts/client-prompt.builder', () => ({
  ClientPromptBuilder: {
    buildPerceptionInsight: jest.fn(),
    buildSolutionsInsight: jest.fn(),
  },
}));

describe('ClientInsightsGeneratorService', () => {
  let service: ClientInsightsGeneratorService;
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
        ClientInsightsGeneratorService,
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

    service = module.get<ClientInsightsGeneratorService>(ClientInsightsGeneratorService);
    anthropicClient = module.get(AnthropicClientService);
    responseParser = module.get(ResponseParserService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateClientPerceptionInsight', () => {
    it('should return fallback when API is not configured', async () => {
      // Arrange
      mockAnthropicClient.isConfigured.mockReturnValue(false);

      // Act
      const result = await service.generateClientPerceptionInsight([
        {
          transcription: 'Test transcription',
          closed: true,
          sentiment: 'positive',
        },
      ]);

      // Assert
      expect(result.positiveAspects).toBe('AI insights unavailable - API not configured');
      expect(result.concerns).toBe('AI insights unavailable - API not configured');
      expect(result.successFactors).toBe('AI insights unavailable - API not configured');
      expect(result.recommendations).toBe('AI insights unavailable - API not configured');
      expect(mockAnthropicClient.sendMessage).not.toHaveBeenCalled();
    });

    it('should return fallback when transcriptions array is empty', async () => {
      // Arrange
      mockAnthropicClient.isConfigured.mockReturnValue(true);

      // Act
      const result = await service.generateClientPerceptionInsight([]);

      // Assert
      expect(result.positiveAspects).toBe('Insufficient data to analyze positive aspects.');
      expect(result.concerns).toBe('Insufficient data to analyze concerns.');
      expect(mockAnthropicClient.sendMessage).not.toHaveBeenCalled();
    });

    it('should return fallback when transcriptions is null', async () => {
      // Arrange
      mockAnthropicClient.isConfigured.mockReturnValue(true);

      // Act
      const result = await service.generateClientPerceptionInsight(null as any);

      // Assert
      expect(result.positiveAspects).toBe('Insufficient data to analyze positive aspects.');
      expect(mockAnthropicClient.sendMessage).not.toHaveBeenCalled();
    });

    it('should generate insight successfully with valid data', async () => {
      // Arrange
      const transcriptions = [
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
      ];

      const mockPrompt = 'Analyze client perceptions...';
      const mockResponse = '{"positiveAspects":"Clients appreciate automation","concerns":"Feature requests","successFactors":"Positive sentiment correlates","recommendations":"Focus on automation"}';

      const mockParsed: ClientPerceptionInsightDto = {
        positiveAspects: 'Clients appreciate automation',
        concerns: 'Feature requests',
        successFactors: 'Positive sentiment correlates',
        recommendations: 'Focus on automation',
      };

      mockAnthropicClient.isConfigured.mockReturnValue(true);
      (ClientPromptBuilder.buildPerceptionInsight as jest.Mock).mockReturnValue(mockPrompt);
      mockAnthropicClient.sendMessage.mockResolvedValue(mockResponse);
      mockResponseParser.parseJsonResponse.mockReturnValue(mockParsed);

      // Act
      const result = await service.generateClientPerceptionInsight(transcriptions);

      // Assert
      expect(result).toEqual(mockParsed);
      expect(ClientPromptBuilder.buildPerceptionInsight).toHaveBeenCalledWith(transcriptions);
      expect(mockAnthropicClient.sendMessage).toHaveBeenCalledWith({
        prompt: mockPrompt,
        maxTokens: LLM_CONSTANTS.MAX_TOKENS.CLIENT_PERCEPTION,
      });
      expect(mockResponseParser.parseJsonResponse).toHaveBeenCalledWith(
        mockResponse,
        expect.any(Object),
      );
    });

    it('should use fallback values when parsed response has empty fields', async () => {
      // Arrange
      const transcriptions = [
        {
          transcription: 'Test',
          closed: true,
          sentiment: 'positive',
        },
      ];

      const mockResponse = '{"positiveAspects":"","concerns":"","successFactors":"","recommendations":""}';
      const mockParsed: Partial<ClientPerceptionInsightDto> = {
        positiveAspects: '',
        concerns: '',
        successFactors: '',
        recommendations: '',
      };

      mockAnthropicClient.isConfigured.mockReturnValue(true);
      (ClientPromptBuilder.buildPerceptionInsight as jest.Mock).mockReturnValue('prompt');
      mockAnthropicClient.sendMessage.mockResolvedValue(mockResponse);
      mockResponseParser.parseJsonResponse.mockReturnValue(mockParsed);

      // Act
      const result = await service.generateClientPerceptionInsight(transcriptions);

      // Assert
      expect(result.positiveAspects).toBe('Analysis of client transcripts reveals diverse perceptions of Vambe.');
      expect(result.concerns).toBe('No significant concerns identified.');
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      const transcriptions = [
        {
          transcription: 'Test',
          closed: true,
          sentiment: 'positive',
        },
      ];

      mockAnthropicClient.isConfigured.mockReturnValue(true);
      (ClientPromptBuilder.buildPerceptionInsight as jest.Mock).mockReturnValue('prompt');
      mockAnthropicClient.sendMessage.mockRejectedValue(new Error('API Error'));

      // Act
      const result = await service.generateClientPerceptionInsight(transcriptions);

      // Assert
      expect(result.positiveAspects).toBe('Unable to generate analysis at this time.');
      expect(result.concerns).toBe('Unable to generate analysis at this time.');
    });
  });

  describe('generateClientSolutionsInsight', () => {
    it('should return fallback when API is not configured', async () => {
      // Arrange
      mockAnthropicClient.isConfigured.mockReturnValue(false);

      // Act
      const result = await service.generateClientSolutionsInsight([
        {
          transcription: 'Test',
          closed: true,
        },
      ]);

      // Assert
      expect(result.insight).toBe('AI insights unavailable - API not configured');
      expect(mockAnthropicClient.sendMessage).not.toHaveBeenCalled();
    });

    it('should return fallback when transcriptions array is empty', async () => {
      // Arrange
      mockAnthropicClient.isConfigured.mockReturnValue(true);

      // Act
      const result = await service.generateClientSolutionsInsight([]);

      // Assert
      expect(result.insight).toBe('Insufficient data to analyze client solutions.');
      expect(mockAnthropicClient.sendMessage).not.toHaveBeenCalled();
    });

    it('should generate insight successfully', async () => {
      // Arrange
      const transcriptions = [
        {
          transcription: 'We need automation and API integration.',
          closed: true,
          mainMotivation: 'Efficiency',
          technicalRequirements: ['API integration', 'Real-time updates'],
        },
      ];

      const mockPrompt = 'Analyze client solutions...';
      const mockResponse = 'Clients are seeking automation and efficiency improvements.';

      mockAnthropicClient.isConfigured.mockReturnValue(true);
      (ClientPromptBuilder.buildSolutionsInsight as jest.Mock).mockReturnValue(mockPrompt);
      mockAnthropicClient.sendMessage.mockResolvedValue(mockResponse);

      // Act
      const result = await service.generateClientSolutionsInsight(transcriptions);

      // Assert
      expect(result.insight).toBe(mockResponse);
      expect(ClientPromptBuilder.buildSolutionsInsight).toHaveBeenCalledWith(transcriptions);
      expect(mockAnthropicClient.sendMessage).toHaveBeenCalledWith({
        prompt: mockPrompt,
        maxTokens: LLM_CONSTANTS.MAX_TOKENS.MEDIUM,
      });
    });

    it('should use fallback when response is empty', async () => {
      // Arrange
      const transcriptions = [
        {
          transcription: 'Test',
          closed: true,
        },
      ];

      mockAnthropicClient.isConfigured.mockReturnValue(true);
      (ClientPromptBuilder.buildSolutionsInsight as jest.Mock).mockReturnValue('prompt');
      mockAnthropicClient.sendMessage.mockResolvedValue('   ');

      // Act
      const result = await service.generateClientSolutionsInsight(transcriptions);

      // Assert
      expect(result.insight).toContain('automation');
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      const transcriptions = [
        {
          transcription: 'Test',
          closed: true,
        },
      ];

      mockAnthropicClient.isConfigured.mockReturnValue(true);
      (ClientPromptBuilder.buildSolutionsInsight as jest.Mock).mockReturnValue('prompt');
      mockAnthropicClient.sendMessage.mockRejectedValue(new Error('API Error'));

      // Act
      const result = await service.generateClientSolutionsInsight(transcriptions);

      // Assert
      expect(result.insight).toBe('Unable to generate insight at this time. Clients are seeking solutions to improve their operations and customer experience.');
    });
  });
});

