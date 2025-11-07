import { Module } from '@nestjs/common';
import { PredictionsController } from './predictions.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { GeneratorsModule } from '../../llm/generators/generators.module';
import { ConversionPredictionsService } from './services/conversion-predictions.service';
import { FutureProjectionsService } from './services/future-projections.service';

@Module({
  imports: [PrismaModule, GeneratorsModule],
  controllers: [PredictionsController],
  providers: [ConversionPredictionsService, FutureProjectionsService],
  exports: [ConversionPredictionsService, FutureProjectionsService],
})
export class PredictionsModule {}

