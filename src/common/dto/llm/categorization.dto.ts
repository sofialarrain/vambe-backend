import { IsString, IsNumber, IsArray } from 'class-validator';

export class CategorizationResultDto {
  @IsString()
  industry: string;

  @IsString()
  operationSize: string;

  @IsNumber()
  interactionVolume: number;

  @IsString()
  discoverySource: string;

  @IsString()
  mainMotivation: string;

  @IsString()
  urgencyLevel: string;

  @IsArray()
  @IsString({ each: true })
  painPoints: string[];

  @IsArray()
  @IsString({ each: true })
  technicalRequirements: string[];

  @IsString()
  sentiment: string;
}

