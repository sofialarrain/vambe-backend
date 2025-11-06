import { IsString, IsNumber } from 'class-validator';

export class PainPointDto {
  @IsString()
  painPoint: string;

  @IsNumber()
  count: number;

  @IsNumber()
  conversionRate: number;
}

export class TechnicalRequirementDto {
  @IsString()
  requirement: string;

  @IsNumber()
  count: number;
}

export class VolumeVsConversionDto {
  @IsString()
  volumeRange: string;

  @IsNumber()
  count: number;

  @IsNumber()
  conversionRate: number;
}

