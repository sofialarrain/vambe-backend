import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { IndustriesAnalyticsService } from './industries-analytics.service';

@ApiTags('analytics')
@Controller('analytics')
export class IndustriesAnalyticsController {
  constructor(private readonly industriesAnalyticsService: IndustriesAnalyticsService) {}

  @Get('industries-detailed-ranking')
  @ApiOperation({ summary: 'Get detailed ranking of all industries' })
  @ApiResponse({ status: 200, description: 'Industries ranking retrieved successfully' })
  async getIndustriesDetailedRanking() {
    return this.industriesAnalyticsService.getIndustriesDetailedRanking();
  }

  @Get('new-industries-last-month')
  @ApiOperation({ summary: 'Get new industries that appeared last month' })
  @ApiResponse({ status: 200, description: 'New industries retrieved successfully' })
  async getNewIndustriesLastMonth() {
    return this.industriesAnalyticsService.getNewIndustriesLastMonth();
  }

  @Get('industries-to-watch')
  @ApiOperation({ summary: 'Get industries to watch (expansion opportunities and strategy needed)' })
  @ApiResponse({ status: 200, description: 'Industries to watch retrieved successfully' })
  async getIndustriesToWatch() {
    return this.industriesAnalyticsService.getIndustriesToWatch();
  }

  @Get('industry-distribution-insight')
  @ApiOperation({ summary: 'Get AI-generated insight on industry distribution' })
  @ApiResponse({ status: 200, description: 'Industry distribution insight retrieved successfully' })
  async getIndustryDistributionInsight() {
    return this.industriesAnalyticsService.getIndustryDistributionInsight();
  }

  @Get('industry-conversion-insight')
  @ApiOperation({ summary: 'Get AI-generated insight on industry conversion rates' })
  @ApiResponse({ status: 200, description: 'Industry conversion insight retrieved successfully' })
  async getIndustryConversionInsight() {
    return this.industriesAnalyticsService.getIndustryConversionInsight();
  }
}

