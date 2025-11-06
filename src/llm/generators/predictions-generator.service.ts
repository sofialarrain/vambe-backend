import { Injectable, Logger } from '@nestjs/common';
import { AnthropicClientService } from '../core/anthropic-client.service';
import { LLM_CONSTANTS, API_CONSTANTS } from '../../common/constants';

@Injectable()
export class PredictionsGeneratorService {
  private readonly logger = new Logger(PredictionsGeneratorService.name);

  constructor(private readonly anthropicClient: AnthropicClientService) {}

  async generateConversionPredictions(
    openDeals: Array<{
      clientName: string;
      industry: string;
      sentiment: string;
      urgencyLevel: string;
      painPoints: string[];
      technicalRequirements: string[];
      seller: string;
      discoverySource: string;
      operationSize: string;
      interactionVolume: number;
    }>
  ): Promise<Array<{ clientName: string; probability: number; recommendation: string }>> {
    if (!this.anthropicClient.isConfigured()) {
      return openDeals.map(client => ({
        clientName: client.clientName,
        probability: API_CONSTANTS.PROBABILITY.DEFAULT_FALLBACK / 100,
        recommendation: 'AI insights unavailable - please review manually.',
      }));
    }

    try {
      const results = [];

      const topThree = openDeals.slice(0, API_CONSTANTS.LIMITS.TOP_DEALS);
      
      for (const client of topThree) {
        const prompt = `You are a sales analytics expert. Analyze this open deal and predict the probability of closing it, along with ONE brief, actionable recommendation.

Client Data:
- Client: ${client.clientName}
- Industry: ${client.industry}
- Sentiment: ${client.sentiment}
- Urgency Level: ${client.urgencyLevel}
- Seller: ${client.seller}
- Discovery Source: ${client.discoverySource}
- Operation Size: ${client.operationSize}
- Interaction Volume: ${client.interactionVolume}
- Pain Points: ${client.painPoints.length > 0 ? client.painPoints.join(', ') : 'None specified'}
- Technical Requirements: ${client.technicalRequirements.length > 0 ? client.technicalRequirements.join(', ') : 'None specified'}

Based on these factors, provide:
1. A probability score (0-100) indicating likelihood of closing
2. ONE specific, actionable recommendation in a single sentence

Respond in this exact format:
PROBABILITY: <number>
RECOMMENDATION: <one sentence recommendation>`;

        const responseText = await this.anthropicClient.sendMessage({
          prompt,
          maxTokens: LLM_CONSTANTS.MAX_TOKENS.SHORT,
        });
        
        const probabilityMatch = responseText.match(/PROBABILITY:\s*(\d+)/);
        const recommendationMatch = responseText.match(/RECOMMENDATION:\s*(.+)/);
        
        const probability = probabilityMatch ? parseInt(probabilityMatch[1], 10) : API_CONSTANTS.PROBABILITY.DEFAULT_FALLBACK;
        const recommendation = recommendationMatch 
          ? recommendationMatch[1].trim() 
          : 'Focus on addressing the client\'s key pain points and technical requirements.';

        results.push({
          clientName: client.clientName,
          probability: Math.max(API_CONSTANTS.PROBABILITY.MIN, Math.min(API_CONSTANTS.PROBABILITY.MAX, probability)),
          recommendation,
        });
      }

      return results;
    } catch (error) {
      this.logger.error('Error generating conversion predictions:', error);
      return openDeals.slice(0, API_CONSTANTS.LIMITS.TOP_DEALS).map(client => ({
        clientName: client.clientName,
        probability: API_CONSTANTS.PROBABILITY.DEFAULT_FALLBACK,
        recommendation: 'Unable to generate prediction at this time.',
      }));
    }
  }
}

