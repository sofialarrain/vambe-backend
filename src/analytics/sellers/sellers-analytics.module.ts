import { Module } from '@nestjs/common';
import { SellersAnalyticsController } from './sellers-analytics.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { GeneratorsModule } from '../../llm/generators/generators.module';
import { SellersMetricsService } from './services/sellers-metrics.service';
import { SellersRankingsService } from './services/sellers-rankings.service';
import { SellersTimelineService } from './services/sellers-timeline.service';
import { SellersCorrelationsService } from './services/sellers-correlations.service';

@Module({
  imports: [PrismaModule, GeneratorsModule],
  controllers: [SellersAnalyticsController],
  providers: [
    SellersMetricsService,
    SellersRankingsService,
    SellersTimelineService,
    SellersCorrelationsService,
  ],
  exports: [
    SellersMetricsService,
    SellersRankingsService,
    SellersTimelineService,
    SellersCorrelationsService,
  ],
})
export class SellersAnalyticsModule {}

