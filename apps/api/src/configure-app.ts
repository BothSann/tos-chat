import {
  INestApplication,
  NestApplicationOptions,
  ValidationPipe,
} from '@nestjs/common';
import { validationExceptionFactory } from './errors/validation-exception.factory.js';
import { ApiExceptionFilter } from './errors/api-exception.filter.js';
import { HttpAdapterHost } from '@nestjs/core';

export function configureApp(app: INestApplication): INestApplication {
  app.enableShutdownHooks();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      errorHttpStatusCode: 422,
      exceptionFactory: validationExceptionFactory,
    }),
  );
  app.useGlobalFilters(new ApiExceptionFilter(app.get(HttpAdapterHost)));

  return app;
}

export const appOptions: NestApplicationOptions = {
  bodyParser: false,
};
