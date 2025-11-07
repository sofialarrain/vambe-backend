import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { ConversionAnalysisDto, TimelineMetricsDto } from '../../common/dto/analytics';
import { OverviewService } from '../overview/overview.service';
import { DimensionEnum } from '../../common/dto/analytics/queries.dto';

interface TimelineMetricRow {
  date: Date;
  total: bigint;
  closed: bigint;
}

@Injectable()
export class ConversionAnalysisService {
  private readonly logger = new Logger(ConversionAnalysisService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly overviewService: OverviewService,
  ) {}

  async getConversionAnalysis(): Promise<ConversionAnalysisDto> {
    const [byIndustry, bySentiment, byUrgency, byDiscovery, byOperationSize] = await Promise.all([
      this.overviewService.getMetricsByDimension(DimensionEnum.INDUSTRY),
      this.overviewService.getMetricsByDimension(DimensionEnum.SENTIMENT),
      this.overviewService.getMetricsByDimension(DimensionEnum.URGENCY_LEVEL),
      this.overviewService.getMetricsByDimension(DimensionEnum.DISCOVERY_SOURCE),
      this.overviewService.getMetricsByDimension(DimensionEnum.OPERATION_SIZE),
    ]);

    return {
      byIndustry,
      bySentiment,
      byUrgency,
      byDiscovery,
      byOperationSize,
    };
  }

  async getTimelineMetrics(): Promise<TimelineMetricsDto[]> {
    try {
      const rawResults = await this.executeTimelineAggregationQuery();

      return rawResults.map((row) => {
        const dateStr = row.date.toISOString().split('T')[0];
        return {
          date: dateStr,
          total: Number(row.total),
          closed: Number(row.closed),
        };
      });
    } catch (error) {
      this.logger.error('Error getting timeline metrics:', error);
      throw error;
    }
  }

  private async executeTimelineAggregationQuery(): Promise<TimelineMetricRow[]> {
    return this.prisma.$queryRaw<TimelineMetricRow[]>`
      SELECT 
        DATE_TRUNC('day', "meetingDate")::date as date,
        COUNT(*)::bigint as total,
        SUM(CASE WHEN closed = true THEN 1 ELSE 0 END)::bigint as closed
      FROM clients
      GROUP BY date
      ORDER BY date ASC
    `;
  }
}

