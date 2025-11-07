import { Module } from '@nestjs/common';
import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';
import { CsvProcessorService } from './csv-processor.service';
import { OverviewModule } from '../analytics/overview/overview.module';

@Module({
  imports: [OverviewModule],
  controllers: [ClientsController],
  providers: [ClientsService, CsvProcessorService],
  exports: [ClientsService],
})
export class ClientsModule {}

