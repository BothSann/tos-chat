import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/configure-app.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

describe('GET /health (e2e)', () => {
  describe('with the real test database', () => {
    let app: INestApplication<App>;

    beforeAll(async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();
      app = configureApp(moduleRef.createNestApplication());
      await app.init();
    });

    afterAll(async () => {
      await app.close();
    });

    it('returns 200 with the database up', async () => {
      const res = await request(app.getHttpServer()).get('/health').expect(200);
      const database = { status: 'up', responseTime: expect.any(Number) };
      expect(res.body).toEqual({
        status: 'ok',
        info: { database },
        error: {},
        details: { database },
      });
    });

    it('reaches a database that has the User table from the first migration', async () => {
      const prisma = app.get(PrismaService);
      const user = await prisma.user.create({
        data: { displayName: 'e2e health' },
      });
      expect(user).toMatchObject({
        displayName: 'e2e health',
        avatarUrl: null,
      });
      expect(user.id).toEqual(expect.any(String));
      await prisma.user.delete({ where: { id: user.id } });
    });
  });

  describe('when the database is down', () => {
    let app: INestApplication<App>;

    beforeAll(async () => {
      const unreachable = {
        $queryRawUnsafe: () => Promise.reject(new Error('connection refused')),
      };
      const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
        .overrideProvider(PrismaService)
        .useValue(unreachable)
        .compile();
      app = configureApp(moduleRef.createNestApplication());
      await app.init();
    });

    afterAll(async () => {
      await app.close();
    });

    it('returns 503 with the database down', async () => {
      const res = await request(app.getHttpServer()).get('/health').expect(503);
      expect(res.body).toMatchObject({
        status: 'error',
        error: { database: { status: 'down' } },
      });
    });
  });
});
