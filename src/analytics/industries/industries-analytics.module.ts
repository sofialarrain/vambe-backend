import { Module } from '@nestjs/common';
import { IndustriesAnalyticsController } from './industries-analytics.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { GeneratorsModule } from '../../llm/generators/generators.module';
import { ConversionAnalysisModule } from '../conversion/conversion-analysis.module';
import { IndustriesRankingService } from './services/industries-ranking.service';
import { IndustriesAnalysisService } from './services/industries-analysis.service';
import { IndustriesInsightsService } from './services/industries-insights.service';

/**
 * Industries Analytics Module
 *
 * Aggregates all industry analytics services following the single responsibility principle.
 * Each service handles a specific aspect of industry analytics.
 */
@Module({
  imports: [PrismaModule, GeneratorsModule, ConversionAnalysisModule],
  controllers: [IndustriesAnalyticsController],
  providers: [
    IndustriesRankingService,
    IndustriesAnalysisService,
    IndustriesInsightsService,
  ],
  exports: [
    IndustriesRankingService,
    IndustriesAnalysisService,
    IndustriesInsightsService,
  ],
})
export class IndustriesAnalyticsModule {}

