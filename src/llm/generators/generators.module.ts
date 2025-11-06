import { Module } from '@nestjs/common';
import { SellerInsightsGeneratorService } from './seller-insights-generator.service';
import { IndustryInsightsGeneratorService } from './industry-insights-generator.service';
import { ClientInsightsGeneratorService } from './client-insights-generator.service';
import { AnalyticsInsightsGeneratorService } from './analytics-insights-generator.service';
import { PredictionsGeneratorService } from './predictions-generator.service';
import { CoreModule } from '../core/core.module';

@Module({
  imports: [CoreModule],
  providers: [
    SellerInsightsGeneratorService,
    IndustryInsightsGeneratorService,
    ClientInsightsGeneratorService,
    AnalyticsInsightsGeneratorService,
    PredictionsGeneratorService,
  ],
  exports: [
    SellerInsightsGeneratorService,
    IndustryInsightsGeneratorService,
    ClientInsightsGeneratorService,
    AnalyticsInsightsGeneratorService,
    PredictionsGeneratorService,
  ],
})
export class GeneratorsModule {}

