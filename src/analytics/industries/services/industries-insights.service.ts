import { Injectable, Logger } from '@nestjs/common';
import { ConversionAnalysisService } from '../../conversion/conversion-analysis.service';
import { IndustryInsightsGeneratorService } from '../../../llm/generators/industry-insights-generator.service';
import { InsightDto } from '../../../common/dto/analytics';

@Injectable()
export class IndustriesInsightsService {
  private readonly logger = new Logger(IndustriesInsightsService.name);

  constructor(
    private readonly conversionAnalysisService: ConversionAnalysisService,
    private readonly industryInsightsGenerator: IndustryInsightsGeneratorService,
  ) {}

  /**
   * Get AI-generated insight on industry distribution
   * @returns Insight about how industries are distributed
   */
  async getIndustryDistributionInsight(): Promise<InsightDto> {
    try {
      const conversionData = await this.conversionAnalysisService.getConversionAnalysis();
      const industryData = conversionData.byIndustry.values || [];

      if (!industryData || industryData.length === 0) {
        return { insight: 'No industry data available to analyze.' };
      }

      return await this.industryInsightsGenerator.generateIndustryDistributionInsight(industryData);
    } catch (error) {
      this.logger.error('Error getting industry distribution insight:', error);
      return { insight: 'Unable to generate insight at this time.' };
    }
  }

  /**
   * Get AI-generated insight on industry conversion rates
   * @returns Insight about conversion rates across industries
   */
  async getIndustryConversionInsight(): Promise<InsightDto> {
    try {
      const conversionData = await this.conversionAnalysisService.getConversionAnalysis();
      const industryData = conversionData.byIndustry.values || [];

      if (!industryData || industryData.length === 0) {
        return { insight: 'No industry data available to analyze.' };
      }

      return await this.industryInsightsGenerator.generateIndustryConversionInsight(industryData);
    } catch (error) {
      this.logger.error('Error getting industry conversion insight:', error);
      return { insight: 'Unable to generate insight at this time.' };
    }
  }
}

