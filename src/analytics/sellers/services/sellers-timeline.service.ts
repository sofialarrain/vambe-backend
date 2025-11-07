import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { API_CONSTANTS } from '../../../common/constants';
import { SellerTimelineDataDto } from '../../../common/dto/analytics';

@Injectable()
export class SellersTimelineService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get sellers timeline data grouped by week or month
   * @param granularity - Time granularity: 'week' or 'month'
   * @returns Timeline data with seller performance over time periods
   */
  async getSellersTimeline(granularity: 'week' | 'month' = 'week'): Promise<SellerTimelineDataDto[]> {
    const clients = await this.prisma.client.findMany({
      where: { closed: true },
      orderBy: { meetingDate: 'asc' },
    });

    const sellers = [
      ...new Set(
        clients.map((c) => c.assignedSeller).filter((seller): seller is string => seller !== null),
      ),
    ];
    const grouped = new Map<string, Record<string, number>>();

    for (const client of clients) {
      if (!client.assignedSeller) {
        continue;
      }

      let dateKey: string;
      const date = new Date(client.meetingDate);

      if (granularity === 'week') {
        const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
        const pastDaysOfYear =
          (date.getTime() - firstDayOfYear.getTime()) / API_CONSTANTS.TIME.MILLISECONDS_PER_DAY;
        const weekNumber = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
        dateKey = `${date.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;
      } else {
        dateKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      }

      if (!grouped.has(dateKey)) {
        const entry: Record<string, number> = {};
        sellers.forEach((seller) => {
          entry[seller] = 0;
        });
        grouped.set(dateKey, entry);
      }

      const entry = grouped.get(dateKey)!;
      entry[client.assignedSeller] = (entry[client.assignedSeller] || 0) + 1;
    }

    return Array.from(grouped.entries())
      .map(([period, sellers]) => ({
        period,
        sellers,
      }))
      .sort((a, b) => a.period.localeCompare(b.period));
  }
}

