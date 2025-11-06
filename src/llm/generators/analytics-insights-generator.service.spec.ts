import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsInsightsGeneratorService } from './analytics-insights-generator.service';
import { AnthropicClientService } from '../core/anthropic-client.service';
import { ResponseParserService } from '../core/response-parser.service';
import { TimelineInsightDto } from '../../common/dto/analytics';
import { LLM_CONSTANTS } from '../../common/constants';

describe('AnalyticsInsightsGeneratorService', () => {
  let service: AnalyticsInsightsGeneratorService;
  let anthropicClient: jest.Mocked<AnthropicClientService>;
  let responseParser: jest.Mocked<ResponseParserService>;

  const mockAnthropicClient = {
    isConfigured: jest.fn(),
    sendMessage: jest.fn(),
  };

  const mockResponseParser = {
    parseJsonResponse: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsInsightsGeneratorService,
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

    service = module.get<AnalyticsInsightsGeneratorService>(
      AnalyticsInsightsGeneratorService,
    );
    anthropicClient = module.get(AnthropicClientService);
    responseParser = module.get(ResponseParserService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generatePainPointsInsight', () => {
    const mockPainPoints = [
      {
        painPoint: 'High workload',
        count: 10,
        conversionRate: 60.0,
      },
      {
        painPoint: 'Slow response times',
        count: 8,
        conversionRate: 50.0,
      },
    ];

    it('should return fallback insight when API is not configured', async () => {
      // Arrange
      mockAnthropicClient.isConfigured.mockReturnValue(false);

      // Act
      const result = await service.generatePainPointsInsight(mockPainPoints);

      // Assert
      expect(result).toEqual({
        insight: 'AI insights unavailable - API not configured',
      });
      expect(mockAnthropicClient.sendMessage).not.toHaveBeenCalled();
    });

    it('should generate insight successfully when API is configured', async () => {
      // Arrange
      const mockResponse = 'High workload is the most significant pain point affecting conversion rates.';
      mockAnthropicClient.isConfigured.mockReturnValue(true);
      mockAnthropicClient.sendMessage.mockResolvedValue(mockResponse);

      // Act
      const result = await service.generatePainPointsInsight(mockPainPoints);

      // Assert
      expect(result).toEqual({
        insight: mockResponse.trim(),
      });
      expect(mockAnthropicClient.sendMessage).toHaveBeenCalledWith({
        prompt: expect.any(String),
        maxTokens: LLM_CONSTANTS.MAX_TOKENS.STANDARD,
      });
    });

    it('should return fallback insight when API call fails', async () => {
      // Arrange
      mockAnthropicClient.isConfigured.mockReturnValue(true);
      mockAnthropicClient.sendMessage.mockRejectedValue(new Error('API Error'));

      // Act
      const result = await service.generatePainPointsInsight(mockPainPoints);

      // Assert
      expect(result).toEqual({
        insight: expect.stringContaining('Unable to generate insight at this time'),
      });
    });

    it('should return default insight when response is empty', async () => {
      // Arrange
      mockAnthropicClient.isConfigured.mockReturnValue(true);
      mockAnthropicClient.sendMessage.mockResolvedValue('   ');

      // Act
      const result = await service.generatePainPointsInsight(mockPainPoints);

      // Assert
      expect(result.insight).toBe(
        'The analysis reveals common client challenges that impact deal conversion rates.',
      );
    });
  });

  describe('generateVolumeVsConversionInsight', () => {
    const mockVolumeData = [
      {
        volumeRange: '0-100',
        count: 5,
        conversionRate: 40.0,
      },
      {
        volumeRange: '101-200',
        count: 8,
        conversionRate: 62.5,
      },
    ];

    it('should return fallback insight when API is not configured', async () => {
      // Arrange
      mockAnthropicClient.isConfigured.mockReturnValue(false);

      // Act
      const result = await service.generateVolumeVsConversionInsight(mockVolumeData);

      // Assert
      expect(result).toEqual({
        insight: 'AI insights unavailable - API not configured',
      });
    });

    it('should return fallback when no valid data provided', async () => {
      // Arrange
      const invalidData = [
        {
          volumeRange: '0-100',
          count: 0,
          conversionRate: 0,
        },
      ];
      mockAnthropicClient.isConfigured.mockReturnValue(true);

      // Act
      const result = await service.generateVolumeVsConversionInsight(invalidData);

      // Assert
      expect(result).toEqual({
        insight: 'Insufficient data to analyze volume vs conversion relationship.',
      });
      expect(mockAnthropicClient.sendMessage).not.toHaveBeenCalled();
    });

    it('should filter out invalid data before processing', async () => {
      // Arrange
      const mixedData = [
        {
          volumeRange: '0-100',
          count: 0,
          conversionRate: 0,
        },
        {
          volumeRange: '101-200',
          count: 5,
          conversionRate: 60.0,
        },
      ];
      const mockResponse = 'Higher interaction volumes correlate with better conversion rates.';
      mockAnthropicClient.isConfigured.mockReturnValue(true);
      mockAnthropicClient.sendMessage.mockResolvedValue(mockResponse);

      // Act
      const result = await service.generateVolumeVsConversionInsight(mixedData);

      // Assert
      expect(result.insight).toBe(mockResponse.trim());
      expect(mockAnthropicClient.sendMessage).toHaveBeenCalledWith({
        prompt: expect.any(String),
        maxTokens: LLM_CONSTANTS.MAX_TOKENS.STANDARD,
      });
    });

    it('should return fallback insight when API call fails', async () => {
      // Arrange
      mockAnthropicClient.isConfigured.mockReturnValue(true);
      mockAnthropicClient.sendMessage.mockRejectedValue(new Error('API Error'));

      // Act
      const result = await service.generateVolumeVsConversionInsight(mockVolumeData);

      // Assert
      expect(result).toEqual({
        insight: expect.stringContaining('Unable to generate insight at this time'),
      });
    });
  });

  describe('generateTimelineInsight', () => {
    const mockTimelineData = [
      {
        month: '2024-01',
        totalMeetings: 10,
        totalClosed: 6,
        conversionRate: 60.0,
        avgSentiment: 'positive',
      },
      {
        month: '2024-02',
        totalMeetings: 12,
        totalClosed: 8,
        conversionRate: 66.67,
        avgSentiment: 'positive',
      },
    ];

    it('should return fallback insight when API is not configured', async () => {
      // Arrange
      mockAnthropicClient.isConfigured.mockReturnValue(false);

      // Act
      const result = await service.generateTimelineInsight(mockTimelineData);

      // Assert
      expect(result).toEqual({
        keyFindings: ['AI insights unavailable - API not configured'],
        reasons: [],
        recommendations: [],
      });
    });

    it('should return fallback when timeline data is empty', async () => {
      // Arrange
      mockAnthropicClient.isConfigured.mockReturnValue(true);

      // Act
      const result = await service.generateTimelineInsight([]);

      // Assert
      expect(result).toEqual({
        keyFindings: ['Insufficient data to generate timeline insights.'],
        reasons: [],
        recommendations: [],
      });
      expect(mockAnthropicClient.sendMessage).not.toHaveBeenCalled();
    });

    it('should return fallback when timeline data is null', async () => {
      // Arrange
      mockAnthropicClient.isConfigured.mockReturnValue(true);

      // Act
      const result = await service.generateTimelineInsight(null as any);

      // Assert
      expect(result).toEqual({
        keyFindings: ['Insufficient data to generate timeline insights.'],
        reasons: [],
        recommendations: [],
      });
    });

    it('should generate timeline insight successfully', async () => {
      // Arrange
      const mockResponse = JSON.stringify({
        keyFindings: ['Conversion rates improved over time'],
        reasons: ['Better client engagement'],
        recommendations: ['Continue current strategy'],
      });

      const parsedResponse: TimelineInsightDto = {
        keyFindings: ['Conversion rates improved over time'],
        reasons: ['Better client engagement'],
        recommendations: ['Continue current strategy'],
      };

      mockAnthropicClient.isConfigured.mockReturnValue(true);
      mockAnthropicClient.sendMessage.mockResolvedValue(mockResponse);
      mockResponseParser.parseJsonResponse.mockReturnValue(parsedResponse);

      // Act
      const result = await service.generateTimelineInsight(mockTimelineData);

      // Assert
      expect(result).toEqual(parsedResponse);
      expect(mockAnthropicClient.sendMessage).toHaveBeenCalledWith({
        prompt: expect.any(String),
        maxTokens: LLM_CONSTANTS.MAX_TOKENS.TIMELINE,
      });
      expect(mockResponseParser.parseJsonResponse).toHaveBeenCalledWith(
        mockResponse,
        expect.any(Object),
      );
    });

    it('should handle non-array keyFindings in parsed response', async () => {
      // Arrange
      const mockResponse = JSON.stringify({
        keyFindings: 'Single finding',
        reasons: ['Reason 1'],
        recommendations: ['Recommendation 1'],
      });

      const parsedResponse = {
        keyFindings: 'Single finding',
        reasons: ['Reason 1'],
        recommendations: ['Recommendation 1'],
      };

      mockAnthropicClient.isConfigured.mockReturnValue(true);
      mockAnthropicClient.sendMessage.mockResolvedValue(mockResponse);
      mockResponseParser.parseJsonResponse.mockReturnValue(parsedResponse as any);

      // Act
      const result = await service.generateTimelineInsight(mockTimelineData);

      // Assert
      expect(result.keyFindings).toEqual(['Single finding']);
      expect(Array.isArray(result.keyFindings)).toBe(true);
    });

    it('should handle non-array reasons in parsed response', async () => {
      // Arrange
      const mockResponse = JSON.stringify({
        keyFindings: ['Finding 1'],
        reasons: 'Single reason',
        recommendations: ['Recommendation 1'],
      });

      const parsedResponse = {
        keyFindings: ['Finding 1'],
        reasons: 'Single reason',
        recommendations: ['Recommendation 1'],
      };

      mockAnthropicClient.isConfigured.mockReturnValue(true);
      mockAnthropicClient.sendMessage.mockResolvedValue(mockResponse);
      mockResponseParser.parseJsonResponse.mockReturnValue(parsedResponse as any);

      // Act
      const result = await service.generateTimelineInsight(mockTimelineData);

      // Assert
      expect(result.reasons).toEqual(['Single reason']);
      expect(Array.isArray(result.reasons)).toBe(true);
    });

    it('should return fallback when API call fails', async () => {
      // Arrange
      mockAnthropicClient.isConfigured.mockReturnValue(true);
      mockAnthropicClient.sendMessage.mockRejectedValue(new Error('API Error'));

      // Act
      const result = await service.generateTimelineInsight(mockTimelineData);

      // Assert
      expect(result).toEqual({
        keyFindings: ['Unable to generate timeline insights at this time.'],
        reasons: [],
        recommendations: [],
      });
    });

    it('should use fallback when parsing fails', async () => {
      // Arrange
      const mockResponse = 'Invalid JSON response';
      const fallback: TimelineInsightDto = {
        keyFindings: ['Timeline analysis indicates stable performance with ongoing monitoring recommended.'],
        reasons: ['Further analysis needed to identify specific reasons.'],
        recommendations: ['Continue monitoring recent trends and patterns.'],
      };

      mockAnthropicClient.isConfigured.mockReturnValue(true);
      mockAnthropicClient.sendMessage.mockResolvedValue(mockResponse);
      mockResponseParser.parseJsonResponse.mockReturnValue(fallback);

      // Act
      const result = await service.generateTimelineInsight(mockTimelineData);

      // Assert
      expect(result).toEqual(fallback);
    });
  });
});

