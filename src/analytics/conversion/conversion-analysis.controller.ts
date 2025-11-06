import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ConversionAnalysisService } from './conversion-analysis.service';

@ApiTags('analytics')
@Controller('analytics')
export class ConversionAnalysisController {
  constructor(private readonly conversionAnalysisService: ConversionAnalysisService) {}

  @Get('timeline')
  @ApiOperation({ summary: 'Get timeline metrics for meetings and closed deals' })
  @ApiResponse({ status: 200, description: 'Timeline metrics retrieved successfully' })
  async getTimeline() {
    return this.conversionAnalysisService.getTimelineMetrics();
  }

  @Get('conversion-analysis')
  @ApiOperation({ summary: 'Get comprehensive conversion analysis by various dimensions' })
  @ApiResponse({ status: 200, description: 'Conversion analysis retrieved successfully' })
  async getConversionAnalysis() {
    return this.conversionAnalysisService.getConversionAnalysis();
  }
}

