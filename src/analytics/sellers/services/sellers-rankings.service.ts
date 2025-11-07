import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { getSimulatedCurrentDate, getSimulatedCurrentYear } from '../../../common/utils/date.utils';
import { ANALYTICS_CONSTANTS } from '../../../common/constants';
import { WeekPodiumDto, AnnualSellerRankingDto } from '../../../common/dto/analytics';

@Injectable()
export class SellersRankingsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get seller of the week based on closed deals in a specific week
   * @param weekStart - Optional start date of the week (ISO string) or 'current' for current week
   * @param year - Optional year filter
   * @returns Week podium with top sellers and week range
   */
  async getSellerOfWeek(weekStart?: string, year?: number): Promise<WeekPodiumDto> {
    let weekStartDate: Date;
    let weekEndDate: Date;

    if (weekStart && weekStart !== 'current') {
      weekStartDate = new Date(weekStart);
      weekStartDate.setHours(0, 0, 0, 0);
    } else {
      const now = getSimulatedCurrentDate();
      const dayOfWeek = now.getDay();
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      weekStartDate = new Date(now);
      weekStartDate.setDate(now.getDate() + diff);
      weekStartDate.setHours(0, 0, 0, 0);
    }

    weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekStartDate.getDate() + 7);
    weekEndDate.setHours(23, 59, 59, 999);

    const whereClause: Prisma.ClientWhereInput = {
      meetingDate: {
        gte: weekStartDate,
        lte: weekEndDate,
      },
    };

    if (year) {
      const yearStart = new Date(year, 0, 1);
      const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999);
      whereClause.meetingDate = {
        gte: weekStartDate > yearStart ? weekStartDate : yearStart,
        lte: weekEndDate < yearEnd ? weekEndDate : yearEnd,
      };
    }

    const clients = await this.prisma.client.findMany({
      where: whereClause,
    });

    const sellerStats = new Map<string, { total: number; closed: number }>();

    for (const client of clients) {
      if (!sellerStats.has(client.assignedSeller)) {
        sellerStats.set(client.assignedSeller, { total: 0, closed: 0 });
      }
      const stats = sellerStats.get(client.assignedSeller)!;
      stats.total++;
      if (client.closed) stats.closed++;
    }

    const sellers = Array.from(sellerStats.entries())
      .map(([seller, stats]) => ({
        seller,
        closed: stats.closed,
        total: stats.total,
        conversionRate: parseFloat(
          ((stats.closed / stats.total) * ANALYTICS_CONSTANTS.PERCENTAGE_MULTIPLIER).toFixed(
            ANALYTICS_CONSTANTS.DECIMAL_PLACES,
          ),
        ),
      }))
      .sort((a, b) => b.closed - a.closed)
      .slice(0, ANALYTICS_CONSTANTS.LIMITS.TOP_SELLERS);

    const weekRange = {
      start: weekStartDate.toISOString().split('T')[0],
      end: new Date(weekEndDate.getTime() - 1).toISOString().split('T')[0],
    };

    return {
      weekPodium: sellers,
      weekRange,
    };
  }

  /**
   * Get annual seller ranking for a specific year
   * @param year - Optional year (defaults to current year)
   * @returns Annual ranking with sellers sorted by closed deals
   */
  async getAnnualSellerRanking(year?: number): Promise<AnnualSellerRankingDto> {
    const selectedYear = year || getSimulatedCurrentYear();
    const yearStart = new Date(selectedYear, 0, 1);
    const yearEnd = new Date(selectedYear, 11, 31, 23, 59, 59, 999);

    const clients = await this.prisma.client.findMany({
      where: {
        meetingDate: {
          gte: yearStart,
          lte: yearEnd,
        },
        closed: true,
      },
    });

    const sellerStats = new Map<string, { closed: number; total: number }>();

    for (const client of clients) {
      if (!sellerStats.has(client.assignedSeller)) {
        sellerStats.set(client.assignedSeller, { closed: 0, total: 0 });
      }
      const stats = sellerStats.get(client.assignedSeller)!;
      stats.closed++;
    }

    const allYearClients = await this.prisma.client.findMany({
      where: {
        meetingDate: {
          gte: yearStart,
          lte: yearEnd,
        },
      },
    });

    for (const client of allYearClients) {
      if (sellerStats.has(client.assignedSeller)) {
        sellerStats.get(client.assignedSeller)!.total++;
      }
    }

    const ranking = Array.from(sellerStats.entries())
      .map(([seller, stats]) => ({
        seller,
        closed: stats.closed,
        total: stats.total,
        conversionRate:
          stats.total > 0 ? parseFloat(((stats.closed / stats.total) * 100).toFixed(2)) : 0,
      }))
      .sort((a, b) => b.closed - a.closed);

    return {
      year: selectedYear,
      ranking,
    };
  }
}

