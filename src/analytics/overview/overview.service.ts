import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { ANALYTICS_CONSTANTS } from '../../common/constants';
import { OverviewMetricsDto, DimensionMetricsDto } from '../../common/dto/analytics';
import { DimensionEnum } from '../../common/dto/analytics/queries.dto';

interface DimensionMetricRow {
  value: string;
  count: bigint;
  closed_count: bigint;
  total_interaction_volume?: bigint;
}

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
   * Optimized with SQL aggregations for better performance with large datasets.
   * Uses raw SQL to avoid N+1 queries and reduce memory usage.
   * 
   * @param dimension - The dimension to group by (industry, sentiment, etc.)
   * @returns Metrics grouped by the specified dimension
   */
  async getMetricsByDimension(dimension: DimensionEnum): Promise<DimensionMetricsDto> {
    try {
      const fieldName = this.getDimensionFieldName(dimension);
      const rawResults = await this.executeDimensionAggregationQuery(fieldName, dimension);

      const values = rawResults.map((row) => {
        const count = Number(row.count);
        const closed = Number(row.closed_count);
        
        return {
          value: row.value,
          count,
          closed,
          conversionRate: parseFloat(
            ((closed / count) * ANALYTICS_CONSTANTS.PERCENTAGE_MULTIPLIER)
              .toFixed(ANALYTICS_CONSTANTS.DECIMAL_PLACES)
          ),
          ...(row.total_interaction_volume !== undefined 
            ? { totalInteractionVolume: Number(row.total_interaction_volume) }
            : {}
          ),
        };
      });

      return { dimension, values };
    } catch (error) {
      this.logger.error(`Error getting metrics by dimension ${dimension}:`, error);
      throw error;
    }
  }

  /**
   * Get database field name for a dimension
   * Maps enum values to actual database column names
   * @private
   */
  private getDimensionFieldName(dimension: DimensionEnum): string {
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

    return fieldName;
  }

  /**
   * Execute optimized SQL aggregation query for dimension metrics
   * Uses raw SQL with type safety to perform aggregations at database level
   * This significantly improves performance by avoiding loading all records into memory
   * 
   * @private
   */
  private async executeDimensionAggregationQuery(
    fieldName: string,
    dimension: DimensionEnum,
  ): Promise<DimensionMetricRow[]> {
    const isIndustry = dimension === DimensionEnum.INDUSTRY;
    
    if (isIndustry) {
      return this.prisma.$queryRaw<DimensionMetricRow[]>`
        SELECT 
          ${Prisma.raw(`"${fieldName}"`)} as value,
          COUNT(*)::bigint as count,
          SUM(CASE WHEN closed = true THEN 1 ELSE 0 END)::bigint as closed_count,
          SUM(COALESCE("interactionVolume", 0))::bigint as total_interaction_volume
        FROM clients
        WHERE processed = true 
          AND ${Prisma.raw(`"${fieldName}"`)} IS NOT NULL
        GROUP BY ${Prisma.raw(`"${fieldName}"`)}
        ORDER BY count DESC
      `;
    } else {
      return this.prisma.$queryRaw<DimensionMetricRow[]>`
        SELECT 
          ${Prisma.raw(`"${fieldName}"`)} as value,
          COUNT(*)::bigint as count,
          SUM(CASE WHEN closed = true THEN 1 ELSE 0 END)::bigint as closed_count
        FROM clients
        WHERE processed = true 
          AND ${Prisma.raw(`"${fieldName}"`)} IS NOT NULL
        GROUP BY ${Prisma.raw(`"${fieldName}"`)}
        ORDER BY count DESC
      `;
    }
  }

}

