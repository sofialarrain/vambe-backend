import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConversionAnalysisDto, TimelineMetricsDto } from '../../common/dto/analytics';
import { OverviewService } from '../overview/overview.service';

@Injectable()
export class ConversionAnalysisService {
  private readonly logger = new Logger(ConversionAnalysisService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly overviewService: OverviewService,
  ) {}

  async getConversionAnalysis(): Promise<ConversionAnalysisDto> {
    const [byIndustry, bySentiment, byUrgency, byDiscovery, byOperationSize] = await Promise.all([
      this.overviewService.getMetricsByDimension('industry'),
      this.overviewService.getMetricsByDimension('sentiment'),
      this.overviewService.getMetricsByDimension('urgencyLevel'),
      this.overviewService.getMetricsByDimension('discoverySource'),
      this.overviewService.getMetricsByDimension('operationSize'),
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
    const clients = await this.prisma.client.findMany({
      orderBy: { meetingDate: 'asc' },
    });

    const grouped = new Map<string, { total: number; closed: number }>();

    for (const client of clients) {
      const dateKey = client.meetingDate.toISOString().split('T')[0];
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, { total: 0, closed: 0 });
      }
      const entry = grouped.get(dateKey)!;
      entry.total++;
      if (client.closed) entry.closed++;
    }

    return Array.from(grouped.entries())
      .map(([date, data]) => ({
        date,
        total: data.total,
        closed: data.closed,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }
}

