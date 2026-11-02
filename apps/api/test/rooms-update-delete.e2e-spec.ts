import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { appOptions, configureApp } from '../src/configure-app.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { signInNewUser } from './sign-in.js';

/** A well-formed cuid that no row will ever have. */
const UNKNOWN_ID = 'cmissing0000000000000000x';

const ROOM_NOT_FOUND = {
  statusCode: 404,
  code: 'NOT_FOUND',
  message: 'Room not found',
};

describe('Rooms update and delete (e2e)', () => {
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

  /** Signs a new user in and gives them one room. */
  async function ownerWithRoom(name = 'general', description = 'Say hi') {
    const owner = await signInNewUser(app);
    const res = await owner.agent
      .post('/rooms')
      .send({ name, description })
      .expect(201);
    return { ...owner, roomId: res.body.id as string };
  }

  describe('PATCH /rooms/:id', () => {
    it('lets the owner rename the room', async () => {
      const { agent, userId, roomId } = await ownerWithRoom();

      const res = await agent
        .patch(`/rooms/${roomId}`)
        .send({ name: '  random  ' })
        .expect(200);

      expect(res.body).toEqual({
        id: roomId,
        name: 'random',
        description: 'Say hi',
        ownerId: userId,
        createdAt: expect.any(String),
        isMember: true,
      });
      expect(
        await prisma.room.findUniqueOrThrow({ where: { id: roomId } }),
      ).toMatchObject({ name: 'random', description: 'Say hi' });
    });

    it('trims a new description', async () => {
      const { agent, roomId } = await ownerWithRoom();

      const res = await agent
        .patch(`/rooms/${roomId}`)
        .send({ description: '  New  ' })
        .expect(200);

      expect(res.body.description).toBe('New');
    });

    it.each([
      ['an empty string', ''],
      ['null', null],
    ])('clears the description when it is %s', async (_, description) => {
      const { agent, roomId } = await ownerWithRoom();

      const res = await agent
        .patch(`/rooms/${roomId}`)
        .send({ description })
        .expect(200);

      expect(res.body.description).toBeNull();
      expect(
        await prisma.room.findUniqueOrThrow({ where: { id: roomId } }),
      ).toMatchObject({ name: 'general', description: null });
    });

    it('answers 200 and changes nothing for an empty body', async () => {
      const { agent, roomId } = await ownerWithRoom();

      const res = await agent.patch(`/rooms/${roomId}`).send({}).expect(200);

      expect(res.body).toMatchObject({
        name: 'general',
        description: 'Say hi',
      });
    });

    it('answers 200 when the owner keeps the same name', async () => {
      const { agent, roomId } = await ownerWithRoom();

      await agent
        .patch(`/rooms/${roomId}`)
        .send({ name: 'general' })
        .expect(200);
    });

    it('answers 422 with fields and writes nothing for a bad body', async () => {
      const { agent, roomId } = await ownerWithRoom();

      const res = await agent
        .patch(`/rooms/${roomId}`)
        .send({ name: null, description: 'x'.repeat(201), ownerId: 'cuser1' })
        .expect(422);

      expect(res.body).toMatchObject({
        statusCode: 422,
        code: 'VALIDATION_FAILED',
        message: 'Validation failed',
      });
      expect(Object.keys(res.body.fields).sort()).toEqual([
        'description',
        'name',
        'ownerId',
      ]);
      expect(
        await prisma.room.findUniqueOrThrow({ where: { id: roomId } }),
      ).toMatchObject({ name: 'general', description: 'Say hi' });
    });

    it('answers 409 when another room has the name', async () => {
      const { agent, roomId } = await ownerWithRoom('general');
      await agent.post('/rooms').send({ name: 'random' }).expect(201);

      const res = await agent
        .patch(`/rooms/${roomId}`)
        .send({ name: 'random' })
        .expect(409);

      expect(res.body).toEqual({
        statusCode: 409,
        code: 'CONFLICT',
        message: 'Room name is already taken',
      });
      expect(
        (await prisma.room.findMany({ orderBy: { name: 'asc' } })).map(
          (room) => room.name,
        ),
      ).toEqual(['general', 'random']);
    });

    it('answers 403 to a signed-in user who is not the owner', async () => {
      const { roomId } = await ownerWithRoom();
      const stranger = await signInNewUser(app);

      const res = await stranger.agent
        .patch(`/rooms/${roomId}`)
        .send({ name: 'mine-now' })
        .expect(403);

      expect(res.body).toEqual({
        statusCode: 403,
        code: 'FORBIDDEN',
        message: 'Only the room owner can do this',
      });
      expect(
        await prisma.room.findUniqueOrThrow({ where: { id: roomId } }),
      ).toMatchObject({ name: 'general' });
    });

    it('answers 404 for an unknown id and for a malformed one', async () => {
      const { agent } = await signInNewUser(app);

      const unknown = await agent
        .patch(`/rooms/${UNKNOWN_ID}`)
        .send({ name: 'random' })
        .expect(404);
      const malformed = await agent
        .patch('/rooms/abc')
        .send({ name: 'random' })
        .expect(404);

      expect(unknown.body).toEqual(ROOM_NOT_FOUND);
      expect(malformed.body).toEqual(ROOM_NOT_FOUND);
    });

    it('answers 401 without a session', async () => {
      const { roomId } = await ownerWithRoom();

      const res = await request(app.getHttpServer())
        .patch(`/rooms/${roomId}`)
        .send({ name: 'random' })
        .expect(401);

      expect(res.body).toMatchObject({ statusCode: 401, code: 'UNAUTHORIZED' });
    });
  });

  describe('DELETE /rooms/:id', () => {
    it('lets the owner delete the room and its memberships', async () => {
      const { agent, roomId } = await ownerWithRoom();

      const res = await agent.delete(`/rooms/${roomId}`).expect(204);

      expect(res.text).toBe('');
      expect(await prisma.room.count()).toBe(0);
      expect(await prisma.membership.count()).toBe(0);
      expect(await prisma.user.count()).toBe(1);
      const list = await agent.get('/rooms').expect(200);
      expect(list.body).toEqual([]);
    });

    it('answers 403 to a signed-in user who is not the owner', async () => {
      const { roomId } = await ownerWithRoom();
      const stranger = await signInNewUser(app);

      const res = await stranger.agent.delete(`/rooms/${roomId}`).expect(403);

      expect(res.body.code).toBe('FORBIDDEN');
      expect(await prisma.room.count()).toBe(1);
    });

    it('answers 404 for an unknown id and for a malformed one', async () => {
      const { agent } = await signInNewUser(app);

      const unknown = await agent.delete(`/rooms/${UNKNOWN_ID}`).expect(404);
      const malformed = await agent.delete('/rooms/abc').expect(404);

      expect(unknown.body).toEqual(ROOM_NOT_FOUND);
      expect(malformed.body).toEqual(ROOM_NOT_FOUND);
    });

    it('answers 204 then 404 when the owner deletes twice at once', async () => {
      const { agent, roomId } = await ownerWithRoom();

      const results = await Promise.all([
        agent.delete(`/rooms/${roomId}`),
        agent.delete(`/rooms/${roomId}`),
      ]);

      expect(results.map((res) => res.status).sort((a, b) => a - b)).toEqual([
        204, 404,
      ]);
      expect(results.find((res) => res.status === 404)?.body).toEqual(
        ROOM_NOT_FOUND,
      );
      expect(await prisma.room.count()).toBe(0);
    });

    it('answers 401 without a session', async () => {
      const { roomId } = await ownerWithRoom();

      await request(app.getHttpServer()).delete(`/rooms/${roomId}`).expect(401);
      expect(await prisma.room.count()).toBe(1);
    });
  });
});
