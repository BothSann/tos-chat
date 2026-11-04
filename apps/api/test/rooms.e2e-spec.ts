import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { appOptions, configureApp } from '../src/configure-app.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { signInNewUser } from './sign-in.js';

describe('Rooms (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = configureApp(moduleRef.createNestApplication(appOptions));
    await app.init();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    // Deleting users cascades to sessions, accounts, rooms, and memberships.
    await prisma.user.deleteMany();
    await prisma.rateLimit.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /rooms', () => {
    it('creates the room and makes the caller its owner and first member', async () => {
      const { agent, userId } = await signInNewUser(app);

      const res = await agent
        .post('/rooms')
        .send({ name: '  general  ', description: 'Say hi' })
        .expect(201);

      expect(res.body).toEqual({
        id: expect.stringMatching(/^c[a-z0-9]{24}$/),
        name: 'general',
        description: 'Say hi',
        type: 'PUBLIC',
        ownerId: userId,
        createdAt: expect.any(String),
        isMember: true,
      });
      expect(new Date(res.body.createdAt).toISOString()).toBe(
        res.body.createdAt,
      );
      expect(await prisma.membership.findMany()).toMatchObject([
        { userId, roomId: res.body.id, role: 'OWNER' },
      ]);
    });

    it('stores a missing or blank description as null', async () => {
      const { agent } = await signInNewUser(app);

      const blank = await agent
        .post('/rooms')
        .send({ name: 'blank', description: '   ' })
        .expect(201);
      const missing = await agent
        .post('/rooms')
        .send({ name: 'missing' })
        .expect(201);

      expect(blank.body.description).toBeNull();
      expect(missing.body.description).toBeNull();
    });

    it('answers 422 with fields for a name that breaks the rules', async () => {
      const { agent } = await signInNewUser(app);

      const res = await agent.post('/rooms').send({ name: 'ab' }).expect(422);

      expect(res.body).toEqual({
        statusCode: 422,
        code: 'VALIDATION_FAILED',
        message: 'Validation failed',
        fields: { name: ['name must be longer than or equal to 3 characters'] },
      });
      expect(await prisma.room.count()).toBe(0);
    });

    it('answers 422 for a name that is only spaces and a too-long description', async () => {
      const { agent } = await signInNewUser(app);

      const res = await agent
        .post('/rooms')
        .send({ name: '    ', description: 'x'.repeat(201) })
        .expect(422);

      expect(Object.keys(res.body.fields).sort()).toEqual([
        'description',
        'name',
      ]);
    });

    it('answers 422 for a property the DTO does not know', async () => {
      const { agent } = await signInNewUser(app);

      const res = await agent
        .post('/rooms')
        .send({ name: 'general', ownerId: 'someone-else' })
        .expect(422);

      expect(res.body.fields).toEqual({
        ownerId: ['property ownerId should not exist'],
      });
      expect(await prisma.room.count()).toBe(0);
    });

    it('answers 409 for a taken name and leaves no extra rows', async () => {
      const owner = await signInNewUser(app);
      const other = await signInNewUser(app);
      await owner.agent.post('/rooms').send({ name: 'general' }).expect(201);

      const res = await other.agent
        .post('/rooms')
        .send({ name: 'general' })
        .expect(409);

      expect(res.body).toEqual({
        statusCode: 409,
        code: 'CONFLICT',
        message: 'Room name is already taken',
      });
      expect(await prisma.room.count()).toBe(1);
      expect(await prisma.membership.count()).toBe(1);
    });

    it('creates exactly one room when two users race for the same name', async () => {
      const first = await signInNewUser(app);
      const second = await signInNewUser(app);

      const results = await Promise.all([
        first.agent.post('/rooms').send({ name: 'race' }),
        second.agent.post('/rooms').send({ name: 'race' }),
      ]);

      expect(results.map((res) => res.status).sort((a, b) => a - b)).toEqual([
        201, 409,
      ]);
      expect(await prisma.room.count()).toBe(1);
      expect(await prisma.membership.count()).toBe(1);
    });

    it('answers 400 BAD_REQUEST for a broken JSON body', async () => {
      const { agent } = await signInNewUser(app);

      const res = await agent
        .post('/rooms')
        .set('Content-Type', 'application/json')
        .send('{"name": ')
        .expect(400);

      // Nest turns the JSON parser's error into a BadRequestException.
      expect(res.body).toEqual({
        statusCode: 400,
        code: 'BAD_REQUEST',
        message: 'Unexpected end of JSON input',
      });
    });

    it('answers 401 UNAUTHORIZED without a session', async () => {
      const res = await request(app.getHttpServer())
        .post('/rooms')
        .send({ name: 'general' })
        .expect(401);

      expect(res.body).toEqual({
        statusCode: 401,
        code: 'UNAUTHORIZED',
        message: 'Unauthorized',
      });
    });
  });

  describe('GET /rooms', () => {
    it('lists every room oldest first, with isMember for the caller', async () => {
      const ann = await signInNewUser(app);
      const bob = await signInNewUser(app);
      await ann.agent.post('/rooms').send({ name: 'first' }).expect(201);
      await bob.agent.post('/rooms').send({ name: 'second' }).expect(201);

      const res = await ann.agent.get('/rooms').expect(200);

      expect(
        res.body.map((room: { name: string; isMember: boolean }) => [
          room.name,
          room.isMember,
        ]),
      ).toEqual([
        ['first', true],
        ['second', false],
      ]);
      expect(Object.keys(res.body[0])).toEqual([
        'id',
        'name',
        'description',
        'type',
        'ownerId',
        'createdAt',
        'isMember',
      ]);
    });

    it('answers an empty list when there are no rooms', async () => {
      const { agent } = await signInNewUser(app);

      await agent.get('/rooms').expect(200, []);
    });

    it('answers 401 without a session', async () => {
      await request(app.getHttpServer()).get('/rooms').expect(401);
    });
  });

  describe('every error uses the ApiError shape', () => {
    it('answers an unknown route with 404 NOT_FOUND', async () => {
      const { agent } = await signInNewUser(app);

      const res = await agent.get('/nope').expect(404);

      expect(res.body).toEqual({
        statusCode: 404,
        code: 'NOT_FOUND',
        message: 'Cannot GET /nope',
      });
    });
  });
});
