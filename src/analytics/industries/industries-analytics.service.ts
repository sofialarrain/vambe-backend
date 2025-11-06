import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { IndustryInsightsGeneratorService } from '../../llm/generators/industry-insights-generator.service';
import { getSimulatedCurrentDate } from '../../common/utils/date.utils';
import { ANALYTICS_CONSTANTS } from '../../common/constants';
import {
  IndustryRankingDto,
  NewIndustriesLastMonthDto,
  IndustriesToWatchDto,
  InsightDto,
} from '../../common/dto/analytics';
import { ConversionAnalysisService } from '../conversion/conversion-analysis.service';

@Injectable()
export class IndustriesAnalyticsService {
  private readonly logger = new Logger(IndustriesAnalyticsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly industryInsightsGenerator: IndustryInsightsGeneratorService,
    private readonly conversionAnalysisService: ConversionAnalysisService,
  ) {}

  async getIndustriesDetailedRanking(): Promise<IndustryRankingDto[]> {
    const clients = await this.prisma.client.findMany({
      where: {
        processed: true,
        industry: { not: null },
      },
    });

    const industryMap = new Map<string, {
      clients: number;
      closed: number;
      sentiments: string[];
      urgencyLevels: string[];
    }>();

    for (const client of clients) {
      const industry = client.industry!;
      
      if (!industryMap.has(industry)) {
        industryMap.set(industry, {
          clients: 0,
          closed: 0,
          sentiments: [],
          urgencyLevels: [],
        });
      }

      const stats = industryMap.get(industry)!;
      stats.clients++;
      if (client.closed) stats.closed++;
      if (client.sentiment) stats.sentiments.push(client.sentiment);
      if (client.urgencyLevel) stats.urgencyLevels.push(client.urgencyLevel);
    }

    const ranking = Array.from(industryMap.entries()).map(([industry, stats]) => {
      const sentimentValues = stats.sentiments.map(s => {
        if (s === 'positive') return ANALYTICS_CONSTANTS.SENTIMENT.POSITIVE_SCORE;
        if (s === 'neutral') return 2;
        if (s === 'skeptical') return 1;
        return 2;
      });
      const avgSentiment = sentimentValues.length > 0
        ? sentimentValues.reduce((a, b) => a + b, 0) / sentimentValues.length
        : 2;

      let sentimentLabel = 'neutral';
      if (avgSentiment >= ANALYTICS_CONSTANTS.SENTIMENT.POSITIVE_THRESHOLD) sentimentLabel = 'positive';
      else if (avgSentiment <= ANALYTICS_CONSTANTS.SENTIMENT.SKEPTICAL_THRESHOLD) sentimentLabel = 'skeptical';

      const urgencyValues = stats.urgencyLevels.map(u => {
        if (u === 'immediate') return ANALYTICS_CONSTANTS.URGENCY.IMMEDIATE_SCORE;
        if (u === 'planned') return 2;
        if (u === 'exploratory') return 1;
        return 2;
      });
      const avgUrgency = urgencyValues.length > 0
        ? urgencyValues.reduce((a, b) => a + b, 0) / urgencyValues.length
        : 2;

      let urgencyLabel = 'planned';
      if (avgUrgency >= ANALYTICS_CONSTANTS.URGENCY.IMMEDIATE_THRESHOLD) urgencyLabel = 'immediate';
      else if (avgUrgency <= ANALYTICS_CONSTANTS.URGENCY.EXPLORATORY_THRESHOLD) urgencyLabel = 'exploratory';

      return {
        industry,
        clients: stats.clients,
        closed: stats.closed,
        conversionRate: parseFloat(((stats.closed / stats.clients) * ANALYTICS_CONSTANTS.PERCENTAGE_MULTIPLIER).toFixed(ANALYTICS_CONSTANTS.DECIMAL_PLACES)),
        averageSentiment: sentimentLabel,
        averageUrgency: urgencyLabel,
      };
    });

    ranking.sort((a, b) => b.clients - a.clients);

    return ranking;
  }

  async getNewIndustriesLastMonth(): Promise<NewIndustriesLastMonthDto> {
    const now = getSimulatedCurrentDate();
    const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);

