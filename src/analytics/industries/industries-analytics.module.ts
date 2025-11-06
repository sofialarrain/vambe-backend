import { Module } from '@nestjs/common';
import { IndustriesAnalyticsService } from './industries-analytics.service';
import { IndustriesAnalyticsController } from './industries-analytics.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { GeneratorsModule } from '../../llm/generators/generators.module';
import { ConversionAnalysisModule } from '../conversion/conversion-analysis.module';

@Module({
  imports: [PrismaModule, GeneratorsModule, ConversionAnalysisModule],
  controllers: [IndustriesAnalyticsController],
  providers: [IndustriesAnalyticsService],
  exports: [IndustriesAnalyticsService],
})
export class IndustriesAnalyticsModule {}

