import { Module } from '@nestjs/common';
import { PainPointsService } from './pain-points.service';
import { PainPointsController } from './pain-points.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PainPointsController],
  providers: [PainPointsService],
  exports: [PainPointsService],
})
export class PainPointsModule {}

