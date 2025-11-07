import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ClientInsightsGeneratorService } from '../../../llm/generators/client-insights-generator.service';
import {
  InsightDto,
  ClientPerceptionInsightDto,
} from '../../../common/dto/analytics';

@Injectable()
export class ClientInsightsService {
  private readonly logger = new Logger(ClientInsightsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly clientInsightsGenerator: ClientInsightsGeneratorService,
  ) {}

  /**
   * Get AI-generated insight on client perception
   * Analyzes client transcripts to understand their perception
   * @returns Client perception insight with positive aspects, concerns, and recommendations
   */
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

      const clients = allClients.filter(
        (c) => c.transcription && c.transcription.trim().length > 0,
      );

      if (clients.length === 0) {
        return {
          positiveAspects: 'No client transcripts available for perception analysis.',
          concerns: '',
          successFactors: '',
          recommendations: '',
        };
      }

      const transcriptions = clients.map((c) => ({
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

  /**
   * Get AI-generated insight on client solutions
   * Analyzes client transcripts to identify solution patterns
   * @returns Insight about client solutions and requirements
   */
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

      const clients = allClients.filter(
        (c) => c.transcription && c.transcription.trim().length > 0,
      );

      if (clients.length === 0) {
        return { insight: 'No client transcripts available for solutions analysis.' };
      }

      const transcriptions = clients.map((c) => ({
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
}

