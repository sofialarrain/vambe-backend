import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { OverviewService } from './overview.service';
import { DimensionQueryDto, DimensionEnum } from '../../common/dto/analytics/queries.dto';

@ApiTags('analytics')
@Controller('analytics')
export class OverviewController {
  constructor(private readonly overviewService: OverviewService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Get overview metrics' })
  @ApiResponse({ status: 200, description: 'Overview metrics retrieved successfully' })
  async getOverview() {
    return this.overviewService.getOverview();
  }

  @Get('by-dimension')
  @ApiOperation({ summary: 'Get metrics grouped by dimension' })
  @ApiResponse({ status: 200, description: 'Metrics by dimension retrieved successfully' })
  async getByDimension(@Query() query: DimensionQueryDto) {
    return this.overviewService.getMetricsByDimension(query.dimension);
  }
}

