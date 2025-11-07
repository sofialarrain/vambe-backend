import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { getSimulatedCurrentDate, getSimulatedCurrentYear } from '../../common/utils/date.utils';
import { ANALYTICS_CONSTANTS, API_CONSTANTS } from '../../common/constants';
import { SellerInsightsGeneratorService } from '../../llm/generators/seller-insights-generator.service';
import {
  SellerMetricsDto,
  SellerCorrelationDto,
  SellerInsightDto,
  SellerAIFeedbackDto,
  WeekPodiumDto,
  AnnualSellerRankingDto,
  SellerTimelineDataDto,
} from '../../common/dto/analytics';

@Injectable()
export class SellersAnalyticsService {
  private readonly logger = new Logger(SellersAnalyticsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sellerInsightsGenerator: SellerInsightsGeneratorService,
  ) {}

  async getSellerMetrics(): Promise<SellerMetricsDto[]> {
    const clients = await this.prisma.client.groupBy({
      by: ['assignedSeller'],
      _count: { id: true },
    });

    const sellerMetrics: SellerMetricsDto[] = [];

    for (const seller of clients) {
      const closed = await this.prisma.client.count({
        where: {
          assignedSeller: seller.assignedSeller,
          closed: true,
        },
      });

      sellerMetrics.push({
        seller: seller.assignedSeller,
        total: seller._count.id,
        closed,
        conversionRate: parseFloat(((closed / seller._count.id) * ANALYTICS_CONSTANTS.PERCENTAGE_MULTIPLIER).toFixed(ANALYTICS_CONSTANTS.DECIMAL_PLACES)),
      });
    }

    sellerMetrics.sort((a, b) => b.conversionRate - a.conversionRate);

    return sellerMetrics;
  }

  async getSellerOfWeek(weekStart?: string, year?: number): Promise<WeekPodiumDto> {
    let weekStartDate: Date;
    let weekEndDate: Date;

    if (weekStart && weekStart !== 'current') {
      weekStartDate = new Date(weekStart);
      weekStartDate.setHours(0, 0, 0, 0);
    } else {
      const now = getSimulatedCurrentDate();
      const dayOfWeek = now.getDay();
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      weekStartDate = new Date(now);
      weekStartDate.setDate(now.getDate() + diff);
      weekStartDate.setHours(0, 0, 0, 0);
    }

    weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekStartDate.getDate() + 7);
    weekEndDate.setHours(23, 59, 59, 999);

    const whereClause: Prisma.ClientWhereInput = {
      meetingDate: {
        gte: weekStartDate,
        lte: weekEndDate,
      },
    };

