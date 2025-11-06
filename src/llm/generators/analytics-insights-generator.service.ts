import { Injectable, Logger } from '@nestjs/common';
import { AnthropicClientService } from '../core/anthropic-client.service';
import { ResponseParserService } from '../core/response-parser.service';
import { AnalyticsPromptBuilder } from '../prompts/analytics-prompt.builder';
import { TimelineInsightDto } from '../../common/dto/analytics';
import { LLM_CONSTANTS } from '../../common/constants';

@Injectable()
export class AnalyticsInsightsGeneratorService {
  private readonly logger = new Logger(AnalyticsInsightsGeneratorService.name);

  constructor(
    private readonly anthropicClient: AnthropicClientService,
    private readonly responseParser: ResponseParserService,
  ) {}

  async generatePainPointsInsight(
    painPoints: Array<{
      painPoint: string;
      count: number;
      conversionRate: number;
    }>
  ): Promise<{ insight: string }> {
    if (!this.anthropicClient.isConfigured()) {
      return { insight: 'AI insights unavailable - API not configured' };
    }

    try {
      const prompt = AnalyticsPromptBuilder.buildPainPointsInsight(painPoints);
      const responseText = await this.anthropicClient.sendMessage({
        prompt,
        maxTokens: LLM_CONSTANTS.MAX_TOKENS.STANDARD,
      });

      this.logger.log(`Pain Points Insight generated: ${responseText.substring(0, LLM_CONSTANTS.LOG_SUBSTRING_LENGTH.BRIEF)}`);

      return {
        insight: responseText.trim() || 'The analysis reveals common client challenges that impact deal conversion rates.',
      };
    } catch (error) {
      this.logger.error('Error generating pain points insight:', error);
      return {
        insight: 'Unable to generate insight at this time. The top pain points indicate areas where clients face significant challenges.',
      };
    }
  }

  async generateVolumeVsConversionInsight(
    volumeData: Array<{
      volumeRange: string;
      count: number;
      conversionRate: number;
    }>
  ): Promise<{ insight: string }> {
    if (!this.anthropicClient.isConfigured()) {
      return { insight: 'AI insights unavailable - API not configured' };
    }

    try {
      const validData = volumeData.filter(v => v.count > 0);
      
      if (validData.length === 0) {
        return { insight: 'Insufficient data to analyze volume vs conversion relationship.' };
      }

      const prompt = AnalyticsPromptBuilder.buildVolumeVsConversionInsight(validData);
      const responseText = await this.anthropicClient.sendMessage({
        prompt,
        maxTokens: LLM_CONSTANTS.MAX_TOKENS.STANDARD,
      });

      this.logger.log(`Volume vs Conversion Insight generated: ${responseText.substring(0, LLM_CONSTANTS.LOG_SUBSTRING_LENGTH.BRIEF)}`);

      return {
        insight: responseText.trim() || 'The analysis shows a correlation between interaction volume and conversion rates, indicating optimal engagement levels for closing deals.',
      };
    } catch (error) {
      this.logger.error('Error generating volume vs conversion insight:', error);
      return {
        insight: 'Unable to generate insight at this time. The data shows a relationship between interaction volume and conversion rates.',
      };
    }
  }

  async generateTimelineInsight(
    timelineData: Array<{
      month: string;
      totalMeetings: number;
      totalClosed: number;
      conversionRate: number;
      avgSentiment?: string;
      topIndustries?: Array<{ industry: string; count: number; sentiment: string }>;
    }>
  ): Promise<TimelineInsightDto> {
    if (!this.anthropicClient.isConfigured()) {
      return {
        keyFindings: ['AI insights unavailable - API not configured'],
        reasons: [],
        recommendations: [],
      };
    }

    if (!timelineData || timelineData.length === 0) {
      return {
        keyFindings: ['Insufficient data to generate timeline insights.'],
        reasons: [],
        recommendations: [],
      };
    }

    try {
      const prompt = AnalyticsPromptBuilder.buildTimelineInsight(timelineData);
      const responseText = await this.anthropicClient.sendMessage({
        prompt,
        maxTokens: LLM_CONSTANTS.MAX_TOKENS.TIMELINE,
      });

      const fallback: TimelineInsightDto = {
        keyFindings: ['Timeline analysis indicates stable performance with ongoing monitoring recommended.'],
        reasons: ['Further analysis needed to identify specific reasons.'],
        recommendations: ['Continue monitoring recent trends and patterns.'],
      };

      const parsed = this.responseParser.parseJsonResponse<TimelineInsightDto>(
        responseText,
        fallback
      );

      this.logger.log('Timeline Insight generated successfully');

      return {
        keyFindings: Array.isArray(parsed.keyFindings) ? parsed.keyFindings : [parsed.keyFindings || fallback.keyFindings[0]],
        reasons: Array.isArray(parsed.reasons) ? parsed.reasons : parsed.reasons ? [parsed.reasons] : fallback.reasons,
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : parsed.recommendations ? [parsed.recommendations] : fallback.recommendations,
      };
    } catch (error) {
      this.logger.error('Error generating timeline insight:', error);
      return {
        keyFindings: ['Unable to generate timeline insights at this time.'],
        reasons: [],
        recommendations: [],
      };
    }
  }
}

