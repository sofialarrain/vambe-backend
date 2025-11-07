import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AnalyticsInsightsService } from './services/analytics-insights.service';
import { ClientInsightsService } from './services/client-insights.service';
import { TimelineInsightsService } from './services/timeline-insights.service';

@ApiTags('analytics')
@Controller('analytics')
export class InsightsController {
  constructor(
    private readonly analyticsInsightsService: AnalyticsInsightsService,
    private readonly clientInsightsService: ClientInsightsService,
    private readonly timelineInsightsService: TimelineInsightsService,
  ) {}

  @Get('volume-vs-conversion-insight')
  @ApiOperation({ summary: 'Get AI-generated insight on volume vs conversion relationship' })
  @ApiResponse({ status: 200, description: 'Volume vs conversion insight retrieved successfully' })
  async getVolumeVsConversionInsight() {
    return this.analyticsInsightsService.getVolumeVsConversionInsight();
  }

  @Get('pain-points-insight')
  @ApiOperation({ summary: 'Get AI-generated insight on top pain points' })
  @ApiResponse({ status: 200, description: 'Pain points insight retrieved successfully' })
  async getPainPointsInsight() {
    return this.analyticsInsightsService.getPainPointsInsight();
  }

  @Get('client-perception-insight')
  @ApiOperation({ summary: 'Get AI-generated insight on client perception' })
  @ApiResponse({ status: 200, description: 'Client perception insight retrieved successfully' })
  async getClientPerceptionInsight() {
    return this.clientInsightsService.getClientPerceptionInsight();
  }

  @Get('client-solutions-insight')
  @ApiOperation({ summary: 'Get AI-generated insight on client solutions' })
  @ApiResponse({ status: 200, description: 'Client solutions insight retrieved successfully' })
  async getClientSolutionsInsight() {
    return this.clientInsightsService.getClientSolutionsInsight();
  }

  @Get('timeline-insight')
  @ApiOperation({ summary: 'Get AI-generated insight on timeline metrics' })
  @ApiResponse({ status: 200, description: 'Timeline insight retrieved successfully' })
  async getTimelineInsight() {
    return this.timelineInsightsService.getTimelineInsight();
  }
}

