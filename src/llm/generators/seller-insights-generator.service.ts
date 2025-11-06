import { Injectable, Logger } from '@nestjs/common';
import { AnthropicClientService } from '../core/anthropic-client.service';
import { ResponseParserService } from '../core/response-parser.service';
import { SellerPromptBuilder } from '../prompts/seller-prompt.builder';
import { LLM_CONSTANTS, API_CONSTANTS } from '../../common/constants';

@Injectable()
export class SellerInsightsGeneratorService {
  private readonly logger = new Logger(SellerInsightsGeneratorService.name);

  constructor(
    private readonly anthropicClient: AnthropicClientService,
    private readonly responseParser: ResponseParserService,
  ) {}

  async generateSellerFeedback(sellerData: {
    seller: string;
    metrics: { total: number; closed: number; conversionRate: number };
    correlations: Array<{
      dimension: string;
      value: string;
      total: number;
      closed: number;
      successRate: number;
    }>;
  }): Promise<{ recommendations: string[] }> {
    if (!this.anthropicClient.isConfigured()) {
      return { recommendations: ['AI feedback unavailable - API not configured'] };
    }

    try {
      const prompt = SellerPromptBuilder.buildFeedback(sellerData);
      const responseText = await this.anthropicClient.sendMessage({
        prompt,
        maxTokens: LLM_CONSTANTS.MAX_TOKENS.SELLER_FEEDBACK,
      });

      this.logger.log(`AI Feedback for ${sellerData.seller}: ${responseText.substring(0, LLM_CONSTANTS.LOG_SUBSTRING_LENGTH.BRIEF)}`);

      const recommendations = this.responseParser.parseArrayResponse<string>(
        responseText,
        ['Focus on your strongest client segments', 'Continue building expertise in successful areas']
      );

      return {
        recommendations: recommendations.slice(0, API_CONSTANTS.LIMITS.MAX_RECOMMENDATIONS),
      };
    } catch (error) {
      this.logger.error(`Error generating seller feedback for ${sellerData.seller}:`, error);
      return { recommendations: ['Unable to generate feedback at this time'] };
    }
  }

  async generateSellerCorrelationInsight(
    seller: string,
    correlations: Array<{
      dimension: string;
      value: string;
      successRate: number;
      closed: number;
      total: number;
      performanceVsAvg: number;
    }>
  ): Promise<string> {
    if (!this.anthropicClient.isConfigured()) {
      return 'AI insights unavailable - API not configured';
    }

    if (!correlations || correlations.length === 0) {
      return 'No significant correlations found for this seller.';
    }

    try {
      const prompt = SellerPromptBuilder.buildCorrelationInsight(seller, correlations);
      const responseText = await this.anthropicClient.sendMessage({
        prompt,
        maxTokens: LLM_CONSTANTS.MAX_TOKENS.STANDARD,
      });

      return responseText.trim() || `No insights available for ${seller}.`;
    } catch (error) {
      this.logger.error('Error generating seller correlation insight:', error);
      return `Unable to generate insights for ${seller} at this time.`;
    }
  }

  async generateSellerTimelineInsight(
    timelineData: Array<Record<string, any>>,
    sellers: string[],
    granularity: 'week' | 'month' = 'month',
  ): Promise<string> {
    if (!this.anthropicClient.isConfigured()) {
      return 'AI insights unavailable - API not configured';
    }

    if (!timelineData || timelineData.length === 0 || !sellers || sellers.length === 0) {
      return 'Insufficient data to generate insights.';
    }

    try {
      const sellerStats = sellers.map(seller => {
        const values = timelineData
          .map(item => item[seller] || 0)
          .filter(val => val !== null && val !== undefined);
        
        if (values.length === 0) return null;

        const total = values.reduce((sum, val) => sum + val, 0);
        const firstHalf = values.slice(0, Math.ceil(values.length / 2));
        const secondHalf = values.slice(Math.ceil(values.length / 2));
        
        const firstHalfAvg = firstHalf.length > 0 
          ? firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length 
          : 0;
        const secondHalfAvg = secondHalf.length > 0 
          ? secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length 
          : 0;
        
        const trend = secondHalfAvg > firstHalfAvg ? 'increasing' 
          : secondHalfAvg < firstHalfAvg ? 'decreasing' 
          : 'stable';
        
        const changePercent = firstHalfAvg > 0 
          ? ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100 
          : secondHalfAvg > 0 ? 100 : 0;

        return {
          seller,
          total,
          trend,
          changePercent: Math.abs(changePercent),
          avgPerPeriod: total / values.length,
          firstHalfAvg,
          secondHalfAvg,
        };
      }).filter((s): s is NonNullable<typeof s> => s !== null);

      const prompt = SellerPromptBuilder.buildTimelineInsight(sellerStats, granularity);
      const responseText = await this.anthropicClient.sendMessage({
        prompt,
        maxTokens: LLM_CONSTANTS.MAX_TOKENS.EXTENDED,
      });

      return responseText.trim() || 'Unable to generate insights at this time.';
    } catch (error) {
      this.logger.error('Error generating seller timeline insight:', error);
      return 'Unable to generate insights at this time.';
    }
  }
}

