import { Module } from '@nestjs/common';
import { OverviewModule } from './overview/overview.module';
import { PainPointsModule } from './pain-points/pain-points.module';
import { ConversionAnalysisModule } from './conversion/conversion-analysis.module';
import { SellersAnalyticsModule } from './sellers/sellers-analytics.module';
import { IndustriesAnalyticsModule } from './industries/industries-analytics.module';
import { InsightsModule } from './insights/insights.module';
import { PredictionsModule } from './predictions/predictions.module';

/**
 * Analytics Module
 * 
 * Aggregates all analytics-related modules. Each sub-module has its own
 * controller and service, following the single responsibility principle.
 */
@Module({
  imports: [
    OverviewModule,
    PainPointsModule,
    ConversionAnalysisModule,
    SellersAnalyticsModule,
    IndustriesAnalyticsModule,
    InsightsModule,
    PredictionsModule,
  ],
})
export class AnalyticsModule {}

