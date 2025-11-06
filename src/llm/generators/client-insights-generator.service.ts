import { Injectable, Logger } from '@nestjs/common';
import { AnthropicClientService } from '../core/anthropic-client.service';
import { ResponseParserService } from '../core/response-parser.service';
import { ClientPromptBuilder } from '../prompts/client-prompt.builder';
import { ClientPerceptionInsightDto } from '../../common/dto/analytics';
import { LLM_CONSTANTS } from '../../common/constants';

@Injectable()
export class ClientInsightsGeneratorService {
  private readonly logger = new Logger(ClientInsightsGeneratorService.name);

  constructor(
    private readonly anthropicClient: AnthropicClientService,
    private readonly responseParser: ResponseParserService,
  ) {}

  async generateClientPerceptionInsight(
    transcriptions: Array<{
      transcription: string;
      closed: boolean;
      sentiment: string | null;
    }>
  ): Promise<ClientPerceptionInsightDto> {
    if (!this.anthropicClient.isConfigured()) {
      return {
        positiveAspects: 'AI insights unavailable - API not configured',
        concerns: 'AI insights unavailable - API not configured',
        successFactors: 'AI insights unavailable - API not configured',
        recommendations: 'AI insights unavailable - API not configured',
      };
    }

    if (!transcriptions || transcriptions.length === 0) {
      return {
        positiveAspects: 'Insufficient data to analyze positive aspects.',
        concerns: 'Insufficient data to analyze concerns.',
        successFactors: 'Insufficient data to analyze success factors.',
        recommendations: 'Insufficient data to provide recommendations.',
      };
    }

    try {
      const prompt = ClientPromptBuilder.buildPerceptionInsight(transcriptions);
      const responseText = await this.anthropicClient.sendMessage({
        prompt,
        maxTokens: LLM_CONSTANTS.MAX_TOKENS.CLIENT_PERCEPTION,
      });

      const fallback: ClientPerceptionInsightDto = {
        positiveAspects: 'Analysis of client transcripts reveals diverse perceptions of Vambe.',
        concerns: 'No significant concerns identified.',
        successFactors: 'Further analysis needed to identify success factors.',
        recommendations: 'Continue monitoring client feedback for actionable insights.',
      };

      const parsed = this.responseParser.parseJsonResponse<ClientPerceptionInsightDto>(
        responseText,
        fallback
      );

      this.logger.log('Client Perception Insight generated successfully');

      return {
        positiveAspects: parsed.positiveAspects?.trim() || fallback.positiveAspects,
        concerns: parsed.concerns?.trim() || fallback.concerns,
        successFactors: parsed.successFactors?.trim() || fallback.successFactors,
        recommendations: parsed.recommendations?.trim() || fallback.recommendations,
      };
    } catch (error) {
      this.logger.error('Error generating client perception insight:', error);
      return {
        positiveAspects: 'Unable to generate analysis at this time.',
        concerns: 'Unable to generate analysis at this time.',
        successFactors: 'Unable to generate analysis at this time.',
        recommendations: 'Unable to generate analysis at this time.',
      };
    }
  }

  async generateClientSolutionsInsight(
    transcriptions: Array<{
      transcription: string;
      closed: boolean;
      mainMotivation?: string | null;
      technicalRequirements?: string[] | null;
    }>
  ): Promise<{ insight: string }> {
    if (!this.anthropicClient.isConfigured()) {
      return { insight: 'AI insights unavailable - API not configured' };
    }

    try {
      if (!transcriptions || transcriptions.length === 0) {
        return { insight: 'Insufficient data to analyze client solutions.' };
      }

      const prompt = ClientPromptBuilder.buildSolutionsInsight(transcriptions);
      const responseText = await this.anthropicClient.sendMessage({
        prompt,
        maxTokens: LLM_CONSTANTS.MAX_TOKENS.MEDIUM,
      });

      this.logger.log(`Client Solutions Insight generated: ${responseText.substring(0, LLM_CONSTANTS.LOG_SUBSTRING_LENGTH.BRIEF)}`);

      return {
        insight: responseText.trim() || 'Clients are seeking various solutions including automation, efficiency improvements, and enhanced customer engagement capabilities.',
      };
    } catch (error) {
      this.logger.error('Error generating client solutions insight:', error);
      return {
        insight: 'Unable to generate insight at this time. Clients are seeking solutions to improve their operations and customer experience.',
      };
    }
  }
}

