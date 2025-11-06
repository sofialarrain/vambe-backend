import { IsString, IsNumber } from 'class-validator';

export class TimelineMetricsDto {
  @IsString()
  date: string;

  @IsNumber()
  total: number;

  @IsNumber()
  closed: number;
}

