import { Controller, Post, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CategorizationService } from './categorization.service';

@ApiTags('llm')
@Controller('processing')
export class LlmController {
  constructor(private readonly categorizationService: CategorizationService) {}

  @Post('process-all')
  @ApiOperation({ summary: 'Process all unprocessed clients with AI categorization' })
  @ApiResponse({ status: 200, description: 'Processing completed successfully' })
  async processAll() {
    const result = await this.categorizationService.processAllUnprocessedClients();
    return {
      message: 'Processing completed',
      ...result,
    };
  }

  @Post('process/:id')
  @ApiOperation({ summary: 'Process a single client with AI categorization' })
  @ApiResponse({ status: 200, description: 'Client processed successfully' })
  @ApiResponse({ status: 404, description: 'Client not found' })
  async processOne(@Param('id') id: string) {
    await this.categorizationService.processSingleClient(id);
    return {
      message: 'Client processed successfully',
    };
  }
}

