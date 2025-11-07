import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { getSimulatedCurrentDate } from '../../../common/utils/date.utils';
import { ANALYTICS_CONSTANTS } from '../../../common/constants';
import {
  IndustryRankingDto,
  NewIndustriesLastMonthDto,
} from '../../../common/dto/analytics';

@Injectable()
export class IndustriesRankingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get detailed ranking of all industries with metrics
   * @returns Array of industry rankings sorted by client count
   */
  async getIndustriesDetailedRanking(): Promise<IndustryRankingDto[]> {
    const clients = await this.prisma.client.findMany({
      where: {
        processed: true,
        industry: { not: null },
      },
    });

    const industryMap = new Map<
      string,
      {
        clients: number;
        closed: number;
        sentiments: string[];
        urgencyLevels: string[];
      }
    >();

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
      const sentimentValues = stats.sentiments.map((s) => {
        if (s === 'positive') return ANALYTICS_CONSTANTS.SENTIMENT.POSITIVE_SCORE;
        if (s === 'neutral') return 2;
        if (s === 'skeptical') return 1;
        return 2;
      });
      const avgSentiment =
        sentimentValues.length > 0
          ? sentimentValues.reduce((a, b) => a + b, 0) / sentimentValues.length
          : 2;

      let sentimentLabel = 'neutral';
      if (avgSentiment >= ANALYTICS_CONSTANTS.SENTIMENT.POSITIVE_THRESHOLD)
        sentimentLabel = 'positive';
      else if (avgSentiment <= ANALYTICS_CONSTANTS.SENTIMENT.SKEPTICAL_THRESHOLD)
        sentimentLabel = 'skeptical';

      const urgencyValues = stats.urgencyLevels.map((u) => {
        if (u === 'immediate') return ANALYTICS_CONSTANTS.URGENCY.IMMEDIATE_SCORE;
        if (u === 'planned') return 2;
        if (u === 'exploratory') return 1;
        return 2;
      });
      const avgUrgency =
        urgencyValues.length > 0
          ? urgencyValues.reduce((a, b) => a + b, 0) / urgencyValues.length
          : 2;

      let urgencyLabel = 'planned';
      if (avgUrgency >= ANALYTICS_CONSTANTS.URGENCY.IMMEDIATE_THRESHOLD)
        urgencyLabel = 'immediate';
      else if (avgUrgency <= ANALYTICS_CONSTANTS.URGENCY.EXPLORATORY_THRESHOLD)
        urgencyLabel = 'exploratory';

      return {
        industry,
        clients: stats.clients,
        closed: stats.closed,
        conversionRate: parseFloat(
          ((stats.closed / stats.clients) * ANALYTICS_CONSTANTS.PERCENTAGE_MULTIPLIER).toFixed(
            ANALYTICS_CONSTANTS.DECIMAL_PLACES,
          ),
        ),
        averageSentiment: sentimentLabel,
        averageUrgency: urgencyLabel,
      };
    });

    ranking.sort((a, b) => b.clients - a.clients);

    return ranking;
  }

  /**
   * Get new industries that appeared in the last month
   * @returns New industries with their stats for the last month
   */
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
      lastMonthClients.map((c) => c.industry!).filter(Boolean),
    );
    const previousIndustries = new Set(
      previousClients.map((c) => c.industry!).filter(Boolean),
    );

    const newIndustries = Array.from(lastMonthIndustries).filter(
      (industry) => !previousIndustries.has(industry),
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

        const closed = clients.filter((c) => c.closed).length;
        const conversionRate =
          clients.length > 0
            ? parseFloat(
                ((closed / clients.length) * ANALYTICS_CONSTANTS.PERCENTAGE_MULTIPLIER).toFixed(
                  ANALYTICS_CONSTANTS.DECIMAL_PLACES,
                ),
              )
            : 0;

        return {
          industry,
          clients: clients.length,
          closed,
          conversionRate,
        };
      }),
    );

    newIndustriesStats.sort((a, b) => b.clients - a.clients);

    return {
      industries: newIndustriesStats,
      month: `${oneMonthAgo.toLocaleString('en-US', { month: 'long', year: 'numeric' })}`,
    };
  }
}

