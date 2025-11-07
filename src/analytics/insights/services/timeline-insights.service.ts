import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AnalyticsInsightsGeneratorService } from '../../../llm/generators/analytics-insights-generator.service';
import { TimelineInsightDto } from '../../../common/dto/analytics';

@Injectable()
export class TimelineInsightsService {
  private readonly logger = new Logger(TimelineInsightsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly analyticsInsightsGenerator: AnalyticsInsightsGeneratorService,
  ) {}

  /**
   * Get AI-generated insight on timeline metrics
   * Analyzes monthly data to identify trends and patterns
   * @returns Timeline insight with key findings, reasons, and recommendations
   */
  async getTimelineInsight(): Promise<TimelineInsightDto> {
    try {
      const clients = await this.prisma.client.findMany({
        where: {
          processed: true,
        },
        select: {
          meetingDate: true,
          closed: true,
          industry: true,
          sentiment: true,
        },
        orderBy: {
          meetingDate: 'asc',
        },
      });

      if (clients.length === 0) {
        return {
          keyFindings: ['No timeline data available to analyze.'],
          reasons: [],
          recommendations: [],
        };
      }

      const monthlyData = this.buildMonthlyData(clients);
      const timelineDataForLLM = this.formatTimelineDataForLLM(monthlyData);

      return await this.analyticsInsightsGenerator.generateTimelineInsight(timelineDataForLLM);
    } catch (error) {
      this.logger.error('Error getting timeline insight:', error);
      return {
        keyFindings: ['Unable to generate timeline insights at this time.'],
        reasons: [],
        recommendations: [],
      };
    }
  }

  /**
   * Build monthly data map from clients
   */
  private buildMonthlyData(
    clients: Array<{
      meetingDate: Date;
      closed: boolean;
      industry: string | null;
      sentiment: string | null;
    }>,
  ): Map<
    string,
    {
      totalMeetings: number;
      totalClosed: number;
      industries: Map<string, { count: number; sentiments: string[] }>;
      sentiments: string[];
    }
  > {
    const monthlyData = new Map<
      string,
      {
        totalMeetings: number;
        totalClosed: number;
        industries: Map<string, { count: number; sentiments: string[] }>;
        sentiments: string[];
      }
    >();

    clients.forEach((client) => {
      const date = new Date(client.meetingDate);
      const monthKey = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;

      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, {
          totalMeetings: 0,
          totalClosed: 0,
          industries: new Map(),
          sentiments: [],
        });
      }

      const monthData = monthlyData.get(monthKey)!;
      monthData.totalMeetings += 1;
      if (client.closed) {
        monthData.totalClosed += 1;
      }
      if (client.sentiment) {
        monthData.sentiments.push(client.sentiment);
      }
      if (client.industry) {
        if (!monthData.industries.has(client.industry)) {
          monthData.industries.set(client.industry, { count: 0, sentiments: [] });
        }
        const industryData = monthData.industries.get(client.industry)!;
        industryData.count += 1;
        if (client.sentiment) {
          industryData.sentiments.push(client.sentiment);
        }
      }
    });

    return monthlyData;
  }

  /**
   * Format timeline data for LLM processing
   */
  private formatTimelineDataForLLM(
    monthlyData: Map<
      string,
      {
        totalMeetings: number;
        totalClosed: number;
        industries: Map<string, { count: number; sentiments: string[] }>;
        sentiments: string[];
      }
    >,
  ): Array<{
    month: string;
    totalMeetings: number;
    totalClosed: number;
    conversionRate: number;
    avgSentiment: string;
    topIndustries: Array<{ industry: string; count: number; sentiment: string }>;
  }> {
    return Array.from(monthlyData.entries())
      .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
      .map(([monthKey, data]) => {
        const [year, month] = monthKey.split('-').map(Number);
        const date = new Date(Date.UTC(year, month - 1, 1));
        const monthLabel = date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          timeZone: 'UTC',
        });

        const industriesArray = Array.from(data.industries.entries())
          .map(([industry, industryData]) => ({
            industry,
            count: industryData.count,
            sentiment:
              industryData.sentiments.length > 0
                ? industryData.sentiments.reduce((a, b, _, arr) =>
                    arr.filter((v) => v === a).length >= arr.filter((v) => v === b).length
                      ? a
                      : b,
                  )
                : 'neutral',
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 3);

        const avgSentiment =
          data.sentiments.length > 0
            ? data.sentiments.reduce((a, b, _, arr) =>
                arr.filter((v) => v === a).length >= arr.filter((v) => v === b).length ? a : b,
              )
            : 'neutral';

        return {
          month: monthLabel,
          totalMeetings: data.totalMeetings,
          totalClosed: data.totalClosed,
          conversionRate:
            data.totalMeetings > 0
              ? parseFloat(((data.totalClosed / data.totalMeetings) * 100).toFixed(1))
              : 0,
          avgSentiment,
          topIndustries: industriesArray,
        };
      });
  }
}

