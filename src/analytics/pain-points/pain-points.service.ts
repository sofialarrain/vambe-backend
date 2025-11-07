import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { PainPointDto, TechnicalRequirementDto, VolumeVsConversionDto } from '../../common/dto/analytics';

interface PainPointRow {
  pain_point: string;
  count: bigint;
  closed_count: bigint;
}

interface VolumeRangeRow {
  volume_range: string;
  count: bigint;
  closed_count: bigint;
}

@Injectable()
export class PainPointsService {
  private readonly logger = new Logger(PainPointsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get top pain points from client interactions
   * Optimized with SQL unnest() to expand arrays and aggregate at database level.
   * Normalization is performed in application layer to handle variations.
   * 
   * @returns Top 10 pain points with counts and conversion rates
   */
  async getTopPainPoints(): Promise<PainPointDto[]> {
    try {
      const rawResults = await this.executePainPointsAggregationQuery();

      const normalizedMap = this.normalizeAndGroupPainPoints(rawResults);

      return Array.from(normalizedMap.entries())
        .map(([normalized, data]) => ({
          painPoint: data.canonicalName,
          count: data.count,
          conversionRate: parseFloat(((data.closed / data.count) * 100).toFixed(2)),
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
    } catch (error) {
      this.logger.error('Error getting top pain points:', error);
      throw error;
    }
  }

  /**
   * Execute optimized SQL query using unnest() to expand pain points arrays
   * Aggregates at database level to reduce memory usage and improve performance
   * @private
   */
  private async executePainPointsAggregationQuery(): Promise<PainPointRow[]> {
    return this.prisma.$queryRaw<PainPointRow[]>`
      SELECT 
        unnest("painPoints") as pain_point,
        COUNT(*)::bigint as count,
        SUM(CASE WHEN closed = true THEN 1 ELSE 0 END)::bigint as closed_count
      FROM clients
      WHERE processed = true 
        AND array_length("painPoints", 1) > 0
      GROUP BY pain_point
      ORDER BY count DESC
    `;
  }

  /**
   * Normalize pain points and group by normalized version
   * Finds the most common (canonical) name for each normalized pain point
   * @private
   */
  private normalizeAndGroupPainPoints(
    rawResults: PainPointRow[],
  ): Map<string, { canonicalName: string; nameCount: Map<string, number>; count: number; closed: number }> {
    const normalizePainPoint = (painPoint: string): string => {
      return painPoint
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .replace(/[^\w\s]/g, '')
        .trim();
    };

    const painPointMap = new Map<string, {
      canonicalName: string;
      nameCount: Map<string, number>;
      count: number;
      closed: number;
    }>();

    for (const row of rawResults) {
      const originalName = row.pain_point.trim();
      const normalized = normalizePainPoint(originalName);
      const count = Number(row.count);
      const closed = Number(row.closed_count);

      if (!painPointMap.has(normalized)) {
        painPointMap.set(normalized, {
          canonicalName: originalName,
          nameCount: new Map([[originalName, count]]),
          count: 0,
          closed: 0,
        });
      }

      const entry = painPointMap.get(normalized)!;
      entry.count += count;
      entry.closed += closed;
      
      entry.nameCount.set(originalName, (entry.nameCount.get(originalName) || 0) + count);

      let maxCount = 0;
      let mostCommonName = entry.canonicalName;
      for (const [name, nameCount] of entry.nameCount.entries()) {
        if (nameCount > maxCount) {
          maxCount = nameCount;
          mostCommonName = name;
        }
      }
      entry.canonicalName = mostCommonName;
    }

    return painPointMap;
  }

  /**
   * Get top technical requirements from client interactions
   * Optimized with SQL unnest() to expand arrays and aggregate at database level.
   * 
   * @returns Top 10 technical requirements with counts
   */
  async getTopTechnicalRequirements(): Promise<TechnicalRequirementDto[]> {
    try {
      const rawResults = await this.executeTechnicalRequirementsAggregationQuery();

      return rawResults
        .map((row) => ({
          requirement: row.requirement,
          count: Number(row.count),
        }))
        .slice(0, 10);
    } catch (error) {
      this.logger.error('Error getting top technical requirements:', error);
      throw error;
    }
  }

  /**
   * Execute optimized SQL query using unnest() to expand technical requirements arrays
   * Aggregates at database level to reduce memory usage and improve performance
   * @private
   */
  private async executeTechnicalRequirementsAggregationQuery(): Promise<Array<{ requirement: string; count: bigint }>> {
    return this.prisma.$queryRaw<Array<{ requirement: string; count: bigint }>>`
      SELECT 
        unnest("technicalRequirements") as requirement,
        COUNT(*)::bigint as count
      FROM clients
      WHERE processed = true 
        AND array_length("technicalRequirements", 1) > 0
      GROUP BY requirement
      ORDER BY count DESC
      LIMIT 10
    `;
  }

  /**
   * Get volume vs conversion analysis grouped by interaction volume ranges
   * Optimized with SQL CASE WHEN to group by ranges at database level.
   * 
   * @returns Volume vs conversion data for predefined ranges
   */
  async getVolumeVsConversion(): Promise<VolumeVsConversionDto[]> {
    try {
      const rawResults = await this.executeVolumeRangeAggregationQuery();

      const ranges = ['0-50', '51-100', '101-200', '201-300', '300+'];
      const resultsMap = new Map(
        rawResults.map((row) => [
          row.volume_range,
          {
            count: Number(row.count),
            closed: Number(row.closed_count),
          },
        ])
      );

      return ranges.map((range) => {
        const data = resultsMap.get(range) || { count: 0, closed: 0 };
        return {
          volumeRange: range,
          count: data.count,
          conversionRate:
            data.count > 0
              ? parseFloat(((data.closed / data.count) * 100).toFixed(2))
              : 0,
        };
      });
    } catch (error) {
      this.logger.error('Error getting volume vs conversion:', error);
      throw error;
    }
  }

  /**
   * Execute optimized SQL query using CASE WHEN to group by volume ranges
   * Aggregates at database level to reduce memory usage and improve performance
   * Uses subquery to allow proper ordering by range label
   * @private
   */
  private async executeVolumeRangeAggregationQuery(): Promise<VolumeRangeRow[]> {
    return this.prisma.$queryRaw<VolumeRangeRow[]>`
      SELECT 
        volume_range,
        COUNT(*)::bigint as count,
        SUM(CASE WHEN closed = true THEN 1 ELSE 0 END)::bigint as closed_count
      FROM (
        SELECT 
          CASE 
            WHEN "interactionVolume" BETWEEN 0 AND 50 THEN '0-50'
            WHEN "interactionVolume" BETWEEN 51 AND 100 THEN '51-100'
            WHEN "interactionVolume" BETWEEN 101 AND 200 THEN '101-200'
            WHEN "interactionVolume" BETWEEN 201 AND 300 THEN '201-300'
            WHEN "interactionVolume" > 300 THEN '300+'
          END as volume_range,
          closed
        FROM clients
        WHERE processed = true 
          AND "interactionVolume" IS NOT NULL
      ) as grouped_clients
      GROUP BY volume_range
      ORDER BY 
        CASE volume_range
          WHEN '0-50' THEN 1
          WHEN '51-100' THEN 2
          WHEN '101-200' THEN 3
          WHEN '201-300' THEN 4
          WHEN '300+' THEN 5
        END
    `;
  }
}

