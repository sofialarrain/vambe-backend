import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ANALYTICS_CONSTANTS } from '../../../common/constants';
import { IndustriesToWatchDto } from '../../../common/dto/analytics';

@Injectable()
export class IndustriesAnalysisService {
  private readonly logger = new Logger(IndustriesAnalysisService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get industries to watch based on volume and conversion metrics
   * Identifies expansion opportunities and industries needing strategy review
   * @returns Industries to watch with expansion opportunities and strategy needed
   */
  async getIndustriesToWatch(): Promise<IndustriesToWatchDto> {
    const MIN_CLIENTS_FOR_RELIABILITY = ANALYTICS_CONSTANTS.MIN_CLIENTS_FOR_RELIABILITY;

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
      }
    >();

    for (const client of clients) {
      const industry = client.industry!;

      if (!industryMap.has(industry)) {
        industryMap.set(industry, {
          clients: 0,
          closed: 0,
        });
      }

      const stats = industryMap.get(industry)!;
      stats.clients++;
      if (client.closed) stats.closed++;
    }

    const allIndustriesMapped = Array.from(industryMap.entries()).map(([industry, stats]) => ({
      industry,
      clients: stats.clients,
      closed: stats.closed,
      conversionRate: parseFloat(
        ((stats.closed / stats.clients) * ANALYTICS_CONSTANTS.PERCENTAGE_MULTIPLIER).toFixed(
          ANALYTICS_CONSTANTS.DECIMAL_PLACES,
        ),
      ),
    }));

    this.logger.debug(`Total industries found: ${allIndustriesMapped.length}`);

    const industries = allIndustriesMapped.filter((i) => i.clients >= MIN_CLIENTS_FOR_RELIABILITY);

    this.logger.debug(`Industries with ${MIN_CLIENTS_FOR_RELIABILITY}+ clients: ${industries.length}`);

    if (industries.length === 0) {
      this.logger.warn('No industries meet minimum reliability threshold');
      return {
        expansionOpportunities: [],
        strategyNeeded: [],
      };
    }

    const avgConversionRate =
      industries.length > 0
        ? industries.reduce((sum, i) => sum + i.conversionRate, 0) / industries.length
        : 0;

    const clientCountsSorted = industries.map((i) => i.clients).sort((a, b) => a - b);
    const conversionRatesSorted = industries.map((i) => i.conversionRate).sort((a, b) => a - b);

    const lowVolumeThreshold =
      clientCountsSorted.length > 0
        ? clientCountsSorted[
            Math.floor(clientCountsSorted.length * ANALYTICS_CONSTANTS.PERCENTILES.LOW)
          ]
        : 0;

    const highVolumeThreshold =
      clientCountsSorted.length > 0
        ? clientCountsSorted[
            Math.floor(clientCountsSorted.length * ANALYTICS_CONSTANTS.PERCENTILES.HIGH)
          ]
        : 0;

    const highConversionThreshold =
      conversionRatesSorted.length > 0
        ? conversionRatesSorted[
            Math.floor(conversionRatesSorted.length * ANALYTICS_CONSTANTS.PERCENTILES.HIGH)
          ]
        : Math.max(
            ANALYTICS_CONSTANTS.CONVERSION.HIGH_THRESHOLD_MIN,
            avgConversionRate + ANALYTICS_CONSTANTS.CONVERSION.THRESHOLD_ADJUSTMENT,
          );

    const lowConversionThreshold =
      conversionRatesSorted.length > 0
        ? conversionRatesSorted[
            Math.floor(conversionRatesSorted.length * ANALYTICS_CONSTANTS.PERCENTILES.LOW)
          ]
        : Math.min(
            ANALYTICS_CONSTANTS.CONVERSION.LOW_THRESHOLD_MAX,
            avgConversionRate - ANALYTICS_CONSTANTS.CONVERSION.THRESHOLD_ADJUSTMENT,
          );

    this.logger.debug(
      `Thresholds - Low volume: ${lowVolumeThreshold}, High volume: ${highVolumeThreshold}, High conversion: ${highConversionThreshold.toFixed(2)}%, Low conversion: ${lowConversionThreshold.toFixed(2)}%`,
    );

    const expansionOpportunities = industries
      .filter((i) => i.clients <= lowVolumeThreshold && i.conversionRate >= highConversionThreshold)
      .sort((a, b) => b.conversionRate - a.conversionRate);

    const strategyNeeded = industries
      .filter((i) => i.clients >= highVolumeThreshold && i.conversionRate <= lowConversionThreshold)
      .sort((a, b) => b.clients - a.clients);

    this.logger.debug(
      `Found ${expansionOpportunities.length} expansion opportunities and ${strategyNeeded.length} industries needing strategy review`,
    );

    return {
      expansionOpportunities: expansionOpportunities.slice(
        0,
        ANALYTICS_CONSTANTS.LIMITS.TOP_INDUSTRIES,
      ),
      strategyNeeded: strategyNeeded.slice(0, ANALYTICS_CONSTANTS.LIMITS.TOP_INDUSTRIES),
    };
  }
}

