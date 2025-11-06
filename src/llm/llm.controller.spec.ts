import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { LlmController } from './llm.controller';
import { CategorizationService } from './categorization.service';

describe('LlmController', () => {
  let controller: LlmController;
  let categorizationService: jest.Mocked<CategorizationService>;

  const mockCategorizationService = {
    processAllUnprocessedClients: jest.fn(),
    processSingleClient: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LlmController],
      providers: [
        {
          provide: CategorizationService,
          useValue: mockCategorizationService,
        },
      ],
    }).compile();

    controller = module.get<LlmController>(LlmController);
    categorizationService = module.get(CategorizationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('processAll', () => {
    it('should process all unprocessed clients successfully', async () => {
      // Arrange
      const mockResult = {
        processed: 5,
        failed: 0,
      };

      mockCategorizationService.processAllUnprocessedClients.mockResolvedValue(mockResult);

      // Act
      const result = await controller.processAll();

      // Assert
      expect(result).toEqual({
        message: 'Processing completed',
        processed: 5,
        failed: 0,
      });
      expect(categorizationService.processAllUnprocessedClients).toHaveBeenCalledTimes(1);
      expect(categorizationService.processAllUnprocessedClients).toHaveBeenCalledWith();
    });

    it('should handle processing with some failures', async () => {
      // Arrange
      const mockResult = {
        processed: 3,
        failed: 2,
      };

      mockCategorizationService.processAllUnprocessedClients.mockResolvedValue(mockResult);

      // Act
      const result = await controller.processAll();

      // Assert
      expect(result).toEqual({
        message: 'Processing completed',
        processed: 3,
        failed: 2,
      });
      expect(categorizationService.processAllUnprocessedClients).toHaveBeenCalledTimes(1);
    });

    it('should handle processing when all clients fail', async () => {
      // Arrange
      const mockResult = {
        processed: 0,
        failed: 5,
      };

      mockCategorizationService.processAllUnprocessedClients.mockResolvedValue(mockResult);

      // Act
      const result = await controller.processAll();

      // Assert
      expect(result).toEqual({
        message: 'Processing completed',
        processed: 0,
        failed: 5,
      });
    });

    it('should handle processing when no clients are found', async () => {
      // Arrange
      const mockResult = {
        processed: 0,
        failed: 0,
      };

      mockCategorizationService.processAllUnprocessedClients.mockResolvedValue(mockResult);

      // Act
      const result = await controller.processAll();

      // Assert
      expect(result).toEqual({
        message: 'Processing completed',
        processed: 0,
        failed: 0,
      });
    });
  });

  describe('processOne', () => {
    it('should process a single client successfully', async () => {
      // Arrange
      const clientId = 'client-123';
      mockCategorizationService.processSingleClient.mockResolvedValue(undefined);

      // Act
      const result = await controller.processOne(clientId);

      // Assert
      expect(result).toEqual({
        message: 'Client processed successfully',
      });
      expect(categorizationService.processSingleClient).toHaveBeenCalledTimes(1);
      expect(categorizationService.processSingleClient).toHaveBeenCalledWith(clientId);
    });

    it('should handle NotFoundException when client does not exist', async () => {
      // Arrange
      const clientId = 'non-existent-client';
      mockCategorizationService.processSingleClient.mockRejectedValue(
        new NotFoundException('Client not found'),
      );

      // Act & Assert
      await expect(controller.processOne(clientId)).rejects.toThrow(NotFoundException);
      expect(categorizationService.processSingleClient).toHaveBeenCalledWith(clientId);
    });

    it('should handle other errors during processing', async () => {
      // Arrange
      const clientId = 'client-456';
      const error = new Error('Processing error');
      mockCategorizationService.processSingleClient.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.processOne(clientId)).rejects.toThrow('Processing error');
      expect(categorizationService.processSingleClient).toHaveBeenCalledWith(clientId);
    });

    it('should handle client that is already processed', async () => {
      // Arrange
      const clientId = 'client-789';
      // The service logs a warning but doesn't throw, so it resolves successfully
      mockCategorizationService.processSingleClient.mockResolvedValue(undefined);

      // Act
      const result = await controller.processOne(clientId);

      // Assert
      expect(result).toEqual({
        message: 'Client processed successfully',
      });
      expect(categorizationService.processSingleClient).toHaveBeenCalledWith(clientId);
    });
  });
});

