import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  SellerTimelineQueryDto,
  YearQueryDto,
  SellerOfWeekQueryDto,
  GranularityEnum,
} from '../../common/dto/analytics/queries.dto';
import { SellersMetricsService } from './services/sellers-metrics.service';
import { SellersRankingsService } from './services/sellers-rankings.service';
import { SellersTimelineService } from './services/sellers-timeline.service';
import { SellersCorrelationsService } from './services/sellers-correlations.service';

@ApiTags('analytics')
@Controller('analytics')
export class SellersAnalyticsController {
  constructor(
    private readonly sellersMetricsService: SellersMetricsService,
    private readonly sellersRankingsService: SellersRankingsService,
    private readonly sellersTimelineService: SellersTimelineService,
    private readonly sellersCorrelationsService: SellersCorrelationsService,
  ) {}

  @Get('sellers')
  @ApiOperation({ summary: 'Get seller metrics overview' })
  @ApiResponse({ status: 200, description: 'Seller metrics retrieved successfully' })
  async getSellerMetrics() {
    return this.sellersMetricsService.getSellerMetrics();
  }

  @Get('seller-of-week')
  @ApiOperation({ summary: 'Get seller of the week' })
  @ApiResponse({ status: 200, description: 'Seller of the week retrieved successfully' })
  async getSellerOfWeek(@Query() query: SellerOfWeekQueryDto) {
    return this.sellersRankingsService.getSellerOfWeek(query.weekStart, query.year);
  }

  @Get('annual-seller-ranking')
  @ApiOperation({ summary: 'Get annual seller ranking' })
  @ApiResponse({ status: 200, description: 'Annual seller ranking retrieved successfully' })
  async getAnnualSellerRanking(@Query() query: YearQueryDto) {
    return this.sellersRankingsService.getAnnualSellerRanking(query.year);
  }

  @Get('sellers-timeline')
  @ApiOperation({ summary: 'Get sellers timeline data' })
  @ApiResponse({ status: 200, description: 'Sellers timeline retrieved successfully' })
  async getSellersTimeline(@Query() query: SellerTimelineQueryDto) {
    return this.sellersTimelineService.getSellersTimeline(
      query.granularity || GranularityEnum.WEEK,
    );
  }

  @Get('seller-correlations')
  @ApiOperation({ summary: 'Get seller performance correlations' })
  @ApiResponse({ status: 200, description: 'Seller correlations retrieved successfully' })
  async getSellerCorrelations() {
    return this.sellersCorrelationsService.getSellerCorrelations();
  }

  @Get('seller-correlation-insights')
  @ApiOperation({ summary: 'Get AI-generated insights on seller correlations' })
  @ApiResponse({ status: 200, description: 'Seller correlation insights retrieved successfully' })
  async getSellerCorrelationInsights() {
    return this.sellersCorrelationsService.getSellerCorrelationInsights();
  }

  @Get('seller-insights')
  @ApiOperation({ summary: 'Get AI-generated seller insights' })
  @ApiResponse({ status: 200, description: 'Seller insights retrieved successfully' })
  async getSellerInsights() {
    return this.sellersCorrelationsService.getSellerInsights();
  }

  @Get('seller-ai-feedback')
  @ApiOperation({ summary: 'Get AI-generated feedback for sellers' })
  @ApiResponse({ status: 200, description: 'Seller AI feedback retrieved successfully' })
  async getSellerAIFeedback() {
    return this.sellersCorrelationsService.getSellerAIFeedback();
  }

  @Get('seller-timeline-insight')
  @ApiOperation({ summary: 'Get AI-generated insight on sellers timeline' })
  @ApiResponse({ status: 200, description: 'Seller timeline insight retrieved successfully' })
  async getSellerTimelineInsight(@Query() query: SellerTimelineQueryDto) {
    return {
      insight: await this.sellersCorrelationsService.getSellerTimelineInsight(
        query.granularity || GranularityEnum.MONTH,
      ),
    };
  }
}

