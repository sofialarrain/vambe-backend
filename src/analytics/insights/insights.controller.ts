import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { InsightsService } from './insights.service';

@ApiTags('analytics')
@Controller('analytics')
export class InsightsController {
  constructor(private readonly insightsService: InsightsService) {}

  @Get('volume-vs-conversion-insight')
  @ApiOperation({ summary: 'Get AI-generated insight on volume vs conversion relationship' })
  @ApiResponse({ status: 200, description: 'Volume vs conversion insight retrieved successfully' })
  async getVolumeVsConversionInsight() {
    return this.insightsService.getVolumeVsConversionInsight();
  }

  @Get('pain-points-insight')
  @ApiOperation({ summary: 'Get AI-generated insight on top pain points' })
  @ApiResponse({ status: 200, description: 'Pain points insight retrieved successfully' })
  async getPainPointsInsight() {
    return this.insightsService.getPainPointsInsight();
  }

  @Get('client-perception-insight')
  @ApiOperation({ summary: 'Get AI-generated insight on client perception' })
  @ApiResponse({ status: 200, description: 'Client perception insight retrieved successfully' })
  async getClientPerceptionInsight() {
    return this.insightsService.getClientPerceptionInsight();
  }

  @Get('client-solutions-insight')
  @ApiOperation({ summary: 'Get AI-generated insight on client solutions' })
  @ApiResponse({ status: 200, description: 'Client solutions insight retrieved successfully' })
  async getClientSolutionsInsight() {
    return this.insightsService.getClientSolutionsInsight();
  }

  @Get('timeline-insight')
  @ApiOperation({ summary: 'Get AI-generated insight on timeline metrics' })
  @ApiResponse({ status: 200, description: 'Timeline insight retrieved successfully' })
  async getTimelineInsight() {
    return this.insightsService.getTimelineInsight();
  }
}

