import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { appOptions, configureApp } from '../src/configure-app.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { RoomsRepository } from '../src/rooms/rooms.repository.js';
import { signInNewUser } from './sign-in.js';

/** A well-formed cuid that no row will ever have. */
const UNKNOWN_ID = 'cmissing0000000000000000x';
const PASSWORD = 'correct-horse';

const ROOM_NOT_FOUND = {
  statusCode: 404,
  code: 'NOT_FOUND',
  message: 'Room not found',
};
const WRONG_PASSWORD = {
  statusCode: 403,
  code: 'FORBIDDEN',
  message: 'Wrong room password',
};

describe('Rooms join, leave, and private rooms (e2e)', () => {
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

  async function publicRoom() {
    const owner = await signInNewUser(app);
    const res = await owner.agent
      .post('/rooms')
      .send({ name: 'general' })
      .expect(201);
    return { owner, roomId: res.body.id as string };
  }

  async function privateRoom() {
    const owner = await signInNewUser(app);
    const res = await owner.agent
      .post('/rooms')
      .send({ name: 'secret', type: 'PRIVATE', password: PASSWORD })
      .expect(201);
    return { owner, roomId: res.body.id as string };
  }

  function membershipCount(userId: string, roomId: string) {
    return prisma.membership.count({ where: { userId, roomId } });
  }

  describe('POST /rooms with a type', () => {
    it('makes a public room by default', async () => {
      const { owner, roomId } = await publicRoom();

      const room = await prisma.room.findUniqueOrThrow({
        where: { id: roomId },
      });
      expect(room).toMatchObject({
        type: 'PUBLIC',
        passwordHash: null,
        ownerId: owner.userId,
      });
    });

    it('stores an argon2 hash, and never answers with it', async () => {
      const owner = await signInNewUser(app);

      const res = await owner.agent
        .post('/rooms')
        .send({ name: 'secret', type: 'PRIVATE', password: PASSWORD })
        .expect(201);

      expect(res.body).toEqual({
        id: expect.any(String),
        name: 'secret',
        description: null,
        type: 'PRIVATE',
        ownerId: owner.userId,
        createdAt: expect.any(String),
        isMember: true,
      });
      const room = await prisma.room.findUniqueOrThrow({
        where: { id: res.body.id },
      });
      expect(room.passwordHash).toMatch(/^\$argon2id\$/);
      expect(room.passwordHash).not.toContain(PASSWORD);
    });

    it.each([
      ['no password', { type: 'PRIVATE' }],
      ['a short password', { type: 'PRIVATE', password: 'x'.repeat(7) }],
      ['a long password', { type: 'PRIVATE', password: 'x'.repeat(129) }],
      ['a password on a public room', { password: PASSWORD }],
      [
        'a password and an explicit PUBLIC',
        { type: 'PUBLIC', password: PASSWORD },
      ],
    ])('answers 422 for %s and writes nothing', async (_, body) => {
      const owner = await signInNewUser(app);

      const res = await owner.agent
        .post('/rooms')
        .send({ name: 'secret', ...body })
        .expect(422);

      expect(res.body.code).toBe('VALIDATION_FAILED');
      expect(Object.keys(res.body.fields)).toEqual(['password']);
      expect(await prisma.room.count()).toBe(0);
    });

    it('answers 422 for an unknown type', async () => {
      const owner = await signInNewUser(app);

      const res = await owner.agent
        .post('/rooms')
        .send({ name: 'secret', type: 'SECRET' })
        .expect(422);

      expect(Object.keys(res.body.fields)).toEqual(['type']);
    });
  });

  describe('GET /rooms', () => {
    it('shows every room with its type and no password fields', async () => {
      await publicRoom();
      await privateRoom();
      const viewer = await signInNewUser(app);

      const res = await viewer.agent.get('/rooms').expect(200);

      expect(
        res.body.map((room: { type: string; isMember: boolean }) => [
          room.type,
          room.isMember,
        ]),
      ).toEqual([
        ['PUBLIC', false],
        ['PRIVATE', false],
      ]);
      expect(JSON.stringify(res.body)).not.toMatch(/password/i);
    });
  });

  describe('POST /rooms/:id/join', () => {
    it('adds a new user to a public room, with no body', async () => {
      const { roomId } = await publicRoom();
      const user = await signInNewUser(app);

      const res = await user.agent.post(`/rooms/${roomId}/join`).expect(200);

      expect(res.body).toMatchObject({ id: roomId, isMember: true });
      expect(
        await prisma.membership.findUniqueOrThrow({
          where: { userId_roomId: { userId: user.userId, roomId } },
        }),
      ).toMatchObject({ role: 'MEMBER' });
      const list = await user.agent.get('/rooms').expect(200);
      expect(list.body[0].isMember).toBe(true);
    });

    it('ignores a password sent to a public room', async () => {
      const { roomId } = await publicRoom();
      const user = await signInNewUser(app);

      await user.agent
        .post(`/rooms/${roomId}/join`)
        .send({ password: 'whatever' })
        .expect(200);

      expect(await membershipCount(user.userId, roomId)).toBe(1);
    });

    it('adds a user to a private room with the right password', async () => {
      const { roomId } = await privateRoom();
      const user = await signInNewUser(app);

      const res = await user.agent
        .post(`/rooms/${roomId}/join`)
        .send({ password: PASSWORD })
        .expect(200);

      expect(res.body).toEqual({
        id: roomId,
        name: 'secret',
        description: null,
        type: 'PRIVATE',
        ownerId: expect.any(String),
        createdAt: expect.any(String),
        isMember: true,
      });
    });

    it.each([
      ['wrong', { password: 'wrong-horse' }],
      ['short and wrong', { password: 'x' }],
      ['empty', { password: '' }],
      ['null', { password: null }],
      ['missing', {}],
    ])('answers 403 for a %s password and adds nobody', async (_, body) => {
      const { roomId } = await privateRoom();
      const user = await signInNewUser(app);

      const res = await user.agent
        .post(`/rooms/${roomId}/join`)
        .send(body)
        .expect(403);

      expect(res.body).toEqual(WRONG_PASSWORD);
      expect(await membershipCount(user.userId, roomId)).toBe(0);
    });

    it('answers 403 with no body at all', async () => {
      const { roomId } = await privateRoom();
      const user = await signInNewUser(app);

      const res = await user.agent.post(`/rooms/${roomId}/join`).expect(403);

      expect(res.body).toEqual(WRONG_PASSWORD);
    });

    it('does not trim, so a password with extra spaces is wrong', async () => {
      const { roomId } = await privateRoom();
      const user = await signInNewUser(app);

      await user.agent
        .post(`/rooms/${roomId}/join`)
        .send({ password: ` ${PASSWORD} ` })
        .expect(403);
    });

    it.each([
      ['a number', { password: 123 }, 'password'],
      ['too long', { password: 'x'.repeat(129) }, 'password'],
      ['an unknown property', { role: 'OWNER' }, 'role'],
    ])('answers 422 for %s', async (_, body, field) => {
      const { roomId } = await privateRoom();
      const user = await signInNewUser(app);

      const res = await user.agent
        .post(`/rooms/${roomId}/join`)
        .send(body)
        .expect(422);

      expect(Object.keys(res.body.fields)).toEqual([field]);
      expect(await membershipCount(user.userId, roomId)).toBe(0);
    });

    it('answers 200 again to a member, with no password and one row', async () => {
      const { roomId } = await privateRoom();
      const user = await signInNewUser(app);
      await user.agent
        .post(`/rooms/${roomId}/join`)
        .send({ password: PASSWORD })
        .expect(200);

      const res = await user.agent.post(`/rooms/${roomId}/join`).expect(200);

      expect(res.body.isMember).toBe(true);
      expect(await membershipCount(user.userId, roomId)).toBe(1);
    });

    it('answers 200 to the owner, who stays OWNER', async () => {
      const { owner, roomId } = await privateRoom();

      await owner.agent.post(`/rooms/${roomId}/join`).expect(200);

      expect(
        await prisma.membership.findUniqueOrThrow({
          where: { userId_roomId: { userId: owner.userId, roomId } },
        }),
      ).toMatchObject({ role: 'OWNER' });
    });

    it('gives 200 to every join at the same time, and leaves one row', async () => {
      const { roomId } = await publicRoom();
      const user = await signInNewUser(app);

      const results = await Promise.all(
        // 5 is the join limit per user + room (L-06).
        Array.from({ length: 5 }, () =>
          user.agent.post(`/rooms/${roomId}/join`),
        ),
      );

      expect(results.map((res) => res.status)).toEqual(Array(5).fill(200));
      expect(await membershipCount(user.userId, roomId)).toBe(1);
    });

    it('answers 404 for an unknown id and for a malformed one', async () => {
      const user = await signInNewUser(app);

      for (const id of [UNKNOWN_ID, 'abc']) {
        const res = await user.agent.post(`/rooms/${id}/join`).expect(404);
        expect(res.body).toEqual(ROOM_NOT_FOUND);
      }
    });

    it('makes the real foreign key error (P2003) a 404 path', async () => {
      const user = await signInNewUser(app);

      await expect(
        app.get(RoomsRepository).addMember(user.userId, UNKNOWN_ID),
      ).rejects.toMatchObject({ code: 'P2003' });
    });

    it('answers 401 without a session', async () => {
      const { roomId } = await publicRoom();

      await request(app.getHttpServer())
        .post(`/rooms/${roomId}/join`)
        .expect(401);
    });
  });

  describe('POST /rooms/:id/leave', () => {
    it('removes a member, and a private room then needs the password', async () => {
      const { roomId } = await privateRoom();
      const user = await signInNewUser(app);
      await user.agent
        .post(`/rooms/${roomId}/join`)
        .send({ password: PASSWORD })
        .expect(200);

      const res = await user.agent.post(`/rooms/${roomId}/leave`).expect(204);

      expect(res.text).toBe('');
      const list = await user.agent.get('/rooms').expect(200);
      expect(list.body[0].isMember).toBe(false);
      await user.agent.post(`/rooms/${roomId}/join`).expect(403);
    });

    it('answers 204 to someone who is not a member, and changes nothing', async () => {
      const { owner, roomId } = await publicRoom();
      const user = await signInNewUser(app);

      await user.agent.post(`/rooms/${roomId}/leave`).expect(204);

      expect(await membershipCount(owner.userId, roomId)).toBe(1);
    });

    it('refuses the owner and keeps their membership', async () => {
      const { owner, roomId } = await publicRoom();

      const res = await owner.agent.post(`/rooms/${roomId}/leave`).expect(403);

      expect(res.body).toEqual({
        statusCode: 403,
        code: 'FORBIDDEN',
        message: 'Delete the room instead',
      });
      expect(await membershipCount(owner.userId, roomId)).toBe(1);
    });

    it('answers 404 for an unknown id and for a malformed one', async () => {
      const user = await signInNewUser(app);

      for (const id of [UNKNOWN_ID, 'abc']) {
        const res = await user.agent.post(`/rooms/${id}/leave`).expect(404);
        expect(res.body).toEqual(ROOM_NOT_FOUND);
      }
    });

    it('answers 401 without a session', async () => {
      const { roomId } = await publicRoom();

      await request(app.getHttpServer())
        .post(`/rooms/${roomId}/leave`)
        .expect(401);
    });
  });

  describe('PATCH /rooms/:id with a password', () => {
    it('swaps the password and keeps existing members', async () => {
      const { owner, roomId } = await privateRoom();
      const member = await signInNewUser(app);
      await member.agent
        .post(`/rooms/${roomId}/join`)
        .send({ password: PASSWORD })
        .expect(200);

      const res = await owner.agent
        .patch(`/rooms/${roomId}`)
        .send({ password: 'new-password' })
        .expect(200);

      expect(JSON.stringify(res.body)).not.toMatch(/password/i);
      expect(await membershipCount(member.userId, roomId)).toBe(1);

      const newcomer = await signInNewUser(app);
      await newcomer.agent
        .post(`/rooms/${roomId}/join`)
        .send({ password: PASSWORD })
        .expect(403);
      await newcomer.agent
        .post(`/rooms/${roomId}/join`)
        .send({ password: 'new-password' })
        .expect(200);
    });

    it('makes a member who left use the new password', async () => {
      const { owner, roomId } = await privateRoom();
      const member = await signInNewUser(app);
      await member.agent
        .post(`/rooms/${roomId}/join`)
        .send({ password: PASSWORD })
        .expect(200);
      await owner.agent
        .patch(`/rooms/${roomId}`)
        .send({ password: 'new-password' })
        .expect(200);
      await member.agent.post(`/rooms/${roomId}/leave`).expect(204);

      await member.agent
        .post(`/rooms/${roomId}/join`)
        .send({ password: PASSWORD })
        .expect(403);
      await member.agent
        .post(`/rooms/${roomId}/join`)
        .send({ password: 'new-password' })
        .expect(200);
    });

    it('keeps the old password when a rename sends none', async () => {
      const { owner, roomId } = await privateRoom();

      await owner.agent
        .patch(`/rooms/${roomId}`)
        .send({ name: 'renamed' })
        .expect(200);

      const user = await signInNewUser(app);
      await user.agent
        .post(`/rooms/${roomId}/join`)
        .send({ password: PASSWORD })
        .expect(200);
    });

    it('answers 422 with fields for a password on a public room', async () => {
      const { owner, roomId } = await publicRoom();

      const res = await owner.agent
        .patch(`/rooms/${roomId}`)
        .send({ password: 'new-password' })
        .expect(422);

      expect(res.body).toEqual({
        statusCode: 422,
        code: 'VALIDATION_FAILED',
        message: 'Validation failed',
        fields: { password: ['password is only for private rooms'] },
      });
      const room = await prisma.room.findUniqueOrThrow({
        where: { id: roomId },
      });
      expect(room.passwordHash).toBeNull();
    });

    it.each([
      ['null', { password: null }, 'password'],
      ['too short', { password: 'short' }, 'password'],
      ['a change of type', { type: 'PRIVATE' }, 'type'],
    ])('answers 422 for %s', async (_, body, field) => {
      const { owner, roomId } = await privateRoom();

      const res = await owner.agent
        .patch(`/rooms/${roomId}`)
        .send(body)
        .expect(422);

      expect(Object.keys(res.body.fields)).toEqual([field]);
    });

    it('answers 403 to a signed-in user who is not the owner', async () => {
      const { roomId } = await privateRoom();
      const user = await signInNewUser(app);

      await user.agent
        .patch(`/rooms/${roomId}`)
        .send({ password: 'new-password' })
        .expect(403);
    });
  });

  describe('DELETE /rooms/:id', () => {
    it('removes other members too', async () => {
      const { owner, roomId } = await publicRoom();
      const member = await signInNewUser(app);
      await member.agent.post(`/rooms/${roomId}/join`).expect(200);

      await owner.agent.delete(`/rooms/${roomId}`).expect(204);

      expect(await prisma.membership.count({ where: { roomId } })).toBe(0);
    });
  });
});
