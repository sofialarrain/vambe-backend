import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PainPointsService } from './pain-points.service';

@ApiTags('analytics')
@Controller('analytics')
export class PainPointsController {
  constructor(private readonly painPointsService: PainPointsService) {}

  @Get('pain-points')
  @ApiOperation({ summary: 'Get top pain points from client interactions' })
  @ApiResponse({ status: 200, description: 'Top pain points retrieved successfully' })
  async getPainPoints() {
    return this.painPointsService.getTopPainPoints();
  }

  @Get('technical-requirements')
  @ApiOperation({ summary: 'Get top technical requirements from client interactions' })
  @ApiResponse({ status: 200, description: 'Top technical requirements retrieved successfully' })
  async getTechnicalRequirements() {
    return this.painPointsService.getTopTechnicalRequirements();
  }

  @Get('volume-vs-conversion')
  @ApiOperation({ summary: 'Get volume vs conversion analysis grouped by interaction volume ranges' })
  @ApiResponse({ status: 200, description: 'Volume vs conversion data retrieved successfully' })
  async getVolumeVsConversion() {
    return this.painPointsService.getVolumeVsConversion();
  }
}

