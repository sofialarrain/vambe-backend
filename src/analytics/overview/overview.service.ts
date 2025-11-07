import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ANALYTICS_CONSTANTS } from '../../common/constants';
import { OverviewMetricsDto, DimensionMetricsDto } from '../../common/dto/analytics';

@Injectable()
export class OverviewService {
  private readonly logger = new Logger(OverviewService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getOverview(): Promise<OverviewMetricsDto> {
    const [totalClients, totalClosed, processedClients] = await Promise.all([
      this.prisma.client.count(),
      this.prisma.client.count({ where: { closed: true } }),
      this.prisma.client.count({ where: { processed: true } }),
    ]);

    const totalOpen = totalClients - totalClosed;
    const conversionRate = totalClients > 0 ? (totalClosed / totalClients) * ANALYTICS_CONSTANTS.PERCENTAGE_MULTIPLIER : 0;
    const unprocessedClients = totalClients - processedClients;

    return {
      totalClients,
      totalClosed,
      totalOpen,
      conversionRate: parseFloat(conversionRate.toFixed(2)),
      processedClients,
      unprocessedClients,
    };
  }

  async getMetricsByDimension(dimension: string): Promise<DimensionMetricsDto> {
    const clients = await this.prisma.client.findMany({
      where: {
        processed: true,
        [dimension]: { not: null },
      },
    });

    const grouped = new Map<string, { count: number; closed: number; totalInteractionVolume: number }>();

    for (const client of clients) {
      const value = (client as any)[dimension] as string;
      if (!value) continue;

      if (!grouped.has(value)) {
        grouped.set(value, { count: 0, closed: 0, totalInteractionVolume: 0 });
      }

      const entry = grouped.get(value)!;
      entry.count++;
      if (client.closed) entry.closed++;
      if (dimension === 'industry' && client.interactionVolume) {
        entry.totalInteractionVolume += client.interactionVolume;
      }
    }

    const values = Array.from(grouped.entries()).map(([value, data]) => ({
      value,
      count: data.count,
      closed: data.closed,
      conversionRate: parseFloat(((data.closed / data.count) * ANALYTICS_CONSTANTS.PERCENTAGE_MULTIPLIER).toFixed(ANALYTICS_CONSTANTS.DECIMAL_PLACES)),
      ...(dimension === 'industry' ? { totalInteractionVolume: data.totalInteractionVolume } : {}),
    }));

    values.sort((a, b) => b.count - a.count);

    return { dimension, values };
  }
}

