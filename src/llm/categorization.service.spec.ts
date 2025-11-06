import { Test, TestingModule } from '@nestjs/testing';
import { CategorizationService } from './categorization.service';
import { AnthropicClientService } from './core/anthropic-client.service';
import { ResponseParserService } from './core/response-parser.service';
import { ClientsService } from '../clients/clients.service';
import { Client } from '@prisma/client';
import { CategorizationResultDto } from '../common/dto/llm';
import { LLM_CONSTANTS } from '../common/constants';

describe('CategorizationService', () => {
  let service: CategorizationService;
  let anthropicClient: jest.Mocked<AnthropicClientService>;
  let responseParser: jest.Mocked<ResponseParserService>;
  let clientsService: jest.Mocked<ClientsService>;

  const mockAnthropicClient = {
    isConfigured: jest.fn(),
    sendMessage: jest.fn(),
  };

  const mockResponseParser = {
    parseJsonResponse: jest.fn(),
  };

  const mockClientsService = {
    getUnprocessedClients: jest.fn(),
    findOne: jest.fn(),
    markAsProcessed: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategorizationService,
        {
          provide: AnthropicClientService,
          useValue: mockAnthropicClient,
        },
        {
          provide: ResponseParserService,
          useValue: mockResponseParser,
        },
        {
          provide: ClientsService,
          useValue: mockClientsService,
        },
      ],
    }).compile();

    service = module.get<CategorizationService>(CategorizationService);
    anthropicClient = module.get(AnthropicClientService);
    responseParser = module.get(ResponseParserService);
    clientsService = module.get(ClientsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('categorizeTranscription', () => {
    const mockTranscription = 'This is a test transcription of a sales meeting.';
    const mockClientName = 'Test Client';
    const mockClosed = false;

    it('should throw error when API is not configured', async () => {
      // Arrange
      mockAnthropicClient.isConfigured.mockReturnValue(false);

      // Act & Assert
      await expect(
        service.categorizeTranscription(mockTranscription, mockClientName, mockClosed),
      ).rejects.toThrow('Anthropic API not configured');
    });

    it('should categorize transcription successfully', async () => {
      // Arrange
      const mockResponse = JSON.stringify({
        industry: 'Technology',
        operationSize: 'large',
        interactionVolume: 150,
        discoverySource: 'LinkedIn',
        mainMotivation: 'Efficiency',
        urgencyLevel: 'immediate',
        painPoints: ['High workload', 'Slow response'],
        technicalRequirements: ['API integration'],
        sentiment: 'positive',
      });

      const parsedResponse: CategorizationResultDto = {
        industry: 'Technology',
        operationSize: 'large',
        interactionVolume: 150,
        discoverySource: 'LinkedIn',
        mainMotivation: 'Efficiency',
        urgencyLevel: 'immediate',
        painPoints: ['High workload', 'Slow response'],
        technicalRequirements: ['API integration'],
        sentiment: 'positive',
      };

      mockAnthropicClient.isConfigured.mockReturnValue(true);
      mockAnthropicClient.sendMessage.mockResolvedValue(mockResponse);
      mockResponseParser.parseJsonResponse.mockReturnValue(parsedResponse);

      // Act
      const result = await service.categorizeTranscription(
        mockTranscription,
        mockClientName,
        mockClosed,
      );

      // Assert
      expect(result).toEqual(parsedResponse);
      expect(mockAnthropicClient.sendMessage).toHaveBeenCalledWith({
        prompt: expect.any(String),
        maxTokens: LLM_CONSTANTS.MAX_TOKENS.CATEGORIZATION,
      });
      expect(mockResponseParser.parseJsonResponse).toHaveBeenCalledWith(
        mockResponse,
        expect.any(Object),
      );
    });

    it('should use fallback values when parsed values are missing', async () => {
      // Arrange
      const mockResponse = JSON.stringify({
        industry: null,
        operationSize: null,
        interactionVolume: null,
      });

      const parsedResponse = {
        industry: null,
        operationSize: null,
        interactionVolume: null,
      };

      mockAnthropicClient.isConfigured.mockReturnValue(true);
      mockAnthropicClient.sendMessage.mockResolvedValue(mockResponse);
      mockResponseParser.parseJsonResponse.mockReturnValue(parsedResponse);

      // Act
      const result = await service.categorizeTranscription(
        mockTranscription,
        mockClientName,
        mockClosed,
      );

      // Assert
      expect(result.industry).toBe('Unknown');
      expect(result.interactionVolume).toBe(0);
      expect(result.discoverySource).toBe('Unknown');
      expect(result.mainMotivation).toBe('Unknown');
      expect(result.painPoints).toEqual([]);
      expect(result.technicalRequirements).toEqual([]);
    });

    it('should handle non-array painPoints and technicalRequirements', async () => {
      // Arrange
      const mockResponse = JSON.stringify({
        industry: 'Technology',
        operationSize: 'medium',
        interactionVolume: 100,
        discoverySource: 'Google',
        mainMotivation: 'Scalability',
        urgencyLevel: 'planned',
        painPoints: 'Single pain point',
        technicalRequirements: 'Single requirement',
        sentiment: 'neutral',
      });

      const parsedResponse = {
        industry: 'Technology',
        operationSize: 'medium',
        interactionVolume: 100,
        discoverySource: 'Google',
        mainMotivation: 'Scalability',
        urgencyLevel: 'planned',
        painPoints: 'Single pain point',
        technicalRequirements: 'Single requirement',
        sentiment: 'neutral',
      };

      mockAnthropicClient.isConfigured.mockReturnValue(true);
      mockAnthropicClient.sendMessage.mockResolvedValue(mockResponse);
      mockResponseParser.parseJsonResponse.mockReturnValue(parsedResponse);

      // Act
      const result = await service.categorizeTranscription(
        mockTranscription,
        mockClientName,
        mockClosed,
      );

      // Assert
      expect(result.painPoints).toEqual([]);
      expect(result.technicalRequirements).toEqual([]);
    });

    it('should throw error when API call fails', async () => {
      // Arrange
      mockAnthropicClient.isConfigured.mockReturnValue(true);
      mockAnthropicClient.sendMessage.mockRejectedValue(new Error('API Error'));

      // Act & Assert
      await expect(
        service.categorizeTranscription(mockTranscription, mockClientName, mockClosed),
      ).rejects.toThrow('API Error');
    });

    it('should normalize operationSize, urgencyLevel, and sentiment', async () => {
      // Arrange
      const mockResponse = JSON.stringify({
        industry: 'Technology',
        operationSize: 'LARGE',
        interactionVolume: 200,
        discoverySource: 'LinkedIn',
        mainMotivation: 'Efficiency',
        urgencyLevel: 'IMMEDIATE',
        painPoints: [],
        technicalRequirements: [],
        sentiment: 'POSITIVE',
      });

      const parsedResponse = {
        industry: 'Technology',
        operationSize: 'LARGE',
        interactionVolume: 200,
        discoverySource: 'LinkedIn',
        mainMotivation: 'Efficiency',
        urgencyLevel: 'IMMEDIATE',
        painPoints: [],
        technicalRequirements: [],
        sentiment: 'POSITIVE',
      };

      mockAnthropicClient.isConfigured.mockReturnValue(true);
      mockAnthropicClient.sendMessage.mockResolvedValue(mockResponse);
      mockResponseParser.parseJsonResponse.mockReturnValue(parsedResponse);

      // Act
      const result = await service.categorizeTranscription(
        mockTranscription,
        mockClientName,
        mockClosed,
      );

      // Assert
      // NormalizationUtil should normalize these values
      expect(result.operationSize).toBeDefined();
      expect(result.urgencyLevel).toBeDefined();
      expect(result.sentiment).toBeDefined();
    });
  });

  describe('processSingleClient', () => {
    const mockClient: Client = {
      id: '1',
      name: 'Test Client',
      email: 'test@example.com',
      phone: '123456789',
      assignedSeller: 'Seller 1',
      meetingDate: new Date('2024-01-15'),
      closed: false,
      transcription: 'Test transcription',
      industry: null,
      operationSize: null,
      interactionVolume: null,
      discoverySource: null,
      mainMotivation: null,
      urgencyLevel: null,
      painPoints: null,
      technicalRequirements: null,
      sentiment: null,
      processed: false,
      processedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockCategorization: CategorizationResultDto = {
      industry: 'Technology',
      operationSize: 'large',
      interactionVolume: 150,
      discoverySource: 'LinkedIn',
      mainMotivation: 'Efficiency',
      urgencyLevel: 'immediate',
      painPoints: [],
      technicalRequirements: [],
      sentiment: 'positive',
    };

    it('should process a single client successfully', async () => {
      // Arrange
      mockClientsService.findOne.mockResolvedValue(mockClient);
      mockAnthropicClient.isConfigured.mockReturnValue(true);
      mockAnthropicClient.sendMessage.mockResolvedValue(JSON.stringify(mockCategorization));
      mockResponseParser.parseJsonResponse.mockReturnValue(mockCategorization);
      mockClientsService.markAsProcessed.mockResolvedValue({
        ...mockClient,
        ...mockCategorization,
        processed: true,
        processedAt: new Date(),
      } as any);

      // Act
      await service.processSingleClient('1');

      // Assert
      expect(mockClientsService.findOne).toHaveBeenCalledWith('1');
      expect(mockAnthropicClient.sendMessage).toHaveBeenCalled();
      expect(mockClientsService.markAsProcessed).toHaveBeenCalledWith('1', mockCategorization);
    });

    it('should not process client if already processed', async () => {
      // Arrange
      const processedClient = { ...mockClient, processed: true };
      mockClientsService.findOne.mockResolvedValue(processedClient);

      // Act
      await service.processSingleClient('1');

      // Assert
      expect(mockAnthropicClient.sendMessage).not.toHaveBeenCalled();
      expect(mockClientsService.markAsProcessed).not.toHaveBeenCalled();
    });

    it('should handle errors during processing', async () => {
      // Arrange
      mockClientsService.findOne.mockResolvedValue(mockClient);
      mockAnthropicClient.isConfigured.mockReturnValue(true);
      mockAnthropicClient.sendMessage.mockRejectedValue(new Error('API Error'));

      // Act & Assert
      await expect(service.processSingleClient('1')).rejects.toThrow('API Error');
    });
  });

  describe('processAllUnprocessedClients', () => {
    const mockClients: Client[] = [
      {
        id: '1',
        name: 'Client 1',
        email: 'client1@example.com',
        phone: '111',
        assignedSeller: 'Seller 1',
        meetingDate: new Date('2024-01-15'),
        closed: false,
        transcription: 'Transcription 1',
        industry: null,
        operationSize: null,
        interactionVolume: null,
        discoverySource: null,
        mainMotivation: null,
        urgencyLevel: null,
        painPoints: null,
        technicalRequirements: null,
        sentiment: null,
        processed: false,
        processedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '2',
        name: 'Client 2',
        email: 'client2@example.com',
        phone: '222',
        assignedSeller: 'Seller 2',
        meetingDate: new Date('2024-01-16'),
        closed: true,
        transcription: 'Transcription 2',
        industry: null,
        operationSize: null,
        interactionVolume: null,
        discoverySource: null,
        mainMotivation: null,
        urgencyLevel: null,
        painPoints: null,
        technicalRequirements: null,
        sentiment: null,
        processed: false,
        processedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const mockCategorization: CategorizationResultDto = {
      industry: 'Technology',
      operationSize: 'large',
      interactionVolume: 150,
      discoverySource: 'LinkedIn',
      mainMotivation: 'Efficiency',
      urgencyLevel: 'immediate',
      painPoints: [],
      technicalRequirements: [],
      sentiment: 'positive',
    };

    it('should process all unprocessed clients successfully', async () => {
      // Arrange
      mockClientsService.getUnprocessedClients.mockResolvedValue(mockClients);
      mockAnthropicClient.isConfigured.mockReturnValue(true);
      mockAnthropicClient.sendMessage.mockResolvedValue(JSON.stringify(mockCategorization));
      mockResponseParser.parseJsonResponse.mockReturnValue(mockCategorization);
      mockClientsService.markAsProcessed.mockResolvedValue({
        ...mockClients[0],
        ...mockCategorization,
        processed: true,
      } as any);

      // Use jest.useFakeTimers to control setTimeout
      jest.useFakeTimers();

      // Act
      const processPromise = service.processAllUnprocessedClients();
      
      // Fast-forward through all timers asynchronously
      await jest.advanceTimersByTimeAsync(2000);
      
      const result = await processPromise;

      // Restore timers
      jest.useRealTimers();

      // Assert
      expect(result.processed).toBe(2);
      expect(result.failed).toBe(0);
      expect(mockClientsService.getUnprocessedClients).toHaveBeenCalled();
      expect(mockAnthropicClient.sendMessage).toHaveBeenCalledTimes(2);
      expect(mockClientsService.markAsProcessed).toHaveBeenCalledTimes(2);
    }, 10000);

    it('should handle errors for individual clients and continue processing', async () => {
      // Arrange
      mockClientsService.getUnprocessedClients.mockResolvedValue(mockClients);
      mockAnthropicClient.isConfigured.mockReturnValue(true);
      
      // First client succeeds, second fails
      mockAnthropicClient.sendMessage
        .mockResolvedValueOnce(JSON.stringify(mockCategorization))
        .mockRejectedValueOnce(new Error('API Error'));
      
      mockResponseParser.parseJsonResponse.mockReturnValue(mockCategorization);
      mockClientsService.markAsProcessed.mockResolvedValue({
        ...mockClients[0],
        ...mockCategorization,
        processed: true,
      } as any);

      jest.useFakeTimers();

      // Act
      const processPromise = service.processAllUnprocessedClients();
      await jest.advanceTimersByTimeAsync(2000);
      const result = await processPromise;

      jest.useRealTimers();

      // Assert
      expect(result.processed).toBe(1);
      expect(result.failed).toBe(1);
    }, 10000);

    it('should return zero counts when no unprocessed clients exist', async () => {
      // Arrange
      mockClientsService.getUnprocessedClients.mockResolvedValue([]);

      // Act
      const result = await service.processAllUnprocessedClients();

      // Assert
      expect(result.processed).toBe(0);
      expect(result.failed).toBe(0);
      expect(mockAnthropicClient.sendMessage).not.toHaveBeenCalled();
    });
  });
});