    if (year) {
      const yearStart = new Date(year, 0, 1);
      const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999);
      whereClause.meetingDate = {
        gte: weekStartDate > yearStart ? weekStartDate : yearStart,
        lte: weekEndDate < yearEnd ? weekEndDate : yearEnd,
      };
    }

    const clients = await this.prisma.client.findMany({
      where: whereClause,
    });

    const sellerStats = new Map<string, { total: number; closed: number }>();

    for (const client of clients) {
      if (!sellerStats.has(client.assignedSeller)) {
        sellerStats.set(client.assignedSeller, { total: 0, closed: 0 });
      }
      const stats = sellerStats.get(client.assignedSeller)!;
      stats.total++;
      if (client.closed) stats.closed++;
    }

    const sellers = Array.from(sellerStats.entries())
      .map(([seller, stats]) => ({
        seller,
        closed: stats.closed,
        total: stats.total,
        conversionRate: parseFloat(((stats.closed / stats.total) * ANALYTICS_CONSTANTS.PERCENTAGE_MULTIPLIER).toFixed(ANALYTICS_CONSTANTS.DECIMAL_PLACES)),
      }))
      .sort((a, b) => b.closed - a.closed)
      .slice(0, ANALYTICS_CONSTANTS.LIMITS.TOP_SELLERS);

    const weekRange = {
      start: weekStartDate.toISOString().split('T')[0],
      end: new Date(weekEndDate.getTime() - 1).toISOString().split('T')[0],
    };

    return {
      weekPodium: sellers,
      weekRange,
    };
  }

  async getAnnualSellerRanking(year?: number): Promise<AnnualSellerRankingDto> {
    const selectedYear = year || getSimulatedCurrentYear();
    const yearStart = new Date(selectedYear, 0, 1);
    const yearEnd = new Date(selectedYear, 11, 31, 23, 59, 59, 999);

    const clients = await this.prisma.client.findMany({
      where: {
        meetingDate: {
          gte: yearStart,
          lte: yearEnd,
        },
        closed: true,
      },
    });

    const sellerStats = new Map<string, { closed: number; total: number }>();

    for (const client of clients) {
      if (!sellerStats.has(client.assignedSeller)) {
        sellerStats.set(client.assignedSeller, { closed: 0, total: 0 });
      }
      const stats = sellerStats.get(client.assignedSeller)!;
      stats.closed++;
    }

    const allYearClients = await this.prisma.client.findMany({
      where: {
        meetingDate: {
          gte: yearStart,
          lte: yearEnd,
        },
      },
    });

    for (const client of allYearClients) {
      if (sellerStats.has(client.assignedSeller)) {
        sellerStats.get(client.assignedSeller)!.total++;
      }
    }

    const ranking = Array.from(sellerStats.entries())
      .map(([seller, stats]) => ({
        seller,
        closed: stats.closed,
        total: stats.total,
        conversionRate: stats.total > 0 
          ? parseFloat(((stats.closed / stats.total) * 100).toFixed(2))
          : 0,
      }))
      .sort((a, b) => b.closed - a.closed);

    return {
      year: selectedYear,
      ranking,
    };
  }

  async getSellersTimeline(granularity: 'week' | 'month' = 'week'): Promise<SellerTimelineDataDto[]> {
    const clients = await this.prisma.client.findMany({
      where: { closed: true },
      orderBy: { meetingDate: 'asc' },
    });

    const sellers = [...new Set(clients.map(c => c.assignedSeller).filter((seller): seller is string => seller !== null))];
    const grouped = new Map<string, Record<string, number>>();

    for (const client of clients) {
      // Skip clients without assigned seller
      if (!client.assignedSeller) {
        continue;
      }

      let dateKey: string;
      const date = new Date(client.meetingDate);

      if (granularity === 'week') {
        const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
        const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / API_CONSTANTS.TIME.MILLISECONDS_PER_DAY;
        const weekNumber = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
        dateKey = `${date.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;
      } else {
        dateKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      }

      if (!grouped.has(dateKey)) {
        const entry: Record<string, number> = {};
        sellers.forEach(seller => {
          entry[seller] = 0;
        });
        grouped.set(dateKey, entry);
      }

      const entry = grouped.get(dateKey)!;
      entry[client.assignedSeller] = (entry[client.assignedSeller] || 0) + 1;
    }

    return Array.from(grouped.entries())
      .map(([period, sellers]) => ({
        period,
        sellers,
      }))
      .sort((a, b) => a.period.localeCompare(b.period));
  }

  async getSellerCorrelations(): Promise<SellerCorrelationDto[]> {
    const clients = await this.prisma.client.findMany({
      where: { processed: true },
    });

    const sellers = [...new Set(clients.map(c => c.assignedSeller))].sort();
    const dimensions = ['industry', 'operationSize', 'urgencyLevel', 'sentiment', 'discoverySource'];
    
    const overallAverages = new Map<string, Map<string, number>>();
    
    for (const dimension of dimensions) {
      const dimensionMap = new Map<string, { total: number; closed: number }>();
      
      for (const client of clients) {
        const value = (client as any)[dimension];
        if (!value) continue;

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
      const sellerClients = clients.filter(c => c.assignedSeller === seller);
      const sellerTotal = sellerClients.length;
      const sellerClosed = sellerClients.filter(c => c.closed).length;
      const sellerAvgConversion = sellerTotal > 0 ? (sellerClosed / sellerTotal) * ANALYTICS_CONSTANTS.PERCENTAGE_MULTIPLIER : 0;
      
      for (const dimension of dimensions) {
        const dimensionValues = new Map<string, { total: number; closed: number }>();

        for (const client of sellerClients) {
          const value = (client as any)[dimension];
          if (!value) continue;

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
            
            const isRelevant = successRate >= 70 ||
                              (successRate > sellerAvgConversion + 15) ||
                              (successRate > overallAvg + ANALYTICS_CONSTANTS.CONVERSION.THRESHOLD_ADJUSTMENT * 2);
            
            if (isRelevant) {
              correlations.push({
                seller,
                dimension,
                value,
                total: stats.total,
                closed: stats.closed,
                successRate,
                sellerAvgConversion: parseFloat(sellerAvgConversion.toFixed(ANALYTICS_CONSTANTS.DECIMAL_PLACES)),
                overallAvg: parseFloat(overallAvg.toFixed(ANALYTICS_CONSTANTS.DECIMAL_PLACES)),
                performanceVsAvg: parseFloat((successRate - overallAvg).toFixed(ANALYTICS_CONSTANTS.DECIMAL_PLACES)),
              });
            }
          }
        }
      }
    }

    return correlations;
  }

  async getSellerCorrelationInsights(): Promise<Record<string, string>> {
    const correlations = await this.getSellerCorrelations();
    const clients = await this.prisma.client.findMany({
      where: { processed: true },
    });

    const sellers = [...new Set(clients.map(c => c.assignedSeller))].sort();
    const insights: Record<string, string> = {};

    for (const seller of sellers) {
      const sellerCorrelations = correlations.filter(c => c.seller === seller);
      
      if (sellerCorrelations.length === 0) {
        insights[seller] = 'No significant correlations identified yet. Need more data to identify patterns.';
        continue;
      }

      const topCorrelations = sellerCorrelations
        .sort((a, b) => b.successRate - a.successRate)
        .slice(0, ANALYTICS_CONSTANTS.LIMITS.TOP_SELLERS);

      const correlationData = topCorrelations.map(corr => ({
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

    const sellers = [...new Set([
      ...currentMonthClients.map(c => c.assignedSeller),
      ...lastMonthClients.map(c => c.assignedSeller),
    ])];

    const insights: SellerInsightDto[] = [];

    for (const seller of sellers) {
      const currentClosed = currentMonthClients.filter(
        c => c.assignedSeller === seller && c.closed
      ).length;
      const lastClosed = lastMonthClients.filter(
        c => c.assignedSeller === seller && c.closed
      ).length;

      if (lastClosed > 0) {
        const change = ((currentClosed - lastClosed) / lastClosed) * ANALYTICS_CONSTANTS.PERCENTAGE_MULTIPLIER;
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

      const sellerCurrentClients = currentMonthClients.filter(c => c.assignedSeller === seller);
      const lowUrgencyClosed = sellerCurrentClients.filter(
        c => c.closed && c.urgencyLevel === 'exploratory'
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

  async getSellerAIFeedback(): Promise<SellerAIFeedbackDto[]> {
    const [sellers, correlations] = await Promise.all([
      this.getSellerMetrics(),
      this.getSellerCorrelations(),
    ]);

    const feedbackPromises = sellers.map(async (seller) => {
      const sellerCorrelations = correlations.filter(c => c.seller === seller.seller);
      
      const aiResult = await this.sellerInsightsGenerator.generateSellerFeedback({
        seller: seller.seller,
        metrics: {
          total: seller.total,
          closed: seller.closed,
          conversionRate: seller.conversionRate,
        },
        correlations: sellerCorrelations,
      });

      return {
        seller: seller.seller,
        recommendations: aiResult.recommendations,
      };
    });

    return Promise.all(feedbackPromises);
  }

  async getSellerTimelineInsight(
    granularity: 'week' | 'month' = 'month',
  ): Promise<string> {
    try {
      const timelineData = await this.getSellersTimeline(granularity);
      
      if (!timelineData || timelineData.length === 0) {
        return 'Insufficient data to generate insights.';
      }

      const sellers = timelineData.length > 0 
        ? Object.keys(timelineData[0].sellers || {}).filter(key => key !== 'period')
        : [];
      
      if (sellers.length === 0) {
        return 'No seller data available.';
      }

      return await this.sellerInsightsGenerator.generateSellerTimelineInsight(
        timelineData.map(t => ({
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

