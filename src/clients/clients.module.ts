import { Module } from '@nestjs/common';
import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';
import { CsvProcessorService } from './csv-processor.service';

@Module({
  controllers: [ClientsController],
  providers: [ClientsService, CsvProcessorService],
  exports: [ClientsService],
})
export class ClientsModule {}

