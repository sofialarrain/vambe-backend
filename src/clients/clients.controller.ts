import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Delete,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { ClientsService } from './clients.service';
import { CsvProcessorService } from './csv-processor.service';
import { ClientFilterDto } from '../common/dto/client.dto';
import { OverviewService } from '../analytics/overview/overview.service';

@ApiTags('clients')
@Controller('clients')
export class ClientsController {
  constructor(
    private readonly clientsService: ClientsService,
    private readonly csvProcessorService: CsvProcessorService,
    private readonly overviewService: OverviewService,
  ) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload CSV file with client data' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'CSV uploaded and processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file format or no file uploaded' })
  async uploadCsv(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    if (!file.originalname.endsWith('.csv')) {
      throw new BadRequestException('Only CSV files are allowed');
    }

    const csvContent = file.buffer.toString('utf-8');
    const clients = this.csvProcessorService.parseCsvContent(csvContent);

    const result = await this.clientsService.createManyClients(clients);

    const updatedMetrics = await this.overviewService.getOverview();

    return {
      message: 'CSV uploaded and processed successfully',
      clientsCreated: result.count,
      metrics: updatedMetrics,
    };
  }

  @Get('metadata/unique-values')
  @ApiOperation({ summary: 'Get unique values for metadata fields' })
  @ApiResponse({ status: 200, description: 'Unique values retrieved successfully' })
  async getUniqueValues() {
    return this.clientsService.getUniqueValues();
  }

  @Get()
  @ApiOperation({ summary: 'Get all clients with optional filters' })
  @ApiResponse({ status: 200, description: 'Clients retrieved successfully' })
  async findAll(@Query() filters: ClientFilterDto) {
    return this.clientsService.findAll(filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single client by ID' })
  @ApiResponse({ status: 200, description: 'Client retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Client not found' })
  async findOne(@Param('id') id: string) {
    return this.clientsService.findOne(id);
  }

  @Delete()
  @ApiOperation({ summary: 'Delete all clients' })
  @ApiResponse({ status: 200, description: 'All clients deleted successfully' })
  async deleteAll() {
    return this.clientsService.deleteAll();
  }
}

