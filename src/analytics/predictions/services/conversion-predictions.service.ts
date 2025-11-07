import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { PredictionsGeneratorService } from '../../../llm/generators/predictions-generator.service';
import { ANALYTICS_CONSTANTS } from '../../../common/constants';
import { ConversionPredictionDto } from '../../../common/dto/analytics';

@Injectable()
export class ConversionPredictionsService {
  private readonly logger = new Logger(ConversionPredictionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly predictionsGenerator: PredictionsGeneratorService,
  ) {}

  /**
   * Get conversion predictions for open deals
   * Uses AI to analyze client characteristics and predict conversion likelihood
   * @returns Array of conversion predictions with probability scores
   */
  async getConversionPredictions(): Promise<ConversionPredictionDto[]> {
    try {
      const openDeals = await this.prisma.client.findMany({
        where: {
          processed: true,
          closed: false,
        },
        select: {
          name: true,
          industry: true,
          sentiment: true,
          urgencyLevel: true,
          painPoints: true,
          technicalRequirements: true,
          assignedSeller: true,
          discoverySource: true,
          operationSize: true,
          interactionVolume: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: ANALYTICS_CONSTANTS.LIMITS.RECENT_WEEKS,
      });

      if (openDeals.length === 0) {
        return [];
      }

      const mappedDeals = openDeals.map((deal) => ({
        clientName: deal.name,
        industry: deal.industry || 'Unknown',
        sentiment: deal.sentiment || 'Unknown',
        urgencyLevel: deal.urgencyLevel || 'Unknown',
        painPoints: deal.painPoints,
        technicalRequirements: deal.technicalRequirements,
        seller: deal.assignedSeller,
        discoverySource: deal.discoverySource || 'Unknown',
        operationSize: deal.operationSize || 'Unknown',
        interactionVolume: deal.interactionVolume || 0,
      }));

      const predictions = await this.predictionsGenerator.generateConversionPredictions(mappedDeals);

      return predictions.map((prediction) => {
        const client = mappedDeals.find((d) => d.clientName === prediction.clientName);
        return {
          ...prediction,
          industry: client?.industry || 'Unknown',
          seller: client?.seller || 'Unknown',
          urgencyLevel: client?.urgencyLevel || 'Unknown',
        };
      });
    } catch (error) {
      this.logger.error('Error getting conversion predictions:', error);
      return [];
    }
  }
}

