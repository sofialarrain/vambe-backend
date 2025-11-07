import { Module } from '@nestjs/common';
import { InsightsController } from './insights.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { GeneratorsModule } from '../../llm/generators/generators.module';
import { PainPointsModule } from '../pain-points/pain-points.module';
import { AnalyticsInsightsService } from './services/analytics-insights.service';
import { ClientInsightsService } from './services/client-insights.service';
import { TimelineInsightsService } from './services/timeline-insights.service';

@Module({
  imports: [PrismaModule, GeneratorsModule, PainPointsModule],
  controllers: [InsightsController],
  providers: [
    AnalyticsInsightsService,
    ClientInsightsService,
    TimelineInsightsService,
  ],
  exports: [
    AnalyticsInsightsService,
    ClientInsightsService,
    TimelineInsightsService,
  ],
})
export class InsightsModule {}

