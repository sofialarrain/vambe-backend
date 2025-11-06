import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SellersAnalyticsService } from './sellers-analytics.service';
import {
  SellerTimelineQueryDto,
  YearQueryDto,
  SellerOfWeekQueryDto,
  GranularityEnum,
} from '../../common/dto/analytics/queries.dto';

@ApiTags('analytics')
@Controller('analytics')
export class SellersAnalyticsController {
  constructor(private readonly sellersAnalyticsService: SellersAnalyticsService) {}

  @Get('sellers')
  @ApiOperation({ summary: 'Get seller metrics overview' })
  @ApiResponse({ status: 200, description: 'Seller metrics retrieved successfully' })
  async getSellerMetrics() {
    return this.sellersAnalyticsService.getSellerMetrics();
  }

  @Get('seller-of-week')
  @ApiOperation({ summary: 'Get seller of the week' })
  @ApiResponse({ status: 200, description: 'Seller of the week retrieved successfully' })
  async getSellerOfWeek(@Query() query: SellerOfWeekQueryDto) {
    return this.sellersAnalyticsService.getSellerOfWeek(query.weekStart, query.year);
  }

  @Get('annual-seller-ranking')
  @ApiOperation({ summary: 'Get annual seller ranking' })
  @ApiResponse({ status: 200, description: 'Annual seller ranking retrieved successfully' })
  async getAnnualSellerRanking(@Query() query: YearQueryDto) {
    return this.sellersAnalyticsService.getAnnualSellerRanking(query.year);
  }

  @Get('sellers-timeline')
  @ApiOperation({ summary: 'Get sellers timeline data' })
  @ApiResponse({ status: 200, description: 'Sellers timeline retrieved successfully' })
  async getSellersTimeline(@Query() query: SellerTimelineQueryDto) {
    return this.sellersAnalyticsService.getSellersTimeline(
      query.granularity || GranularityEnum.WEEK,
    );
  }

  @Get('seller-correlations')
  @ApiOperation({ summary: 'Get seller performance correlations' })
  @ApiResponse({ status: 200, description: 'Seller correlations retrieved successfully' })
  async getSellerCorrelations() {
    return this.sellersAnalyticsService.getSellerCorrelations();
  }

  @Get('seller-correlation-insights')
  @ApiOperation({ summary: 'Get AI-generated insights on seller correlations' })
  @ApiResponse({ status: 200, description: 'Seller correlation insights retrieved successfully' })
  async getSellerCorrelationInsights() {
    return this.sellersAnalyticsService.getSellerCorrelationInsights();
  }

  @Get('seller-insights')
  @ApiOperation({ summary: 'Get AI-generated seller insights' })
  @ApiResponse({ status: 200, description: 'Seller insights retrieved successfully' })
  async getSellerInsights() {
    return this.sellersAnalyticsService.getSellerInsights();
  }

  @Get('seller-ai-feedback')
  @ApiOperation({ summary: 'Get AI-generated feedback for sellers' })
  @ApiResponse({ status: 200, description: 'Seller AI feedback retrieved successfully' })
  async getSellerAIFeedback() {
    return this.sellersAnalyticsService.getSellerAIFeedback();
  }

  @Get('seller-timeline-insight')
  @ApiOperation({ summary: 'Get AI-generated insight on sellers timeline' })
  @ApiResponse({ status: 200, description: 'Seller timeline insight retrieved successfully' })
  async getSellerTimelineInsight(@Query() query: SellerTimelineQueryDto) {
    return {
      insight: await this.sellersAnalyticsService.getSellerTimelineInsight(
        query.granularity || GranularityEnum.MONTH,
      ),
    };
  }
}

