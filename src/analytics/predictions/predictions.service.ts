import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PredictionsGeneratorService } from '../../llm/generators/predictions-generator.service';
import { getSimulatedCurrentDate } from '../../common/utils/date.utils';
import { ANALYTICS_CONSTANTS } from '../../common/constants';
import {
  ConversionPredictionDto,
  FutureProjectionDto,
} from '../../common/dto/analytics';

@Injectable()
export class PredictionsService {
  private readonly logger = new Logger(PredictionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly predictionsGenerator: PredictionsGeneratorService,
  ) {}

  async getConversionPredictions(): Promise<ConversionPredictionDto[]> {
    try {
      const openDeals = await this.prisma.client.findMany({
        where: {
          processed: true,
          closed: false,
        },
        select: {
          name: true,
          industry: true,
          sentiment: true,
          urgencyLevel: true,
          painPoints: true,
          technicalRequirements: true,
          assignedSeller: true,
          discoverySource: true,
          operationSize: true,
          interactionVolume: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: ANALYTICS_CONSTANTS.LIMITS.RECENT_WEEKS,
      });

      if (openDeals.length === 0) {
        return [];
      }

      const mappedDeals = openDeals.map(deal => ({
        clientName: deal.name,
        industry: deal.industry || 'Unknown',
        sentiment: deal.sentiment || 'Unknown',
        urgencyLevel: deal.urgencyLevel || 'Unknown',
        painPoints: deal.painPoints,
        technicalRequirements: deal.technicalRequirements,
        seller: deal.assignedSeller,
        discoverySource: deal.discoverySource || 'Unknown',
        operationSize: deal.operationSize || 'Unknown',
        interactionVolume: deal.interactionVolume || 0,
      }));

      const predictions = await this.predictionsGenerator.generateConversionPredictions(mappedDeals);

      return predictions.map(prediction => {
        const client = mappedDeals.find(d => d.clientName === prediction.clientName);
        return {
          ...prediction,
          industry: client?.industry || 'Unknown',
          seller: client?.seller || 'Unknown',
          urgencyLevel: client?.urgencyLevel || 'Unknown',
        };
      });
    } catch (error) {
      this.logger.error('Error getting conversion predictions:', error);
      return [];
    }
  }

  async getFutureProjection(): Promise<FutureProjectionDto> {
    try {
      const clients = await this.prisma.client.findMany({
        where: {
          processed: true,
        },
        select: {
          meetingDate: true,
          closed: true,
        },
        orderBy: {
          meetingDate: 'asc',
        },
      });

      if (clients.length === 0) {
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
          message: 'Insufficient data for projection.',
        };
      }

      const weeklyData = new Map<string, { total: number; closed: number }>();
      
      clients.forEach(client => {
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

      const weeksArray = Array.from(weeklyData.entries())
        .map(([week, data]) => ({
          week,
          closed: data.closed,
          total: data.total,
        }))
        .sort((a, b) => a.week.localeCompare(b.week))
        .slice(-4);

      if (weeksArray.length < 2) {
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

      const avgClosed = weeksArray.reduce((sum, w) => sum + w.closed, 0) / weeksArray.length;
      const avgTotal = weeksArray.reduce((sum, w) => sum + w.total, 0) / weeksArray.length;
      
      // Helper function to calculate trend based on comparison
      const calculateTrend = (current: number, previous: number, threshold: number = ANALYTICS_CONSTANTS.TREND.DEFAULT_THRESHOLD): 'increasing' | 'decreasing' | 'stable' | 'neutral' => {
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
      };
      
      // Calculate trends for closed deals
      const recentWeeksClosed = weeksArray.slice(-2);
      const olderWeeksClosed = weeksArray.slice(0, -2);
      const recentAvgClosed = recentWeeksClosed.reduce((sum, w) => sum + w.closed, 0) / recentWeeksClosed.length;
      const olderAvgClosed = olderWeeksClosed.length > 0 
        ? olderWeeksClosed.reduce((sum, w) => sum + w.closed, 0) / olderWeeksClosed.length 
        : recentAvgClosed;
      
      // Calculate trends for meetings
      const recentWeeksTotal = weeksArray.slice(-2);
      const olderWeeksTotal = weeksArray.slice(0, -2);
      const recentAvgTotal = recentWeeksTotal.reduce((sum, w) => sum + w.total, 0) / recentWeeksTotal.length;
      const olderAvgTotal = olderWeeksTotal.length > 0 
        ? olderWeeksTotal.reduce((sum, w) => sum + w.total, 0) / olderWeeksTotal.length 
        : recentAvgTotal;
      
      const closedTrend = calculateTrend(recentAvgClosed, olderAvgClosed, avgClosed > 0 ? ANALYTICS_CONSTANTS.TREND.DEFAULT_THRESHOLD : ANALYTICS_CONSTANTS.TREND.HIGH_VARIANCE_THRESHOLD);
      const meetingsTrend = calculateTrend(recentAvgTotal, olderAvgTotal, avgTotal > 0 ? ANALYTICS_CONSTANTS.TREND.DEFAULT_THRESHOLD : ANALYTICS_CONSTANTS.TREND.HIGH_VARIANCE_THRESHOLD);

      const weights = ANALYTICS_CONSTANTS.PREDICTION_WEIGHTS;
      const weightedSum = weeksArray.reduce((sum, w, idx) => {
        const weight = weights[weeksArray.length - 1 - idx] || 0.25;
        return sum + (w.closed * weight);
      }, 0);
      const weightedAvg = weightedSum / weights.slice(0, weeksArray.length).reduce((a, b) => a + b, 0);

      const nextWeekEstimate = Math.round(weightedAvg);
      const nextMonthEstimate = Math.round(weightedAvg * ANALYTICS_CONSTANTS.TIME.WEEKS_PER_MONTH);

      const variance = weeksArray.reduce((sum, w) => {
        return sum + Math.pow(w.closed - avgClosed, 2);
      }, 0) / weeksArray.length;
      const stdDev = Math.sqrt(variance);
      const coefficientOfVariation = avgClosed > 0 ? stdDev / avgClosed : 1;
      
      let confidence: 'high' | 'medium' | 'low' = 'medium';
      if (coefficientOfVariation < ANALYTICS_CONSTANTS.VARIANCE.LOW_VARIANCE_THRESHOLD) {
        confidence = 'high';
      } else if (coefficientOfVariation > ANALYTICS_CONSTANTS.VARIANCE.LOW_VARIANCE_THRESHOLD * 2) {
        confidence = 'low';
      }

      const now = getSimulatedCurrentDate();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
      const nextMonthYear = currentMonth === 11 ? currentYear + 1 : currentYear;
      
      const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
      const daysInNextMonth = new Date(nextMonthYear, nextMonth + 1, 0).getDate();
      
      const currentMonthData = new Map<number, { meetings: number; closed: number }>();
      const currentMonthClients = clients.filter(client => {
        const date = new Date(client.meetingDate);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
      });
      
      currentMonthClients.forEach(client => {
        const date = new Date(client.meetingDate);
        const day = date.getDate();
        if (!currentMonthData.has(day)) {
          currentMonthData.set(day, { meetings: 0, closed: 0 });
        }
        const dayData = currentMonthData.get(day)!;
        dayData.meetings++;
        if (client.closed) {
          dayData.closed++;
        }
      });
      
      const avgDailyMeetings = currentMonthClients.length / daysInCurrentMonth;
      const avgDailyClosed = currentMonthClients.filter(c => c.closed).length / daysInCurrentMonth;
      
      const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const previousMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      const daysInPreviousMonth = new Date(previousMonthYear, previousMonth + 1, 0).getDate();
      const previousMonthClients = clients.filter(client => {
        const date = new Date(client.meetingDate);
        return date.getMonth() === previousMonth && date.getFullYear() === previousMonthYear;
      });
      const avgDailyClosedPreviousMonth = previousMonthClients.filter(c => c.closed).length / daysInPreviousMonth;
      const avgDailyMeetingsPreviousMonth = previousMonthClients.length / daysInPreviousMonth;
      
      // Calculate monthly trends for more accurate projections
      const monthlyClosedTrend = calculateTrend(avgDailyClosed, avgDailyClosedPreviousMonth, 0.05);
      const monthlyMeetingsTrend = calculateTrend(avgDailyMeetings, avgDailyMeetingsPreviousMonth, 0.05);
      
      // Use monthly trends for projections (more accurate than weekly trends)
      const closedTrendMultiplier = monthlyClosedTrend === 'increasing' ? 1.05 : monthlyClosedTrend === 'decreasing' ? 0.95 : 1.0;
      const meetingsTrendMultiplier = monthlyMeetingsTrend === 'increasing' ? 1.05 : monthlyMeetingsTrend === 'decreasing' ? 0.95 : 1.0;
      
      const projectedDailyClosed = avgDailyClosed * closedTrendMultiplier;
      const projectedDailyMeetings = avgDailyMeetings * meetingsTrendMultiplier;
      
      let trendPercentage = 0;
      let trendDirection = 'stable';
      if (avgDailyClosedPreviousMonth > 0) {
        trendPercentage = ((avgDailyClosed - avgDailyClosedPreviousMonth) / avgDailyClosedPreviousMonth) * 100;
        if (trendPercentage > 5) {
          trendDirection = 'increasing';
        } else if (trendPercentage < -5) {
          trendDirection = 'decreasing';
        }
      } else if (avgDailyClosed > 0) {
        trendPercentage = 100;
        trendDirection = 'increasing';
      } else if (avgDailyClosedPreviousMonth > 0 && avgDailyClosed === 0) {
        trendPercentage = -100;
        trendDirection = 'decreasing';
      }
      
      const daysInNextWeek = 7;
      const nextWeekEstimateDaily = Math.round(projectedDailyClosed * daysInNextWeek);
      const nextMonthEstimateDaily = Math.round(projectedDailyClosed * daysInNextMonth);
      const nextWeekMeetingsEstimate = Math.round(projectedDailyMeetings * daysInNextWeek);
      const nextMonthMeetingsEstimate = Math.round(projectedDailyMeetings * daysInNextMonth);
      
      const finalNextWeekEstimate = nextWeekEstimateDaily;
      const finalNextMonthEstimate = nextMonthEstimateDaily;
      
      const timelineData: Array<{
        date: string;
        period: 'current' | 'projected';
        meetings: number;
        closed: number;
      }> = [];
      
      for (let day = 1; day <= daysInCurrentMonth; day++) {
        const dayData = currentMonthData.get(day) || { meetings: 0, closed: 0 };
        const date = new Date(currentYear, currentMonth, day);
        timelineData.push({
          date: date.toISOString().split('T')[0],
          period: 'current',
          meetings: dayData.meetings,
          closed: dayData.closed,
        });
      }
      
      for (let day = 1; day <= daysInNextMonth; day++) {
        const date = new Date(nextMonthYear, nextMonth, day);
        timelineData.push({
          date: date.toISOString().split('T')[0],
          period: 'projected',
          meetings: Math.round(projectedDailyMeetings),
          closed: Math.round(projectedDailyClosed),
        });
      }

      // Calculate meetings trend percentage for the message
      let meetingsTrendPercentage = 0;
      let meetingsTrendDirection = 'stable';
      if (avgDailyMeetingsPreviousMonth > 0) {
        meetingsTrendPercentage = ((avgDailyMeetings - avgDailyMeetingsPreviousMonth) / avgDailyMeetingsPreviousMonth) * 100;
        if (meetingsTrendPercentage > 5) {
          meetingsTrendDirection = 'increasing';
        } else if (meetingsTrendPercentage < -5) {
          meetingsTrendDirection = 'decreasing';
        }
      } else if (avgDailyMeetings > 0) {
        meetingsTrendPercentage = 100;
        meetingsTrendDirection = 'increasing';
      } else if (avgDailyMeetingsPreviousMonth > 0 && avgDailyMeetings === 0) {
        meetingsTrendPercentage = -100;
        meetingsTrendDirection = 'decreasing';
      }

      // Build message with both closed deals and meetings information
      let updatedMessage = '';
      
      // Closed deals part
      if (trendDirection === 'increasing' && Math.abs(trendPercentage) >= 5) {
        updatedMessage += `Based on current month showing a ${Math.abs(trendPercentage).toFixed(1)}% increase in closed deals compared to last month`;
      } else if (trendDirection === 'decreasing' && Math.abs(trendPercentage) >= 5) {
        updatedMessage += `Based on current month showing a ${Math.abs(trendPercentage).toFixed(1)}% decrease in closed deals compared to last month`;
      } else if (avgDailyClosed === 0 && avgDailyClosedPreviousMonth === 0) {
        updatedMessage += `Based on current month data showing no closed deals (same as last month)`;
      } else if (avgDailyClosed === 0 && avgDailyClosedPreviousMonth > 0) {
        updatedMessage += `Based on current month showing no closed deals (down from ${avgDailyClosedPreviousMonth.toFixed(2)} per day last month)`;
      } else if (avgDailyClosed > 0 && avgDailyClosedPreviousMonth === 0) {
        updatedMessage += `Based on current month showing ${avgDailyClosed.toFixed(2)} closed deals per day (up from none last month)`;
      } else {
        updatedMessage += `Based on current month performance (${avgDailyClosed.toFixed(2)} closed deals per day)`;
      }

      // Meetings part
      if (meetingsTrendDirection === 'increasing' && Math.abs(meetingsTrendPercentage) >= 5) {
        updatedMessage += ` and a ${Math.abs(meetingsTrendPercentage).toFixed(1)}% increase in meetings compared to last month`;
      } else if (meetingsTrendDirection === 'decreasing' && Math.abs(meetingsTrendPercentage) >= 5) {
        updatedMessage += ` and a ${Math.abs(meetingsTrendPercentage).toFixed(1)}% decrease in meetings compared to last month`;
      } else if (avgDailyMeetings === 0 && avgDailyMeetingsPreviousMonth === 0) {
        updatedMessage += ` (no meetings, same as last month)`;
      } else if (avgDailyMeetings === 0 && avgDailyMeetingsPreviousMonth > 0) {
        updatedMessage += ` (no meetings, down from ${avgDailyMeetingsPreviousMonth.toFixed(2)} per day last month)`;
      } else if (avgDailyMeetings > 0 && avgDailyMeetingsPreviousMonth === 0) {
        updatedMessage += ` (${avgDailyMeetings.toFixed(2)} meetings per day, up from none last month)`;
      } else {
        updatedMessage += ` (${avgDailyMeetings.toFixed(2)} meetings per day)`;
      }

      // Projections
      updatedMessage += `, we estimate ${finalNextWeekEstimate} closed deals and ${nextWeekMeetingsEstimate} meetings next week, and ${finalNextMonthEstimate} closed deals and ${nextMonthMeetingsEstimate} meetings next month.`;

      return {
        nextWeek: {
          estimatedClosed: finalNextWeekEstimate,
          estimatedMeetings: nextWeekMeetingsEstimate,
          confidence,
          trend: monthlyClosedTrend, // Keep for backward compatibility
          trendClosed: monthlyClosedTrend,
          trendMeetings: monthlyMeetingsTrend,
        },
        nextMonth: {
          estimatedClosed: finalNextMonthEstimate,
          estimatedMeetings: nextMonthMeetingsEstimate,
          confidence,
          trend: monthlyClosedTrend, // Keep for backward compatibility
          trendClosed: monthlyClosedTrend,
          trendMeetings: monthlyMeetingsTrend,
        },
        message: updatedMessage,
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
}

