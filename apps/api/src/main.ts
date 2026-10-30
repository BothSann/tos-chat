import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import type { Env } from './config/env.js';
import { configureApp, appOptions } from './configure-app.js';

async function bootstrap() {
  const app = configureApp(await NestFactory.create(AppModule, appOptions));
  const config = app.get<ConfigService<Env, true>>(ConfigService);
  await app.listen(config.getOrThrow('PORT', { infer: true }));
}
await bootstrap();
