import { IsString, IsEmail, IsBoolean, IsOptional, IsDateString, IsArray, IsInt } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class CreateClientDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  phone: string;

  @IsString()
  assignedSeller: string;

  @IsDateString()
  meetingDate: string;

  @IsBoolean()
  closed: boolean;

  @IsString()
  transcription: string;
}

export class ClientResponseDto {
  id: string;
  name: string;
  email: string;
  phone: string;
  assignedSeller: string;
  meetingDate: Date;
  closed: boolean;
  transcription: string;
  industry?: string;
  operationSize?: string;
  interactionVolume?: number;
  discoverySource?: string;
  mainMotivation?: string;
  urgencyLevel?: string;
  painPoints?: string[];
  technicalRequirements?: string[];
  sentiment?: string;
  processed: boolean;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class ClientFilterDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  assignedSeller?: string;

  @IsOptional()
  @IsString()
  industry?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  closed?: boolean;

  @IsOptional()
  @IsString()
  sentiment?: string;

  @IsOptional()
  @IsString()
  discoverySource?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  limit?: number;
}

export class CategorizedDataDto {
  industry: string;
  operationSize: string;
  interactionVolume: number;
  discoverySource: string;
  mainMotivation: string;
  urgencyLevel: string;
  painPoints: string[];
  technicalRequirements: string[];
  sentiment: string;
}

