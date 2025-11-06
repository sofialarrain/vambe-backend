import { IsString, IsNumber } from 'class-validator';

export class ConversionAnalysisByDimensionDto {
  dimension: string;
  values: Array<{
    value: string;
    count: number;
    closed: number;
    conversionRate: number;
  }>;
}

export class ConversionAnalysisDto {
  byIndustry: ConversionAnalysisByDimensionDto;
  bySentiment: ConversionAnalysisByDimensionDto;
  byUrgency: ConversionAnalysisByDimensionDto;
  byDiscovery: ConversionAnalysisByDimensionDto;
  byOperationSize: ConversionAnalysisByDimensionDto;
}

export class ConversionPredictionDto {
  @IsString()
  clientName: string;

  @IsNumber()
  probability: number;

  @IsString()
  recommendation: string;

  @IsString()
  industry: string;

  @IsString()
  seller: string;

  @IsString()
  urgencyLevel: string;
}

