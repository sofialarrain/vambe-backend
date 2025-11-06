import { Module } from '@nestjs/common';
import { CategorizationService } from './categorization.service';
import { LlmController } from './llm.controller';
import { ClientsModule } from '../clients/clients.module';
import { CoreModule } from './core/core.module';
import { GeneratorsModule } from './generators/generators.module';

@Module({
  imports: [ClientsModule, CoreModule, GeneratorsModule],
  controllers: [LlmController],
  providers: [CategorizationService],
  exports: [
    CategorizationService,
    CoreModule,
    GeneratorsModule,
  ],
})
export class LlmModule {}

