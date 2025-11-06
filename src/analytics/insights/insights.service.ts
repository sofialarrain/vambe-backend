import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AnalyticsInsightsGeneratorService } from '../../llm/generators/analytics-insights-generator.service';
import { ClientInsightsGeneratorService } from '../../llm/generators/client-insights-generator.service';
import {
  InsightDto,
  TimelineInsightDto,
  ClientPerceptionInsightDto,
} from '../../common/dto/analytics';
import { PainPointsService } from '../pain-points/pain-points.service';

@Injectable()
export class InsightsService {
  private readonly logger = new Logger(InsightsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly analyticsInsightsGenerator: AnalyticsInsightsGeneratorService,
    private readonly clientInsightsGenerator: ClientInsightsGeneratorService,
    private readonly painPointsService: PainPointsService,
  ) {}

  async getVolumeVsConversionInsight(): Promise<InsightDto> {
    try {
      const volumeData = await this.painPointsService.getVolumeVsConversion();
      
      if (!volumeData || volumeData.length === 0) {
        return { insight: 'No volume vs conversion data available to analyze.' };
      }
      
      return await this.analyticsInsightsGenerator.generateVolumeVsConversionInsight(volumeData);
    } catch (error) {
      this.logger.error('Error getting volume vs conversion insight:', error);
      return { insight: 'Unable to generate insight at this time.' };
    }
  }

  async getPainPointsInsight(): Promise<InsightDto> {
    try {
      const painPoints = await this.painPointsService.getTopPainPoints();
      
      if (!painPoints || painPoints.length === 0) {
        return { insight: 'No pain points data available to analyze.' };
      }
      
      return await this.analyticsInsightsGenerator.generatePainPointsInsight(painPoints);
    } catch (error) {
      this.logger.error('Error getting pain points insight:', error);
      return { insight: 'Unable to generate insight at this time.' };
    }
  }

  async getClientPerceptionInsight(): Promise<ClientPerceptionInsightDto> {
    try {
      const allClients = await this.prisma.client.findMany({
        where: {
          processed: true,
        },
        select: {
          transcription: true,
          closed: true,
          sentiment: true,
        },
        take: 20,
        orderBy: {
          createdAt: 'desc',
        },
      });

      const clients = allClients.filter(c => c.transcription && c.transcription.trim().length > 0);

      if (clients.length === 0) {
        return {
          positiveAspects: 'No client transcripts available for perception analysis.',
          concerns: '',
          successFactors: '',
          recommendations: '',
        };
      }

      const transcriptions = clients.map(c => ({
        transcription: c.transcription!,
        closed: c.closed,
        sentiment: c.sentiment,
      }));

      return await this.clientInsightsGenerator.generateClientPerceptionInsight(transcriptions);
    } catch (error) {
      this.logger.error('Error getting client perception insight:', error);
      return {
        positiveAspects: 'Unable to generate analysis at this time.',
        concerns: 'Unable to generate analysis at this time.',
        successFactors: 'Unable to generate analysis at this time.',
        recommendations: 'Unable to generate analysis at this time.',
      };
    }
  }

  async getClientSolutionsInsight(): Promise<InsightDto> {
    try {
      const allClients = await this.prisma.client.findMany({
        where: {
          processed: true,
        },
        select: {
          transcription: true,
          closed: true,
          mainMotivation: true,
          technicalRequirements: true,
        },
        take: 30,
        orderBy: {
          createdAt: 'desc',
        },
      });

      const clients = allClients.filter(c => c.transcription && c.transcription.trim().length > 0);

      if (clients.length === 0) {
        return { insight: 'No client transcripts available for solutions analysis.' };
      }

      const transcriptions = clients.map(c => ({
        transcription: c.transcription!,
        closed: c.closed,
        mainMotivation: c.mainMotivation,
        technicalRequirements: c.technicalRequirements,
      }));

      return await this.clientInsightsGenerator.generateClientSolutionsInsight(transcriptions);
    } catch (error) {
      this.logger.error('Error getting client solutions insight:', error);
      return { insight: 'Unable to generate insight at this time.' };
    }
  }

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

      const monthlyData = new Map<string, {
        totalMeetings: number;
        totalClosed: number;
        industries: Map<string, { count: number; sentiments: string[] }>;
        sentiments: string[];
      }>();

      clients.forEach(client => {
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

      const timelineDataForLLM = Array.from(monthlyData.entries())
        .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
        .map(([monthKey, data]) => {
          // Parse monthKey (format: YYYY-MM) and create date in UTC
          const [year, month] = monthKey.split('-').map(Number);
          const date = new Date(Date.UTC(year, month - 1, 1));
          const monthLabel = date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long',
            timeZone: 'UTC' 
          });
          
          const industriesArray = Array.from(data.industries.entries())
            .map(([industry, industryData]) => ({
              industry,
              count: industryData.count,
              sentiment: industryData.sentiments.length > 0 
                ? industryData.sentiments.reduce((a, b, _, arr) => 
                    arr.filter(v => v === a).length >= arr.filter(v => v === b).length ? a : b
                  )
                : 'neutral',
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 3);

          const avgSentiment = data.sentiments.length > 0
            ? data.sentiments.reduce((a, b, _, arr) => 
                arr.filter(v => v === a).length >= arr.filter(v => v === b).length ? a : b
              )
            : 'neutral';

          return {
            month: monthLabel,
            totalMeetings: data.totalMeetings,
            totalClosed: data.totalClosed,
            conversionRate: data.totalMeetings > 0 
              ? parseFloat(((data.totalClosed / data.totalMeetings) * 100).toFixed(1))
              : 0,
            avgSentiment,
            topIndustries: industriesArray,
          };
        });

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
}

