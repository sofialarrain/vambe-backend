import { IsString } from 'class-validator';

export class InsightDto {
  @IsString()
  insight: string;
}

export class TimelineInsightDto {
  keyFindings: string[];
  reasons: string[];
  recommendations: string[];
}

export class ClientPerceptionInsightDto {
  positiveAspects: string;
  concerns: string;
  successFactors: string;
  recommendations: string;
}

export class FutureProjectionDto {
  nextWeek: {
    estimatedClosed: number;
    estimatedMeetings: number;
    confidence: 'high' | 'medium' | 'low';
    trend: 'increasing' | 'decreasing' | 'stable' | 'neutral';
    trendClosed?: 'increasing' | 'decreasing' | 'stable' | 'neutral';
    trendMeetings?: 'increasing' | 'decreasing' | 'stable' | 'neutral';
  };
  nextMonth: {
    estimatedClosed: number;
    estimatedMeetings: number;
    confidence: 'high' | 'medium' | 'low';
    trend: 'increasing' | 'decreasing' | 'stable' | 'neutral';
    trendClosed?: 'increasing' | 'decreasing' | 'stable' | 'neutral';
    trendMeetings?: 'increasing' | 'decreasing' | 'stable' | 'neutral';
  };
  message: string;
  dataPoints?: number;
  timelineData?: Array<{
    date: string;
    period: 'current' | 'projected';
    meetings: number;
    closed: number;
  }>;
}

