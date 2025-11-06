import { Module } from '@nestjs/common';
import { ConversionAnalysisService } from './conversion-analysis.service';
import { ConversionAnalysisController } from './conversion-analysis.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { OverviewModule } from '../overview/overview.module';

@Module({
  imports: [PrismaModule, OverviewModule],
  controllers: [ConversionAnalysisController],
  providers: [ConversionAnalysisService],
  exports: [ConversionAnalysisService],
})
export class ConversionAnalysisModule {}

