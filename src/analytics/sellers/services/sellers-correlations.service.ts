import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { getSimulatedCurrentDate } from '../../../common/utils/date.utils';
import { ANALYTICS_CONSTANTS } from '../../../common/constants';
import { SellerInsightsGeneratorService } from '../../../llm/generators/seller-insights-generator.service';
import {
  SellerCorrelationDto,
  SellerInsightDto,
  SellerAIFeedbackDto,
} from '../../../common/dto/analytics';
import { SellersMetricsService } from './sellers-metrics.service';
import { SellersTimelineService } from './sellers-timeline.service';

/**
 * Service for seller correlations and insights
 * Handles correlation analysis, AI-generated insights, and feedback
 */
@Injectable()
export class SellersCorrelationsService {
  private readonly logger = new Logger(SellersCorrelationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sellerInsightsGenerator: SellerInsightsGeneratorService,
    private readonly sellersMetricsService: SellersMetricsService,
    private readonly sellersTimelineService: SellersTimelineService,
  ) {}

  /**
   * Get seller performance correlations across different dimensions
   * @returns Array of seller correlations with performance metrics
   */
  async getSellerCorrelations(): Promise<SellerCorrelationDto[]> {
    const clients = await this.prisma.client.findMany({
      where: { processed: true },
    });

    const sellers = [...new Set(clients.map((c) => c.assignedSeller))].sort();
    const dimensions = ['industry', 'operationSize', 'urgencyLevel', 'sentiment', 'discoverySource'];

    const overallAverages = new Map<string, Map<string, number>>();

    for (const dimension of dimensions) {
      const dimensionMap = new Map<string, { total: number; closed: number }>();

      for (const client of clients) {
        const value = (client as Record<string, unknown>)[dimension];
        if (typeof value !== 'string') continue;

        if (!dimensionMap.has(value)) {
          dimensionMap.set(value, { total: 0, closed: 0 });
        }

        const stats = dimensionMap.get(value)!;
        stats.total++;
        if (client.closed) stats.closed++;
      }

      const avgMap = new Map<string, number>();
      for (const [value, stats] of dimensionMap.entries()) {
        if (stats.total >= ANALYTICS_CONSTANTS.MIN_CLIENTS_FOR_RELIABILITY) {
          avgMap.set(value, parseFloat(((stats.closed / stats.total) * 100).toFixed(2)));
        }
      }
      overallAverages.set(dimension, avgMap);
    }

    const correlations: SellerCorrelationDto[] = [];

    for (const seller of sellers) {
      const sellerClients = clients.filter((c) => c.assignedSeller === seller);
      const sellerTotal = sellerClients.length;
      const sellerClosed = sellerClients.filter((c) => c.closed).length;
      const sellerAvgConversion =
        sellerTotal > 0
          ? (sellerClosed / sellerTotal) * ANALYTICS_CONSTANTS.PERCENTAGE_MULTIPLIER
          : 0;

      for (const dimension of dimensions) {
        const dimensionValues = new Map<string, { total: number; closed: number }>();

        for (const client of sellerClients) {
          const value = (client as Record<string, unknown>)[dimension];
          if (typeof value !== 'string') continue;

          if (!dimensionValues.has(value)) {
            dimensionValues.set(value, { total: 0, closed: 0 });
          }

          const stats = dimensionValues.get(value)!;
          stats.total++;
          if (client.closed) stats.closed++;
        }

        const overallAvgForDimension = overallAverages.get(dimension) || new Map();

        for (const [value, stats] of dimensionValues.entries()) {
          if (stats.total >= ANALYTICS_CONSTANTS.MIN_CLIENTS_FOR_RELIABILITY) {
            const successRate = parseFloat(((stats.closed / stats.total) * 100).toFixed(2));
            const overallAvg = overallAvgForDimension.get(value) || 0;

            const isRelevant =
              successRate >= 70 ||
              successRate > sellerAvgConversion + 15 ||
              successRate >
                overallAvg + ANALYTICS_CONSTANTS.CONVERSION.THRESHOLD_ADJUSTMENT * 2;

            if (isRelevant) {
              correlations.push({
                seller,
                dimension,
                value,
                total: stats.total,
                closed: stats.closed,
                successRate,
                sellerAvgConversion: parseFloat(
                  sellerAvgConversion.toFixed(ANALYTICS_CONSTANTS.DECIMAL_PLACES),
                ),
                overallAvg: parseFloat(overallAvg.toFixed(ANALYTICS_CONSTANTS.DECIMAL_PLACES)),
                performanceVsAvg: parseFloat(
                  (successRate - overallAvg).toFixed(ANALYTICS_CONSTANTS.DECIMAL_PLACES),
                ),
              });
            }
          }
        }
      }
    }

    return correlations;
  }

