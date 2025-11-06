import { Module } from '@nestjs/common';
import { SellersAnalyticsService } from './sellers-analytics.service';
import { SellersAnalyticsController } from './sellers-analytics.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { GeneratorsModule } from '../../llm/generators/generators.module';

@Module({
  imports: [PrismaModule, GeneratorsModule],
  controllers: [SellersAnalyticsController],
  providers: [SellersAnalyticsService],
  exports: [SellersAnalyticsService],
})
export class SellersAnalyticsModule {}

