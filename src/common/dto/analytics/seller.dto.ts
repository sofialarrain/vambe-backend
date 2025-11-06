import { IsString, IsNumber } from 'class-validator';

export class SellerMetricsDto {
  @IsString()
  seller: string;

  @IsNumber()
  total: number;

  @IsNumber()
  closed: number;

  @IsNumber()
  conversionRate: number;
}

export class SellerCorrelationDto {
  seller: string;
  dimension: string;
  value: string;
  total: number;
  closed: number;
  successRate: number;
  sellerAvgConversion: number;
  overallAvg: number;
  performanceVsAvg: number;
}

export class SellerInsightDto {
  seller: string;
  type: 'positive' | 'negative' | 'neutral';
  metric: string;
  message: string;
  change: number;
}

export class SellerAIFeedbackDto {
  seller: string;
  recommendations: string[];
}

export class WeekPodiumDto {
  weekPodium: Array<{
    seller: string;
    closed: number;
    total: number;
    conversionRate: number;
  }>;
  weekRange: {
    start: string;
    end: string;
  };
}

export class AnnualSellerRankingDto {
  year: number;
  ranking: Array<{
    seller: string;
    total: number;
    closed: number;
    conversionRate: number;
  }>;
}

export class SellerTimelineDataDto {
  period: string;
  sellers: Record<string, number>;
}

