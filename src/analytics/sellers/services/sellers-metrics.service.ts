import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ANALYTICS_CONSTANTS } from '../../../common/constants';
import { SellerMetricsDto } from '../../../common/dto/analytics';

@Injectable()
export class SellersMetricsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get seller metrics including total clients, closed deals, and conversion rates
   * @returns Array of seller metrics sorted by conversion rate (descending)
   */
  async getSellerMetrics(): Promise<SellerMetricsDto[]> {
    const clients = await this.prisma.client.groupBy({
      by: ['assignedSeller'],
      _count: { id: true },
    });

    const sellerMetrics: SellerMetricsDto[] = [];

    for (const seller of clients) {
      const closed = await this.prisma.client.count({
        where: {
          assignedSeller: seller.assignedSeller,
          closed: true,
        },
      });

      sellerMetrics.push({
        seller: seller.assignedSeller,
        total: seller._count.id,
        closed,
        conversionRate: parseFloat(
          ((closed / seller._count.id) * ANALYTICS_CONSTANTS.PERCENTAGE_MULTIPLIER).toFixed(
            ANALYTICS_CONSTANTS.DECIMAL_PLACES,
          ),
        ),
      });
    }

    sellerMetrics.sort((a, b) => b.conversionRate - a.conversionRate);

    return sellerMetrics;
  }
}

