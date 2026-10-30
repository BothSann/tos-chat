import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Env, envFilePaths, validateEnv } from './config/env.js';
import { HealthModule } from './health/health.module.js';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { PrismaService } from './prisma/prisma.service.js';
import { createAuth } from './auth/auth.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { UsersModule } from './users/users.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: envFilePaths(),
      validate: validateEnv,
    }),
    AuthModule.forRootAsync({
      imports: [PrismaModule],
      inject: [PrismaService, ConfigService],
      useFactory: (
        prisma: PrismaService,
        config: ConfigService<Env, true>,
      ) => ({
        auth: createAuth(prisma, config),
      }),
    }),
    HealthModule,
    UsersModule,
  ],
})
export class AppModule {}
