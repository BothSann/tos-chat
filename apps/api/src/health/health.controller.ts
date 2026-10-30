import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service.js';
import { HealthCheck, HealthCheckResult } from '@nestjs/terminus';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';

@AllowAnonymous()
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @HealthCheck()
  check(): Promise<HealthCheckResult> {
    return this.healthService.check();
  }
}
