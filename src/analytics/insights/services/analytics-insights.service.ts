import { Injectable, Logger } from '@nestjs/common';
import { AnalyticsInsightsGeneratorService } from '../../../llm/generators/analytics-insights-generator.service';
import { PainPointsService } from '../../pain-points/pain-points.service';
import { InsightDto } from '../../../common/dto/analytics';

@Injectable()
export class AnalyticsInsightsService {
  private readonly logger = new Logger(AnalyticsInsightsService.name);

  constructor(
    private readonly analyticsInsightsGenerator: AnalyticsInsightsGeneratorService,
    private readonly painPointsService: PainPointsService,
  ) {}

  /**
   * Get AI-generated insight on volume vs conversion relationship
   * @returns Insight about the relationship between volume and conversion rates
   */
  async getVolumeVsConversionInsight(): Promise<InsightDto> {
    try {
      const volumeData = await this.painPointsService.getVolumeVsConversion();

      if (!volumeData || volumeData.length === 0) {
        return { insight: 'No volume vs conversion data available to analyze.' };
      }

      return await this.analyticsInsightsGenerator.generateVolumeVsConversionInsight(volumeData);
    } catch (error) {
      this.logger.error('Error getting volume vs conversion insight:', error);
      return { insight: 'Unable to generate insight at this time.' };
    }
  }

  /**
   * Get AI-generated insight on top pain points
   * @returns Insight about the most common pain points
   */
  async getPainPointsInsight(): Promise<InsightDto> {
    try {
      const painPoints = await this.painPointsService.getTopPainPoints();

      if (!painPoints || painPoints.length === 0) {
        return { insight: 'No pain points data available to analyze.' };
      }

      return await this.analyticsInsightsGenerator.generatePainPointsInsight(painPoints);
    } catch (error) {
      this.logger.error('Error getting pain points insight:', error);
      return { insight: 'Unable to generate insight at this time.' };
    }
  }
}

