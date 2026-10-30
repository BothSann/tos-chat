import { INestApplication, NestApplicationOptions } from '@nestjs/common';

export function configureApp(app: INestApplication): INestApplication {
  app.enableShutdownHooks();
  return app;
}

export const appOptions: NestApplicationOptions = {
  bodyParser: false,
};
