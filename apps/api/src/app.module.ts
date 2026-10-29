import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { envFilePaths, validateEnv } from './config/env.js';
import { HealthModule } from './health/health.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: envFilePaths(),
      validate: validateEnv,
    }),
    HealthModule,
  ],
})
export class AppModule {}
