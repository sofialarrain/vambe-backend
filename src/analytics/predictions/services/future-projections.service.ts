import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { getSimulatedCurrentDate } from '../../../common/utils/date.utils';
import { ANALYTICS_CONSTANTS } from '../../../common/constants';
import { FutureProjectionDto } from '../../../common/dto/analytics';

@Injectable()
export class FutureProjectionsService {
  private readonly logger = new Logger(FutureProjectionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get future projection for next week and next month
   * Analyzes historical data to predict future closed deals and meetings
   * @returns Future projection with estimates, confidence levels, and trends
   */
  async getFutureProjection(): Promise<FutureProjectionDto> {
    try {
      const clients = await this.prisma.client.findMany({
        select: {
          meetingDate: true,
          closed: true,
        },
        orderBy: {
          meetingDate: 'asc',
        },
      });

      if (clients.length === 0) {
        return this.getEmptyProjection('Insufficient data for projection.');
      }

      const weeklyData = this.calculateWeeklyData(clients);
      const weeksArray = this.getRecentWeeksArray(weeklyData);

      if (weeksArray.length < 2) {
        return this.getFallbackProjection(weeksArray);
      }

      const now = getSimulatedCurrentDate();
      const currentMonthData = this.getCurrentMonthData(clients, now);
      const previousMonthData = this.getPreviousMonthData(clients, now);

      const projections = this.calculateProjections(
        weeksArray,
        currentMonthData,
        previousMonthData,
        now,
      );

      const timelineData = this.buildTimelineData(currentMonthData, projections, now);

      return {
        nextWeek: projections.nextWeek,
        nextMonth: projections.nextMonth,
        message: this.buildProjectionMessage(
          currentMonthData,
          previousMonthData,
          projections,
        ),
        dataPoints: weeksArray.length,
        timelineData,
      };
    } catch (error) {
      this.logger.error('Error getting future projection:', error);
      return {
        nextWeek: {
          estimatedClosed: 0,
          estimatedMeetings: 0,
          confidence: 'low',
          trend: 'neutral',
        },
        nextMonth: {
          estimatedClosed: 0,
          estimatedMeetings: 0,
          confidence: 'low',
          trend: 'neutral',
        },
        message: 'Unable to generate projection at this time.',
      };
    }
  }

  /**
   * Calculate weekly data from clients
   */
  private calculateWeeklyData(
    clients: Array<{ meetingDate: Date; closed: boolean }>,
  ): Map<string, { total: number; closed: number }> {
    const weeklyData = new Map<string, { total: number; closed: number }>();

    clients.forEach((client) => {
      const date = new Date(client.meetingDate);
      const year = date.getFullYear();
      const startOfYear = new Date(year, 0, 1);
      const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
      const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
      const weekKey = `${year}-W${String(weekNumber).padStart(2, '0')}`;

      if (!weeklyData.has(weekKey)) {
        weeklyData.set(weekKey, { total: 0, closed: 0 });
      }

      const weekData = weeklyData.get(weekKey)!;
      weekData.total++;
      if (client.closed) {
        weekData.closed++;
      }
    });

    return weeklyData;
  }

  /**
   * Get recent weeks array from weekly data
   */
  private getRecentWeeksArray(
    weeklyData: Map<string, { total: number; closed: number }>,
  ): Array<{ week: string; closed: number; total: number }> {
    return Array.from(weeklyData.entries())
      .map(([week, data]) => ({
        week,
        closed: data.closed,
        total: data.total,
      }))
      .sort((a, b) => a.week.localeCompare(b.week))
      .slice(-4);
  }

  /**
   * Get current month data
   */
  private getCurrentMonthData(
    clients: Array<{ meetingDate: Date; closed: boolean }>,
    now: Date,
  ): {
    meetings: number;
    closed: number;
    dailyAvg: { meetings: number; closed: number };
    dailyData: Map<number, { meetings: number; closed: number }>;
  } {
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    const currentMonthClients = clients.filter((client) => {
      const date = new Date(client.meetingDate);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });

    const closed = currentMonthClients.filter((c) => c.closed).length;
    const meetings = currentMonthClients.length;

    const dailyData = new Map<number, { meetings: number; closed: number }>();
    currentMonthClients.forEach((client) => {
      const date = new Date(client.meetingDate);
      const day = date.getDate();
      if (!dailyData.has(day)) {
        dailyData.set(day, { meetings: 0, closed: 0 });
      }
      const dayData = dailyData.get(day)!;
      dayData.meetings++;
      if (client.closed) {
        dayData.closed++;
      }
    });

    return {
      meetings,
      closed,
      dailyAvg: {
        meetings: meetings / daysInCurrentMonth,
        closed: closed / daysInCurrentMonth,
      },
      dailyData,
    };
  }

  /**
   * Get previous month data
   */
  private getPreviousMonthData(
    clients: Array<{ meetingDate: Date; closed: boolean }>,
    now: Date,
  ): { dailyAvg: { meetings: number; closed: number } } {
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const previousMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const daysInPreviousMonth = new Date(previousMonthYear, previousMonth + 1, 0).getDate();

    const previousMonthClients = clients.filter((client) => {
      const date = new Date(client.meetingDate);
      return date.getMonth() === previousMonth && date.getFullYear() === previousMonthYear;
    });

    const closed = previousMonthClients.filter((c) => c.closed).length;
    const meetings = previousMonthClients.length;

    return {
      dailyAvg: {
        meetings: meetings / daysInPreviousMonth,
        closed: closed / daysInPreviousMonth,
      },
    };
  }

  /**
   * Calculate trend based on comparison
   */
  private calculateTrend(
    current: number,
    previous: number,
    threshold: number = ANALYTICS_CONSTANTS.TREND.DEFAULT_THRESHOLD,
  ): 'increasing' | 'decreasing' | 'stable' | 'neutral' {
    if (previous === 0) {
      return current > 0 ? 'increasing' : 'neutral';
    }
    const change = (current - previous) / previous;
    if (change > threshold) {
      return 'increasing';
    } else if (change < -threshold) {
      return 'decreasing';
    }
    return 'stable';
  }

  /**
   * Calculate projections based on historical data
   */
  private calculateProjections(
    weeksArray: Array<{ week: string; closed: number; total: number }>,
    currentMonthData: { dailyAvg: { meetings: number; closed: number } },
    previousMonthData: { dailyAvg: { meetings: number; closed: number } },
    now: Date,
  ): {
    nextWeek: {
      estimatedClosed: number;
      estimatedMeetings: number;
      confidence: 'high' | 'medium' | 'low';
      trend: 'increasing' | 'decreasing' | 'stable' | 'neutral';
      trendClosed: 'increasing' | 'decreasing' | 'stable' | 'neutral';
      trendMeetings: 'increasing' | 'decreasing' | 'stable' | 'neutral';
    };
    nextMonth: {
      estimatedClosed: number;
      estimatedMeetings: number;
      confidence: 'high' | 'medium' | 'low';
      trend: 'increasing' | 'decreasing' | 'stable' | 'neutral';
      trendClosed: 'increasing' | 'decreasing' | 'stable' | 'neutral';
      trendMeetings: 'increasing' | 'decreasing' | 'stable' | 'neutral';
    };
  } {
    const avgClosed = weeksArray.reduce((sum, w) => sum + w.closed, 0) / weeksArray.length;
    const avgTotal = weeksArray.reduce((sum, w) => sum + w.total, 0) / weeksArray.length;

    const monthlyClosedTrend = this.calculateTrend(
      currentMonthData.dailyAvg.closed,
      previousMonthData.dailyAvg.closed,
      0.05,
    );
    const monthlyMeetingsTrend = this.calculateTrend(
      currentMonthData.dailyAvg.meetings,
      previousMonthData.dailyAvg.meetings,
      0.05,
    );

    const closedTrendMultiplier =
      monthlyClosedTrend === 'increasing' ? 1.05 : monthlyClosedTrend === 'decreasing' ? 0.95 : 1.0;
    const meetingsTrendMultiplier =
      monthlyMeetingsTrend === 'increasing'
        ? 1.05
        : monthlyMeetingsTrend === 'decreasing'
          ? 0.95
          : 1.0;

    const projectedDailyClosed = currentMonthData.dailyAvg.closed * closedTrendMultiplier;
    const projectedDailyMeetings = currentMonthData.dailyAvg.meetings * meetingsTrendMultiplier;

    const variance =
      weeksArray.reduce((sum, w) => sum + Math.pow(w.closed - avgClosed, 2), 0) / weeksArray.length;
    const stdDev = Math.sqrt(variance);
    const coefficientOfVariation = avgClosed > 0 ? stdDev / avgClosed : 1;

    let confidence: 'high' | 'medium' | 'low' = 'medium';
    if (coefficientOfVariation < ANALYTICS_CONSTANTS.VARIANCE.LOW_VARIANCE_THRESHOLD) {
      confidence = 'high';
    } else if (coefficientOfVariation > ANALYTICS_CONSTANTS.VARIANCE.LOW_VARIANCE_THRESHOLD * 2) {
      confidence = 'low';
    }

    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
    const nextMonthYear = currentMonth === 11 ? currentYear + 1 : currentYear;
    const daysInNextMonth = new Date(nextMonthYear, nextMonth + 1, 0).getDate();

    const daysInNextWeek = 7;
    const nextWeekEstimate = Math.round(projectedDailyClosed * daysInNextWeek);
    const nextMonthEstimate = Math.round(projectedDailyClosed * daysInNextMonth);
    const nextWeekMeetingsEstimate = Math.round(projectedDailyMeetings * daysInNextWeek);
    const nextMonthMeetingsEstimate = Math.round(projectedDailyMeetings * daysInNextMonth);

    return {
      nextWeek: {
        estimatedClosed: nextWeekEstimate,
        estimatedMeetings: nextWeekMeetingsEstimate,
        confidence,
        trend: monthlyClosedTrend,
        trendClosed: monthlyClosedTrend,
        trendMeetings: monthlyMeetingsTrend,
      },
      nextMonth: {
        estimatedClosed: nextMonthEstimate,
        estimatedMeetings: nextMonthMeetingsEstimate,
        confidence,
        trend: monthlyClosedTrend,
        trendClosed: monthlyClosedTrend,
        trendMeetings: monthlyMeetingsTrend,
      },
    };
  }

  /**
   * Build timeline data for current and projected periods
   */
  private buildTimelineData(
    currentMonthData: {
      meetings: number;
      closed: number;
      dailyAvg: { meetings: number; closed: number };
      dailyData: Map<number, { meetings: number; closed: number }>;
    },
    projections: {
      nextWeek: { estimatedClosed: number; estimatedMeetings: number };
      nextMonth: { estimatedClosed: number; estimatedMeetings: number };
    },
    now: Date,
  ): Array<{ date: string; period: 'current' | 'projected'; meetings: number; closed: number }> {
    const timelineData: Array<{
      date: string;
      period: 'current' | 'projected';
      meetings: number;
      closed: number;
    }> = [];

    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
    const nextMonthYear = currentMonth === 11 ? currentYear + 1 : currentYear;
    const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInNextMonth = new Date(nextMonthYear, nextMonth + 1, 0).getDate();

    for (let day = 1; day <= daysInCurrentMonth; day++) {
      const dayData = currentMonthData.dailyData.get(day) || { meetings: 0, closed: 0 };
      const date = new Date(currentYear, currentMonth, day);
      timelineData.push({
        date: date.toISOString().split('T')[0],
        period: 'current',
        meetings: dayData.meetings,
        closed: dayData.closed,
      });
    }

    const projectedDailyClosed = projections.nextMonth.estimatedClosed / daysInNextMonth;
    const projectedDailyMeetings = projections.nextMonth.estimatedMeetings / daysInNextMonth;

    for (let day = 1; day <= daysInNextMonth; day++) {
      const date = new Date(nextMonthYear, nextMonth, day);
      timelineData.push({
        date: date.toISOString().split('T')[0],
        period: 'projected',
        meetings: Math.round(projectedDailyMeetings),
        closed: Math.round(projectedDailyClosed),
      });
    }

    return timelineData;
  }

  /**
   * Build projection message with trends and estimates
   */
  private buildProjectionMessage(
    currentMonthData: { dailyAvg: { meetings: number; closed: number } },
    previousMonthData: { dailyAvg: { meetings: number; closed: number } },
    projections: {
      nextWeek: { estimatedClosed: number; estimatedMeetings: number };
      nextMonth: { estimatedClosed: number; estimatedMeetings: number };
    },
  ): string {
    const trendPercentage =
      previousMonthData.dailyAvg.closed > 0
        ? ((currentMonthData.dailyAvg.closed - previousMonthData.dailyAvg.closed) /
            previousMonthData.dailyAvg.closed) *
          100
        : currentMonthData.dailyAvg.closed > 0
          ? 100
          : 0;

    const trendDirection =
      trendPercentage > 5 ? 'increasing' : trendPercentage < -5 ? 'decreasing' : 'stable';

    const meetingsTrendPercentage =
      previousMonthData.dailyAvg.meetings > 0
        ? ((currentMonthData.dailyAvg.meetings - previousMonthData.dailyAvg.meetings) /
            previousMonthData.dailyAvg.meetings) *
          100
        : currentMonthData.dailyAvg.meetings > 0
          ? 100
          : 0;

    const meetingsTrendDirection =
      meetingsTrendPercentage > 5
        ? 'increasing'
        : meetingsTrendPercentage < -5
          ? 'decreasing'
          : 'stable';

    let message = '';

    if (trendDirection === 'increasing' && Math.abs(trendPercentage) >= 5) {
      message += `Based on current month showing a ${Math.abs(trendPercentage).toFixed(1)}% increase in closed deals compared to last month`;
    } else if (trendDirection === 'decreasing' && Math.abs(trendPercentage) >= 5) {
      message += `Based on current month showing a ${Math.abs(trendPercentage).toFixed(1)}% decrease in closed deals compared to last month`;
    } else if (
      currentMonthData.dailyAvg.closed === 0 &&
      previousMonthData.dailyAvg.closed === 0
    ) {
      message += `Based on current month data showing no closed deals (same as last month)`;
    } else if (currentMonthData.dailyAvg.closed === 0 && previousMonthData.dailyAvg.closed > 0) {
      message += `Based on current month showing no closed deals (down from ${previousMonthData.dailyAvg.closed.toFixed(2)} per day last month)`;
    } else if (
      currentMonthData.dailyAvg.closed > 0 &&
      previousMonthData.dailyAvg.closed === 0
    ) {
      message += `Based on current month showing ${currentMonthData.dailyAvg.closed.toFixed(2)} closed deals per day (up from none last month)`;
    } else {
      message += `Based on current month performance (${currentMonthData.dailyAvg.closed.toFixed(2)} closed deals per day)`;
    }

    if (meetingsTrendDirection === 'increasing' && Math.abs(meetingsTrendPercentage) >= 5) {
      message += ` and a ${Math.abs(meetingsTrendPercentage).toFixed(1)}% increase in meetings compared to last month`;
    } else if (meetingsTrendDirection === 'decreasing' && Math.abs(meetingsTrendPercentage) >= 5) {
      message += ` and a ${Math.abs(meetingsTrendPercentage).toFixed(1)}% decrease in meetings compared to last month`;
    } else if (
      currentMonthData.dailyAvg.meetings === 0 &&
      previousMonthData.dailyAvg.meetings === 0
    ) {
      message += ` (no meetings, same as last month)`;
    } else if (
      currentMonthData.dailyAvg.meetings === 0 &&
      previousMonthData.dailyAvg.meetings > 0
    ) {
      message += ` (no meetings, down from ${previousMonthData.dailyAvg.meetings.toFixed(2)} per day last month)`;
    } else if (
      currentMonthData.dailyAvg.meetings > 0 &&
      previousMonthData.dailyAvg.meetings === 0
    ) {
      message += ` (${currentMonthData.dailyAvg.meetings.toFixed(2)} meetings per day, up from none last month)`;
    } else {
      message += ` (${currentMonthData.dailyAvg.meetings.toFixed(2)} meetings per day)`;
    }

    message += `, we estimate ${projections.nextWeek.estimatedClosed} closed deals and ${projections.nextWeek.estimatedMeetings} meetings next week, and ${projections.nextMonth.estimatedClosed} closed deals and ${projections.nextMonth.estimatedMeetings} meetings next month.`;

    return message;
  }

  /**
   * Get empty projection when no data is available
   */
  private getEmptyProjection(message: string): FutureProjectionDto {
    return {
      nextWeek: {
        estimatedClosed: 0,
        estimatedMeetings: 0,
        confidence: 'low',
        trend: 'neutral',
      },
      nextMonth: {
        estimatedClosed: 0,
        estimatedMeetings: 0,
        confidence: 'low',
        trend: 'neutral',
      },
      message,
    };
  }

  /**
   * Get fallback projection when insufficient data
   */
  private getFallbackProjection(
    weeksArray: Array<{ week: string; closed: number; total: number }>,
  ): FutureProjectionDto {
    const fallbackMeetings = weeksArray.length > 0 ? Math.round(weeksArray[0].total) : 0;
    return {
      nextWeek: {
        estimatedClosed: weeksArray.length > 0 ? Math.round(weeksArray[0].closed) : 0,
        estimatedMeetings: fallbackMeetings,
        confidence: 'low',
        trend: 'neutral',
      },
      nextMonth: {
        estimatedClosed: weeksArray.length > 0 ? Math.round(weeksArray[0].closed * 4) : 0,
        estimatedMeetings: fallbackMeetings * 4,
        confidence: 'low',
        trend: 'neutral',
      },
      message: 'Limited data available. Projection based on recent average.',
    };
  }
}

