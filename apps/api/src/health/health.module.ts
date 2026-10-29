import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { PrismaModule } from '../prisma/prisma.module.js';
import { HealthService } from './health.service.js';
import { HealthController } from './health.controller.js';

@Module({
  imports: [TerminusModule, PrismaModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
