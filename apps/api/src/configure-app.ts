import { INestApplication } from '@nestjs/common';

export function configureApp(app: INestApplication): INestApplication {
  app.enableShutdownHooks();
  return app;
}