    const lastMonthClients = await this.prisma.client.findMany({
      where: {
        meetingDate: {
          gte: oneMonthAgo,
          lt: new Date(now.getFullYear(), now.getMonth(), 1),
        },
        processed: true,
        industry: { not: null },
      },
      select: {
        industry: true,
      },
    });

    const previousClients = await this.prisma.client.findMany({
      where: {
        meetingDate: {
          lt: oneMonthAgo,
        },
        processed: true,
        industry: { not: null },
      },
      select: {
        industry: true,
      },
    });

    const lastMonthIndustries = new Set(
      lastMonthClients.map(c => c.industry!).filter(Boolean)
    );
    const previousIndustries = new Set(
      previousClients.map(c => c.industry!).filter(Boolean)
    );

    const newIndustries = Array.from(lastMonthIndustries).filter(
      industry => !previousIndustries.has(industry)
    );

    const newIndustriesStats = await Promise.all(
      newIndustries.map(async (industry) => {
        const clients = await this.prisma.client.findMany({
          where: {
            industry,
            meetingDate: {
              gte: oneMonthAgo,
              lt: new Date(now.getFullYear(), now.getMonth(), 1),
            },
            processed: true,
          },
        });

        const closed = clients.filter(c => c.closed).length;
        const conversionRate = clients.length > 0
          ? parseFloat(((closed / clients.length) * ANALYTICS_CONSTANTS.PERCENTAGE_MULTIPLIER).toFixed(ANALYTICS_CONSTANTS.DECIMAL_PLACES))
          : 0;

        return {
          industry,
          clients: clients.length,
          closed,
          conversionRate,
        };
      })
    );

    newIndustriesStats.sort((a, b) => b.clients - a.clients);

