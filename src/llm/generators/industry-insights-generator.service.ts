import { Injectable, Logger } from '@nestjs/common';
import { AnthropicClientService } from '../core/anthropic-client.service';
import { IndustryPromptBuilder } from '../prompts/industry-prompt.builder';
import { LLM_CONSTANTS } from '../../common/constants';

@Injectable()
export class IndustryInsightsGeneratorService {
  private readonly logger = new Logger(IndustryInsightsGeneratorService.name);

  constructor(private readonly anthropicClient: AnthropicClientService) {}

  async generateIndustryDistributionInsight(
    industryData: Array<{
      value: string;
      count: number;
      closed: number;
      conversionRate: number;
    }>
  ): Promise<{ insight: string }> {
    if (!this.anthropicClient.isConfigured()) {
      return { insight: 'AI insights unavailable - API not configured' };
    }

    try {
      const prompt = IndustryPromptBuilder.buildDistributionInsight(industryData);
      const responseText = await this.anthropicClient.sendMessage({
        prompt,
        maxTokens: LLM_CONSTANTS.MAX_TOKENS.STANDARD,
      });

      this.logger.log(`Industry Distribution Insight generated: ${responseText.substring(0, LLM_CONSTANTS.LOG_SUBSTRING_LENGTH.BRIEF)}`);

      return {
        insight: responseText.trim() || 'The client base shows diverse industry representation with varying concentration levels.',
      };
    } catch (error) {
      this.logger.error('Error generating industry distribution insight:', error);
      return {
        insight: 'Unable to generate insight at this time. The distribution shows diverse industry representation.',
      };
    }
  }

  async generateIndustryConversionInsight(
    industryData: Array<{
      value: string;
      count: number;
      closed: number;
      conversionRate: number;
    }>
  ): Promise<{ insight: string }> {
    if (!this.anthropicClient.isConfigured()) {
      return { insight: 'AI insights unavailable - API not configured' };
    }

    try {
      const reliableIndustries = industryData.filter(ind => ind.count >= 3);
      
      if (reliableIndustries.length === 0) {
        return { insight: 'Insufficient data to analyze conversion rates reliably.' };
      }

      const prompt = IndustryPromptBuilder.buildConversionInsight(reliableIndustries);
      const responseText = await this.anthropicClient.sendMessage({
        prompt,
        maxTokens: LLM_CONSTANTS.MAX_TOKENS.MEDIUM,
      });

      this.logger.log(`Industry Conversion Insight generated: ${responseText.substring(0, LLM_CONSTANTS.LOG_SUBSTRING_LENGTH.BRIEF)}`);

      const topIndustry = reliableIndustries
        .sort((a, b) => b.conversionRate - a.conversionRate)[0];

      return {
        insight: responseText.trim() || `${topIndustry?.value || 'Top industry'} shows the highest conversion rate at ${topIndustry?.conversionRate.toFixed(1) || 0}%, indicating strong performance in this sector.`,
      };
    } catch (error) {
      this.logger.error('Error generating industry conversion insight:', error);
      return {
        insight: 'Unable to generate insight at this time.',
      };
    }
  }
}

