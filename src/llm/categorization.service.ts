import { Injectable, Logger } from '@nestjs/common';
import { ClientsService } from '../clients/clients.service';
import { AnthropicClientService } from './core/anthropic-client.service';
import { ResponseParserService } from './core/response-parser.service';
import { CategorizationPromptBuilder } from './prompts/categorization-prompt.builder';
import { NormalizationUtil } from './utils/normalization.util';
import { LLM_CONSTANTS } from '../common/constants';
import { CategorizationResultDto } from '../common/dto/llm';

@Injectable()
export class CategorizationService {
  private readonly logger = new Logger(CategorizationService.name);

  constructor(
    private readonly anthropicClient: AnthropicClientService,
    private readonly responseParser: ResponseParserService,
    private readonly clientsService: ClientsService,
  ) {}

  async processAllUnprocessedClients(): Promise<{ processed: number; failed: number }> {
    const clients = await this.clientsService.getUnprocessedClients();
    this.logger.log(`Found ${clients.length} unprocessed clients`);

    let processed = 0;
    let failed = 0;

    for (const client of clients) {
      try {
        this.logger.log(`Processing client: ${client.name}`);
        
        const categorization = await this.categorizeTranscription(
          client.transcription,
          client.name,
          client.closed,
        );

        await this.clientsService.markAsProcessed(client.id, categorization);
        processed++;

        this.logger.log(`Successfully processed client: ${client.name}`);

        await this.sleep(1000);
      } catch (error) {
        this.logger.error(`Failed to process client ${client.name}:`, error.message);
        failed++;
      }
    }

    return { processed, failed };
  }

  async processSingleClient(clientId: string): Promise<void> {
    const client = await this.clientsService.findOne(clientId);

    if (client.processed) {
      this.logger.warn(`Client ${client.name} is already processed`);
      return;
    }

    const categorization = await this.categorizeTranscription(
      client.transcription,
      client.name,
      client.closed,
    );

    await this.clientsService.markAsProcessed(client.id, categorization);
    this.logger.log(`Successfully processed client: ${client.name}`);

  }

  async categorizeTranscription(
    transcription: string,
    clientName: string,
    closed: boolean,
  ): Promise<CategorizationResultDto> {
    if (!this.anthropicClient.isConfigured()) {
      throw new Error('Anthropic API not configured');
    }

    try {
      const prompt = CategorizationPromptBuilder.build(transcription, clientName, closed);
      const responseText = await this.anthropicClient.sendMessage({
        prompt,
        maxTokens: LLM_CONSTANTS.MAX_TOKENS.CATEGORIZATION,
      });

      this.logger.log(`Categorization response for ${clientName}: ${responseText.substring(0, LLM_CONSTANTS.LOG_SUBSTRING_LENGTH.STANDARD)}`);

      const fallback: CategorizationResultDto = {
        industry: 'Unknown',
        operationSize: 'medium',
        interactionVolume: 0,
        discoverySource: 'Unknown',
        mainMotivation: 'Unknown',
        urgencyLevel: 'planned',
        painPoints: [],
        technicalRequirements: [],
        sentiment: 'neutral',
      };

      const parsed = this.responseParser.parseJsonResponse<any>(responseText, fallback);

      return {
        industry: parsed.industry || 'Unknown',
        operationSize: NormalizationUtil.normalizeOperationSize(parsed.operationSize),
        interactionVolume: parseInt(parsed.interactionVolume) || 0,
        discoverySource: parsed.discoverySource || 'Unknown',
        mainMotivation: parsed.mainMotivation || 'Unknown',
        urgencyLevel: NormalizationUtil.normalizeUrgencyLevel(parsed.urgencyLevel),
        painPoints: Array.isArray(parsed.painPoints) ? parsed.painPoints : [],
        technicalRequirements: Array.isArray(parsed.technicalRequirements) ? parsed.technicalRequirements : [],
        sentiment: NormalizationUtil.normalizeSentiment(parsed.sentiment),
      };
    } catch (error) {
      this.logger.error(`Error categorizing transcription for ${clientName}:`, error);
      throw error;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