    return {
      industries: newIndustriesStats,
      month: `${oneMonthAgo.toLocaleString('en-US', { month: 'long', year: 'numeric' })}`,
    };
  }

  async getIndustriesToWatch(): Promise<IndustriesToWatchDto> {
    const MIN_CLIENTS_FOR_RELIABILITY = ANALYTICS_CONSTANTS.MIN_CLIENTS_FOR_RELIABILITY;
    
    const clients = await this.prisma.client.findMany({
      where: {
        processed: true,
        industry: { not: null },
      },
    });

    const industryMap = new Map<string, {
      clients: number;
      closed: number;
    }>();

    for (const client of clients) {
      const industry = client.industry!;
      
      if (!industryMap.has(industry)) {
        industryMap.set(industry, {
          clients: 0,
          closed: 0,
        });
      }

      const stats = industryMap.get(industry)!;
      stats.clients++;
      if (client.closed) stats.closed++;
    }

    const allIndustriesMapped = Array.from(industryMap.entries())
      .map(([industry, stats]) => ({
        industry,
        clients: stats.clients,
        closed: stats.closed,
        conversionRate: parseFloat(((stats.closed / stats.clients) * ANALYTICS_CONSTANTS.PERCENTAGE_MULTIPLIER).toFixed(ANALYTICS_CONSTANTS.DECIMAL_PLACES)),
      }));
    
    this.logger.debug(`Total industries found: ${allIndustriesMapped.length}`);
    
    const industries = allIndustriesMapped.filter(i => i.clients >= MIN_CLIENTS_FOR_RELIABILITY);
    
    this.logger.debug(`Industries with ${MIN_CLIENTS_FOR_RELIABILITY}+ clients: ${industries.length}`);

    if (industries.length === 0) {
      this.logger.warn('No industries meet minimum reliability threshold');
      return {
        expansionOpportunities: [],
        strategyNeeded: [],
      };
    }

    const clientCounts = industries.map(i => i.clients).sort((a, b) => a - b);
    const medianClients = clientCounts.length > 0
      ? clientCounts[Math.floor(clientCounts.length / 2)]
      : 0;
    
    const avgConversionRate = industries.length > 0
      ? industries.reduce((sum, i) => sum + i.conversionRate, 0) / industries.length
      : 0;

    // Make thresholds less restrictive - use percentiles instead of absolute values
    const clientCountsSorted = industries.map(i => i.clients).sort((a, b) => a - b);
    const conversionRatesSorted = industries.map(i => i.conversionRate).sort((a, b) => a - b);
    
    // Use 33rd percentile for low volume threshold
    const lowVolumeThreshold = clientCountsSorted.length > 0
      ? clientCountsSorted[Math.floor(clientCountsSorted.length * ANALYTICS_CONSTANTS.PERCENTILES.LOW)]
      : medianClients;
    
    // Use 67th percentile for high volume threshold
    const highVolumeThreshold = clientCountsSorted.length > 0
      ? clientCountsSorted[Math.floor(clientCountsSorted.length * ANALYTICS_CONSTANTS.PERCENTILES.HIGH)]
      : medianClients;
    
    // Use 67th percentile for high conversion threshold (top performers)
    const highConversionThreshold = conversionRatesSorted.length > 0
      ? conversionRatesSorted[Math.floor(conversionRatesSorted.length * ANALYTICS_CONSTANTS.PERCENTILES.HIGH)]
      : Math.max(ANALYTICS_CONSTANTS.CONVERSION.HIGH_THRESHOLD_MIN, avgConversionRate + ANALYTICS_CONSTANTS.CONVERSION.THRESHOLD_ADJUSTMENT);
    
    // Use 33rd percentile for low conversion threshold (underperformers)
    const lowConversionThreshold = conversionRatesSorted.length > 0
      ? conversionRatesSorted[Math.floor(conversionRatesSorted.length * ANALYTICS_CONSTANTS.PERCENTILES.LOW)]
      : Math.min(ANALYTICS_CONSTANTS.CONVERSION.LOW_THRESHOLD_MAX, avgConversionRate - ANALYTICS_CONSTANTS.CONVERSION.THRESHOLD_ADJUSTMENT);

    this.logger.debug(`Thresholds - Low volume: ${lowVolumeThreshold}, High volume: ${highVolumeThreshold}, High conversion: ${highConversionThreshold.toFixed(2)}%, Low conversion: ${lowConversionThreshold.toFixed(2)}%`);

    const expansionOpportunities = industries
      .filter(i => i.clients <= lowVolumeThreshold && i.conversionRate >= highConversionThreshold)
      .sort((a, b) => b.conversionRate - a.conversionRate);

    const strategyNeeded = industries
      .filter(i => i.clients >= highVolumeThreshold && i.conversionRate <= lowConversionThreshold)
      .sort((a, b) => b.clients - a.clients);

    this.logger.debug(`Found ${expansionOpportunities.length} expansion opportunities and ${strategyNeeded.length} industries needing strategy review`);

    return {
      expansionOpportunities: expansionOpportunities.slice(0, ANALYTICS_CONSTANTS.LIMITS.TOP_INDUSTRIES),
      strategyNeeded: strategyNeeded.slice(0, ANALYTICS_CONSTANTS.LIMITS.TOP_INDUSTRIES),
    };
  }

  async getIndustryDistributionInsight(): Promise<InsightDto> {
    try {
      const conversionData = await this.conversionAnalysisService.getConversionAnalysis();
      const industryData = conversionData.byIndustry.values || [];
      
      if (!industryData || industryData.length === 0) {
        return { insight: 'No industry data available to analyze.' };
      }
      
      return await this.industryInsightsGenerator.generateIndustryDistributionInsight(industryData);
    } catch (error) {
      this.logger.error('Error getting industry distribution insight:', error);
      return { insight: 'Unable to generate insight at this time.' };
    }
  }

  async getIndustryConversionInsight(): Promise<InsightDto> {
    try {
      const conversionData = await this.conversionAnalysisService.getConversionAnalysis();
      const industryData = conversionData.byIndustry.values || [];
      
      if (!industryData || industryData.length === 0) {
        return { insight: 'No industry data available to analyze.' };
      }
      
      return await this.industryInsightsGenerator.generateIndustryConversionInsight(industryData);
    } catch (error) {
      this.logger.error('Error getting industry conversion insight:', error);
      return { insight: 'Unable to generate insight at this time.' };
    }
  }
}