  /**
   * Get AI-generated insights for seller correlations
   * @returns Record of seller insights keyed by seller name
   */
  async getSellerCorrelationInsights(): Promise<Record<string, string>> {
    const correlations = await this.getSellerCorrelations();
    const clients = await this.prisma.client.findMany({
      where: { processed: true },
    });

    const sellers = [...new Set(clients.map((c) => c.assignedSeller))].sort();
    const insights: Record<string, string> = {};

    for (const seller of sellers) {
      const sellerCorrelations = correlations.filter((c) => c.seller === seller);

      if (sellerCorrelations.length === 0) {
        insights[seller] =
          'No significant correlations identified yet. Need more data to identify patterns.';
        continue;
      }

      const topCorrelations = sellerCorrelations
        .sort((a, b) => b.successRate - a.successRate)
        .slice(0, ANALYTICS_CONSTANTS.LIMITS.TOP_SELLERS);

      const correlationData = topCorrelations.map((corr) => ({
        dimension: corr.dimension,
        value: corr.value,
        successRate: corr.successRate,
        closed: corr.closed,
        total: corr.total,
        performanceVsAvg: corr.performanceVsAvg || 0,
      }));

      try {
        const insight = await this.sellerInsightsGenerator.generateSellerCorrelationInsight(
          seller,
          correlationData,
        );
        insights[seller] = insight;
      } catch (error) {
        this.logger.error(`Error generating correlation insight for ${seller}:`, error);
        const top = topCorrelations[0];
        insights[seller] = `${seller} shows ${top.successRate.toFixed(0)}% success rate with ${top.value} clients (${top.closed}/${top.total} deals closed).`;
      }
    }

    return insights;
  }

  /**
   * Get seller insights based on performance changes and patterns
   * @returns Array of seller insights
   */
  async getSellerInsights(): Promise<SellerInsightDto[]> {
    const now = getSimulatedCurrentDate();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const [currentMonthClients, lastMonthClients] = await Promise.all([
      this.prisma.client.findMany({
        where: {
          meetingDate: {
            gte: currentMonthStart,
          },
        },
      }),
      this.prisma.client.findMany({
        where: {
          meetingDate: {
            gte: lastMonthStart,
            lte: lastMonthEnd,
          },
        },
      }),
    ]);

    const sellers = [
      ...new Set([
        ...currentMonthClients.map((c) => c.assignedSeller),
        ...lastMonthClients.map((c) => c.assignedSeller),
      ]),
    ];

    const insights: SellerInsightDto[] = [];

    for (const seller of sellers) {
      const currentClosed = currentMonthClients.filter(
        (c) => c.assignedSeller === seller && c.closed,
      ).length;
      const lastClosed = lastMonthClients.filter(
        (c) => c.assignedSeller === seller && c.closed,
      ).length;

      if (lastClosed > 0) {
        const change =
          ((currentClosed - lastClosed) / lastClosed) * ANALYTICS_CONSTANTS.PERCENTAGE_MULTIPLIER;
        const changeAbs = Math.abs(change);

        if (changeAbs >= 15) {
          insights.push({
            seller,
            type: change > 0 ? 'positive' : 'negative',
            metric: 'conversions',
            message: `${seller} ${change > 0 ? 'increased' : 'decreased'} conversions by ${changeAbs.toFixed(0)}% compared to last month`,
            change: parseFloat(change.toFixed(ANALYTICS_CONSTANTS.DECIMAL_PLACES)),
          });
        }
      }

      const sellerCurrentClients = currentMonthClients.filter((c) => c.assignedSeller === seller);
      const lowUrgencyClosed = sellerCurrentClients.filter(
        (c) => c.closed && c.urgencyLevel === 'exploratory',
      ).length;

      if (lowUrgencyClosed >= ANALYTICS_CONSTANTS.MIN_CLIENTS_FOR_RELIABILITY) {
        insights.push({
          seller,
          type: 'neutral',
          metric: 'urgency',
          message: `${seller} closed ${lowUrgencyClosed} deals with low urgency clients (atypical pattern)`,
          change: 0,
        });
      }
    }

    return insights;
  }

  /**
   * Get AI-generated feedback for all sellers
   * @returns Array of seller AI feedback with recommendations
   */
  async getSellerAIFeedback(): Promise<SellerAIFeedbackDto[]> {
    const [sellers, correlations] = await Promise.all([
      this.sellersMetricsService.getSellerMetrics(),
      this.getSellerCorrelations(),
    ]);

    const feedbackPromises = sellers.map(async (seller) => {
      const sellerCorrelations = correlations.filter((c) => c.seller === seller.seller);

      // Map correlations to include performanceVsAvg for better AI context
      const correlationsWithPerformance = sellerCorrelations.map(corr => ({
        dimension: corr.dimension,
        value: corr.value,
        total: corr.total,
        closed: corr.closed,
        successRate: corr.successRate,
        performanceVsAvg: corr.performanceVsAvg,
      }));

      const aiResult = await this.sellerInsightsGenerator.generateSellerFeedback({
        seller: seller.seller,
        metrics: {
          total: seller.total,
          closed: seller.closed,
          conversionRate: seller.conversionRate,
        },
        correlations: correlationsWithPerformance,
      });

      return {
        seller: seller.seller,
        recommendations: aiResult.recommendations,
      };
    });

    return Promise.all(feedbackPromises);
  }

  /**
   * Get AI-generated insight for seller timeline
   * @param granularity - Time granularity: 'week' or 'month'
   * @returns Timeline insight as a string
   */
  async getSellerTimelineInsight(granularity: 'week' | 'month' = 'month'): Promise<string> {
    try {
      const timelineData = await this.sellersTimelineService.getSellersTimeline(granularity);

      if (!timelineData || timelineData.length === 0) {
        return 'Insufficient data to generate insights.';
      }

      const sellers =
        timelineData.length > 0
          ? Object.keys(timelineData[0].sellers || {}).filter((key) => key !== 'period')
          : [];

      if (sellers.length === 0) {
        return 'No seller data available.';
      }

      return await this.sellerInsightsGenerator.generateSellerTimelineInsight(
        timelineData.map((t) => ({
          date: t.period,
          ...t.sellers,
        })),
        sellers,
        granularity,
      );
    } catch (error) {
      this.logger.error('Error getting seller timeline insight:', error);
      return 'Unable to generate seller timeline insights at this time.';
    }
  }
}

