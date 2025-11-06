import { IsString, IsEnum, IsInt, Min, Max, IsOptional, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { ANALYTICS_CONSTANTS } from '../../constants';

export enum DimensionEnum {
  INDUSTRY = 'industry',
  SENTIMENT = 'sentiment',
  URGENCY_LEVEL = 'urgencyLevel',
  DISCOVERY_SOURCE = 'discoverySource',
  OPERATION_SIZE = 'operationSize',
}

export enum GranularityEnum {
  WEEK = 'week',
  MONTH = 'month',
}

export class DimensionQueryDto {
  @IsEnum(DimensionEnum)
  dimension: DimensionEnum;
}

export class SellerTimelineQueryDto {
  @IsOptional()
  @IsEnum(GranularityEnum)
  granularity?: GranularityEnum = GranularityEnum.WEEK;
}

export class YearQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(ANALYTICS_CONSTANTS.YEAR.MIN)
  @Max(ANALYTICS_CONSTANTS.YEAR.MAX)
  year?: number;
}

export class WeekStartQueryDto {
  @IsOptional()
  @IsString()
  weekStart?: string;
}

export class SellerOfWeekQueryDto {
  @IsOptional()
  @IsString()
  weekStart?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(ANALYTICS_CONSTANTS.YEAR.MIN)
  @Max(ANALYTICS_CONSTANTS.YEAR.MAX)
  year?: number;
}

