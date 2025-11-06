import { IsString, IsNumber, IsOptional, IsDateString } from 'class-validator';

export class IndustryRankingDto {
  @IsString()
  industry: string;

  @IsNumber()
  clients: number;

  @IsNumber()
  closed: number;

  @IsNumber()
  conversionRate: number;

  @IsString()
  averageSentiment: string;

  @IsString()
  averageUrgency: string;
}

export class NewIndustriesLastMonthDto {
  industries: Array<{
    industry: string;
    clients: number;
    closed: number;
    conversionRate: number;
  }>;
  month: string;
}

export class IndustriesToWatchDto {
  expansionOpportunities: Array<{
    industry: string;
    clients: number;
    closed: number;
    conversionRate: number;
  }>;
  strategyNeeded: Array<{
    industry: string;
    clients: number;
    closed: number;
    conversionRate: number;
  }>;
}

