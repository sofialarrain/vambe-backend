import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ANALYTICS_CONSTANTS } from '../../common/constants';
import { OverviewMetricsDto, DimensionMetricsDto } from '../../common/dto/analytics';
import { DimensionEnum } from '../../common/dto/analytics/queries.dto';
import { Client } from '@prisma/client';

@Injectable()
export class OverviewService {
  private readonly logger = new Logger(OverviewService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get overview metrics including total clients, conversion rates, and processing status
   * @returns Overview metrics with totals and rates
   */
  async getOverview(): Promise<OverviewMetricsDto> {
    try {
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
    } catch (error) {
      this.logger.error('Error getting overview metrics:', error);
      throw error;
    }
  }

  /**
   * Get metrics grouped by a specific dimension
   * @param dimension - The dimension to group by (industry, sentiment, etc.)
   * @returns Metrics grouped by the specified dimension
   */
  async getMetricsByDimension(dimension: DimensionEnum): Promise<DimensionMetricsDto> {
    try {
      const whereClause = this.buildDimensionWhereClause(dimension);

      const clients = await this.prisma.client.findMany({
        where: {
          processed: true,
          ...whereClause,
        },
      });

      const grouped = new Map<string, { count: number; closed: number; totalInteractionVolume: number }>();

      for (const client of clients) {
        const value = this.getDimensionValue(client, dimension);
        if (!value) continue;

        if (!grouped.has(value)) {
          grouped.set(value, { count: 0, closed: 0, totalInteractionVolume: 0 });
        }

        const entry = grouped.get(value)!;
        entry.count++;
        if (client.closed) entry.closed++;
        if (dimension === DimensionEnum.INDUSTRY && client.interactionVolume) {
          entry.totalInteractionVolume += client.interactionVolume;
        }
      }

      const values = Array.from(grouped.entries()).map(([value, data]) => ({
        value,
        count: data.count,
        closed: data.closed,
        conversionRate: parseFloat(((data.closed / data.count) * ANALYTICS_CONSTANTS.PERCENTAGE_MULTIPLIER).toFixed(ANALYTICS_CONSTANTS.DECIMAL_PLACES)),
        ...(dimension === DimensionEnum.INDUSTRY ? { totalInteractionVolume: data.totalInteractionVolume } : {}),
      }));

      values.sort((a, b) => b.count - a.count);

      return { dimension, values };
    } catch (error) {
      this.logger.error(`Error getting metrics by dimension ${dimension}:`, error);
      throw error;
    }
  }

  /**
   * Build Prisma where clause for a specific dimension
   * @private
   */
  private buildDimensionWhereClause(dimension: DimensionEnum): Record<string, unknown> {
    const dimensionFieldMap: Record<DimensionEnum, string> = {
      [DimensionEnum.INDUSTRY]: 'industry',
      [DimensionEnum.SENTIMENT]: 'sentiment',
      [DimensionEnum.URGENCY_LEVEL]: 'urgencyLevel',
      [DimensionEnum.DISCOVERY_SOURCE]: 'discoverySource',
      [DimensionEnum.OPERATION_SIZE]: 'operationSize',
    };

    const fieldName = dimensionFieldMap[dimension];
    if (!fieldName) {
      throw new BadRequestException(`Invalid dimension: ${dimension}`);
    }

    return {
      [fieldName]: { not: null },
    };
  }

  /**
   * Get the value of a dimension from a client object in a type-safe way
   * @private
   */
  private getDimensionValue(client: Client, dimension: DimensionEnum): string | null {
    switch (dimension) {
      case DimensionEnum.INDUSTRY:
        return client.industry;
      case DimensionEnum.SENTIMENT:
        return client.sentiment;
      case DimensionEnum.URGENCY_LEVEL:
        return client.urgencyLevel;
      case DimensionEnum.DISCOVERY_SOURCE:
        return client.discoverySource;
      case DimensionEnum.OPERATION_SIZE:
        return client.operationSize;
      default:
        this.logger.warn(`Unknown dimension: ${dimension}`);
        return null;
    }
  }
}

