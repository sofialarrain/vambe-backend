import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { AnthropicClientService } from './anthropic-client.service';
import { LLM_CONSTANTS } from '../../common/constants';

// Mock the Anthropic SDK
jest.mock('@anthropic-ai/sdk');

describe('AnthropicClientService', () => {
  let service: AnthropicClientService;
  let configService: jest.Mocked<ConfigService>;
  let mockAnthropic: jest.Mocked<Anthropic>;

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock Anthropic constructor
    const mockCreate = jest.fn();
    mockAnthropic = {
      messages: {
        create: mockCreate,
      },
    } as any;

    (Anthropic as jest.MockedClass<typeof Anthropic>).mockImplementation(() => mockAnthropic);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnthropicClientService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AnthropicClientService>(AnthropicClientService);
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize client when API key is configured', () => {
      // Arrange
      mockConfigService.get.mockReturnValue('valid-api-key');
      const service = new AnthropicClientService(configService);

      // Assert
      expect(Anthropic).toHaveBeenCalledWith({ apiKey: 'valid-api-key' });
      expect(service.isConfigured()).toBe(true);
    });

    it('should not initialize client when API key is missing', () => {
      // Arrange
      mockConfigService.get.mockReturnValue(undefined);
      const service = new AnthropicClientService(configService);

      // Assert
      expect(service.isConfigured()).toBe(false);
    });

    it('should not initialize client when API key is placeholder', () => {
      // Arrange
      mockConfigService.get.mockReturnValue('your-api-key-here');
      const service = new AnthropicClientService(configService);

      // Assert
      expect(service.isConfigured()).toBe(false);
    });
  });

  describe('isConfigured', () => {
    it('should return true when client is initialized', () => {
      // Arrange
      mockConfigService.get.mockReturnValue('valid-api-key');
      const service = new AnthropicClientService(configService);

      // Act & Assert
      expect(service.isConfigured()).toBe(true);
    });

    it('should return false when client is not initialized', () => {
      // Arrange
      mockConfigService.get.mockReturnValue(undefined);
      const service = new AnthropicClientService(configService);

      // Act & Assert
      expect(service.isConfigured()).toBe(false);
    });
  });

  describe('sendMessage', () => {
    beforeEach(() => {
      mockConfigService.get.mockReturnValue('valid-api-key');
    });

    it('should send message successfully with default model and tokens', async () => {
      // Arrange
      const service = new AnthropicClientService(configService);
      const mockResponse = {
        content: [
          {
            type: 'text',
            text: 'Response text',
          },
        ],
      };

      (mockAnthropic.messages.create as jest.Mock).mockResolvedValue(mockResponse as any);

      // Act
      const result = await service.sendMessage({
        prompt: 'Test prompt',
      });

      // Assert
      expect(result).toBe('Response text');
      expect(mockAnthropic.messages.create).toHaveBeenCalledWith({
        model: LLM_CONSTANTS.DEFAULT_MODEL,
        max_tokens: LLM_CONSTANTS.MAX_TOKENS.DEFAULT,
        messages: [
          {
            role: 'user',
            content: 'Test prompt',
          },
        ],
      });
    });

    it('should send message with custom model', async () => {
      // Arrange
      const service = new AnthropicClientService(configService);
      const mockResponse = {
        content: [
          {
            type: 'text',
            text: 'Response',
          },
        ],
      };

      (mockAnthropic.messages.create as jest.Mock).mockResolvedValue(mockResponse as any);

      // Act
      await service.sendMessage({
        prompt: 'Test prompt',
        model: 'claude-3-opus-20240229',
      });

      // Assert
      expect(mockAnthropic.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-3-opus-20240229',
        }),
      );
    });

    it('should send message with custom max tokens', async () => {
      // Arrange
      const service = new AnthropicClientService(configService);
      const mockResponse = {
        content: [
          {
            type: 'text',
            text: 'Response',
          },
        ],
      };

      (mockAnthropic.messages.create as jest.Mock).mockResolvedValue(mockResponse as any);

      // Act
      await service.sendMessage({
        prompt: 'Test prompt',
        maxTokens: 500,
      });

      // Assert
      expect(mockAnthropic.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          max_tokens: 500,
        }),
      );
    });

    it('should handle empty text response', async () => {
      // Arrange
      const service = new AnthropicClientService(configService);
      const mockResponse = {
        content: [
          {
            type: 'text',
            text: '',
          },
        ],
      };

      (mockAnthropic.messages.create as jest.Mock).mockResolvedValue(mockResponse as any);

      // Act
      const result = await service.sendMessage({
        prompt: 'Test prompt',
      });

      // Assert
      expect(result).toBe('');
    });

    it('should handle non-text content type', async () => {
      // Arrange
      const service = new AnthropicClientService(configService);
      const mockResponse = {
        content: [
          {
            type: 'image',
            source: {},
          },
        ],
      };

      (mockAnthropic.messages.create as jest.Mock).mockResolvedValue(mockResponse as any);

      // Act
      const result = await service.sendMessage({
        prompt: 'Test prompt',
      });

      // Assert
      expect(result).toBe('');
    });

    it('should throw error when API is not configured', async () => {
      // Arrange
      mockConfigService.get.mockReturnValue(undefined);
      const service = new AnthropicClientService(configService);

      // Act & Assert
      await expect(
        service.sendMessage({
          prompt: 'Test prompt',
        }),
      ).rejects.toThrow('Anthropic API not configured');
    });

    it('should throw error when API call fails', async () => {
      // Arrange
      const service = new AnthropicClientService(configService);
      const apiError = new Error('API Error');
      (mockAnthropic.messages.create as jest.Mock).mockRejectedValue(apiError);

      // Act & Assert
      await expect(
        service.sendMessage({
          prompt: 'Test prompt',
        }),
      ).rejects.toThrow('API Error');
    });

    it('should handle multiple content items by taking first text', async () => {
      // Arrange
      const service = new AnthropicClientService(configService);
      const mockResponse = {
        content: [
          {
            type: 'text',
            text: 'First text',
          },
          {
            type: 'text',
            text: 'Second text',
          },
        ],
      };

      (mockAnthropic.messages.create as jest.Mock).mockResolvedValue(mockResponse as any);

      // Act
      const result = await service.sendMessage({
        prompt: 'Test prompt',
      });

      // Assert
      expect(result).toBe('First text');
    });
  });
});

