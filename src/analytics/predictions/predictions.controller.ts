import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PredictionsService } from './predictions.service';

@ApiTags('analytics')
@Controller('analytics')
export class PredictionsController {
  constructor(private readonly predictionsService: PredictionsService) {}

  @Get('future-projection')
  @ApiOperation({ summary: 'Get future projection metrics and trends' })
  @ApiResponse({ status: 200, description: 'Future projection retrieved successfully' })
  async getFutureProjection() {
    return this.predictionsService.getFutureProjection();
  }

  @Get('conversion-predictions')
  @ApiOperation({ summary: 'Get conversion predictions based on historical data' })
  @ApiResponse({ status: 200, description: 'Conversion predictions retrieved successfully' })
  async getConversionPredictions() {
    return this.predictionsService.getConversionPredictions();
  }
}

