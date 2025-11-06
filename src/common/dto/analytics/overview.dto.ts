import { IsNumber, IsString } from 'class-validator';

export class OverviewMetricsDto {
  @IsNumber()
  totalClients: number;

  @IsNumber()
  totalClosed: number;

  @IsNumber()
  totalOpen: number;

  @IsNumber()
  conversionRate: number;

  @IsNumber()
  processedClients: number;

  @IsNumber()
  unprocessedClients: number;
}

export class DimensionValueDto {
  @IsString()
  value: string;

  @IsNumber()
  count: number;

  @IsNumber()
  closed: number;

  @IsNumber()
  conversionRate: number;

  totalInteractionVolume?: number; // Total volume of interactions for this dimension value
}

export class DimensionMetricsDto {
  @IsString()
  dimension: string;

  values: DimensionValueDto[];
}

