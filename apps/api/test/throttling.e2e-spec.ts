import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getStorageToken, ThrottlerStorageService } from '@nestjs/throttler';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { appOptions, configureApp } from '../src/configure-app.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { signInNewUser } from './sign-in.js';

const PASSWORD = 'correct-horse';
const TOO_MANY = {
  statusCode: 429,
  code: 'TOO_MANY_REQUESTS',
  message: 'Too many requests',
};
/** `signInNewUser` calls `GET /me` once, so 99 more reach the limit of 100. */
const REQUESTS_TO_REACH_ME_LIMIT = 99;
const JOIN_LIMIT = 5;
const JOIN_CAP = 20;

describe('Throttling (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let nextRoom = 1;

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

  type Agent = Awaited<ReturnType<typeof signInNewUser>>['agent'];

  async function useUpMeLimit(agent: Agent) {
    for (let i = 0; i < REQUESTS_TO_REACH_ME_LIMIT; i++) {
      await agent.get('/me').expect(200);
    }
  }

  async function createRoom(body: Record<string, unknown> = {}) {
    const owner = await signInNewUser(app);
    const res = await owner.agent
      .post('/rooms')
      .send({ name: `room-${nextRoom++}`, ...body })
      .expect(201);
    return res.body.id as string;
  }

  function privateRoom() {
    return createRoom({ type: 'PRIVATE', password: PASSWORD });
  }

  function membershipCount(userId: string, roomId: string) {
    return prisma.membership.count({ where: { userId, roomId } });
  }

  describe('global limit', () => {
    it('answers 429 on request 101 to one route, with the ApiError body', async () => {
      const { agent } = await signInNewUser(app);
      await useUpMeLimit(agent);

      const res = await agent.get('/me').expect(429);

      expect(res.body).toEqual(TOO_MANY);
      expect(res.headers['retry-after']).toMatch(/^\d+$/);
      expect(JSON.stringify(res.body)).not.toContain('ThrottlerException');
    });

    it('gives a second user on the same IP their own bucket', async () => {
      const first = await signInNewUser(app);
      const second = await signInNewUser(app);
      await useUpMeLimit(first.agent);
      await first.agent.get('/me').expect(429);

      await second.agent.get('/me').expect(200);
    });

    it('counts each route on its own', async () => {
      const { agent } = await signInNewUser(app);
      await useUpMeLimit(agent);
      await agent.get('/me').expect(429);

      await agent.get('/rooms').expect(200);
    });

    it('answers 401, not 429, to requests with no session', async () => {
      for (let i = 0; i < 105; i++) {
        await request(app.getHttpServer()).get('/me').expect(401);
      }
    });

    it('never limits GET /health', async () => {
      for (let i = 0; i < 105; i++) {
        const res = await request(app.getHttpServer())
          .get('/health')
          .expect(200);
        expect(res.headers['x-ratelimit-limit']).toBeUndefined();
      }
    });

    it('leaves /api/auth/* to the Better Auth limiter', async () => {
      const { agent } = await signInNewUser(app);

      const me = await agent.get('/me').expect(200);
      const session = await agent.get('/api/auth/get-session').expect(200);

      expect(me.headers['x-ratelimit-limit']).toBe('100');
      expect(session.headers['x-ratelimit-limit']).toBeUndefined();
    });
  });

  describe('POST /rooms/:id/join', () => {
    it('refuses attempt 6, even with the right password', async () => {
      const roomId = await privateRoom();
      const user = await signInNewUser(app);

      for (let i = 0; i < JOIN_LIMIT; i++) {
        await user.agent
          .post(`/rooms/${roomId}/join`)
          .send({ password: 'wrong-password' })
          .expect(403);
      }
      const res = await user.agent
        .post(`/rooms/${roomId}/join`)
        .send({ password: PASSWORD })
        .expect(429);

      expect(res.body).toEqual(TOO_MANY);
      expect(res.headers['retry-after']).toMatch(/^\d+$/);
      expect(await membershipCount(user.userId, roomId)).toBe(0);
    });

    it('counts every attempt on a public room too', async () => {
      const roomId = await createRoom();
      const user = await signInNewUser(app);

      for (let i = 0; i < JOIN_LIMIT; i++) {
        await user.agent.post(`/rooms/${roomId}/join`).expect(200);
      }

      await user.agent.post(`/rooms/${roomId}/join`).expect(429);
      expect(await membershipCount(user.userId, roomId)).toBe(1);
    });

    it('keeps other rooms, other routes, and other users open', async () => {
      const roomId = await createRoom();
      const otherRoomId = await createRoom();
      const user = await signInNewUser(app);
      const otherUser = await signInNewUser(app);
      for (let i = 0; i < JOIN_LIMIT; i++) {
        await user.agent.post(`/rooms/${roomId}/join`).expect(200);
      }
      await user.agent.post(`/rooms/${roomId}/join`).expect(429);

      await user.agent.post(`/rooms/${otherRoomId}/join`).expect(200);
      await user.agent.get('/rooms').expect(200);
      await user.agent.post(`/rooms/${roomId}/leave`).expect(204);
      await otherUser.agent.post(`/rooms/${roomId}/join`).expect(200);
    });

    it('allows only 5 of 8 joins sent at the same time', async () => {
      const roomId = await createRoom();
      const user = await signInNewUser(app);

      const results = await Promise.all(
        Array.from({ length: 8 }, () =>
          user.agent.post(`/rooms/${roomId}/join`),
        ),
      );

      const statuses = results.map((res) => res.status).sort((a, b) => a - b);
      expect(statuses).toEqual([200, 200, 200, 200, 200, 429, 429, 429]);
      expect(await membershipCount(user.userId, roomId)).toBe(1);
    });

    it('still answers 404 for a malformed id', async () => {
      const user = await signInNewUser(app);

      await user.agent.post('/rooms/abc/join').expect(404);
    });
  });

  describe('join cap per user', () => {
    /** Uses up the whole cap: the most one room allows, on as few rooms as it takes. */
    async function useUpJoinCap(agent: Agent) {
      for (let room = 0; room < JOIN_CAP / JOIN_LIMIT; room++) {
        const roomId = await createRoom();
        for (let i = 0; i < JOIN_LIMIT; i++) {
          await agent.post(`/rooms/${roomId}/join`).expect(200);
        }
      }
    }

    it('refuses attempt 21 across different rooms, with the ApiError body', async () => {
      const lastRoomId = await createRoom();
      const user = await signInNewUser(app);
      await useUpJoinCap(user.agent);

      const res = await user.agent
        .post(`/rooms/${lastRoomId}/join`)
        .expect(429);

      expect(res.body).toEqual(TOO_MANY);
      expect(res.headers['retry-after']).toMatch(/^\d+$/);
      expect(await membershipCount(user.userId, lastRoomId)).toBe(0);
    });

    it('counts attempts the per-room limit refused', async () => {
      const roomId = await createRoom();
      const otherRoomId = await createRoom();
      const user = await signInNewUser(app);
      for (let i = 0; i < JOIN_LIMIT; i++) {
        await user.agent.post(`/rooms/${roomId}/join`).expect(200);
      }
      for (let i = JOIN_LIMIT; i < JOIN_CAP; i++) {
        await user.agent.post(`/rooms/${roomId}/join`).expect(429);
      }

      await user.agent.post(`/rooms/${otherRoomId}/join`).expect(429);

      expect(await membershipCount(user.userId, otherRoomId)).toBe(0);
    });

    it('sends only the standard headers on join', async () => {
      const roomId = await createRoom();
      const user = await signInNewUser(app);
      let last = await user.agent.post(`/rooms/${roomId}/join`).expect(200);
      expect(last.headers['x-ratelimit-limit']).toBe(String(JOIN_CAP));
      expect(last.headers['x-ratelimit-limit-joinroom']).toBeUndefined();

      for (let i = 1; i <= JOIN_LIMIT; i++) {
        last = await user.agent.post(`/rooms/${roomId}/join`);
      }

      expect(last.status).toBe(429);
      expect(last.body).toEqual(TOO_MANY);
      expect(last.headers['retry-after']).toMatch(/^\d+$/);
      expect(last.headers['retry-after-joinroom']).toBeUndefined();
    });

    it('keeps a second user on the same IP open', async () => {
      const roomId = await createRoom();
      const user = await signInNewUser(app);
      const otherUser = await signInNewUser(app);
      await useUpJoinCap(user.agent);
      await user.agent.post(`/rooms/${roomId}/join`).expect(429);

      await otherUser.agent.post(`/rooms/${roomId}/join`).expect(200);
    });

    it('leaves other routes on their own limit', async () => {
      const user = await signInNewUser(app);
      await useUpJoinCap(user.agent);

      const me = await user.agent.get('/me').expect(200);

      expect(me.headers['x-ratelimit-limit']).toBe('100');
      expect(me.headers['x-ratelimit-limit-joinroom']).toBeUndefined();
    });

    it('sends no rate-limit headers on GET /health', async () => {
      const res = await request(app.getHttpServer()).get('/health').expect(200);

      const names = Object.keys(res.headers);
      expect(
        names.filter((name) => /ratelimit|retry-after/.test(name)),
      ).toEqual([]);
    });

    /** Names the throttlers that counted a request, in the order they ran. */
    async function throttlersThatCounted(send: () => Promise<unknown>) {
      const increment = vi.spyOn(
        app.get<ThrottlerStorageService>(getStorageToken()),
        'increment',
      );
      await send();
      const names = increment.mock.calls.map((call) => call[4]);
      increment.mockRestore();
      return names;
    }

    it('counts both throttlers on join, in order', async () => {
      const roomId = await createRoom();
      const user = await signInNewUser(app);

      const names = await throttlersThatCounted(() =>
        user.agent.post(`/rooms/${roomId}/join`).expect(200),
      );

      expect(names).toEqual(['default', 'joinRoom']);
    });

    it('counts neither throttler on GET /health', async () => {
      const names = await throttlersThatCounted(() =>
        request(app.getHttpServer()).get('/health').expect(200),
      );

      expect(names).toEqual([]);
    });

    it('stops before the room counter once a user is over the cap', async () => {
      const user = await signInNewUser(app);
      for (let i = 0; i < JOIN_CAP; i++) {
        await user.agent.post(`/rooms/not-an-id-${i}/join`).expect(404);
      }

      const names = await throttlersThatCounted(() =>
        user.agent.post('/rooms/one-more-id/join').expect(429),
      );

      expect(names).toEqual(['default']);
    });

    it('counts malformed ids, and keeps their 404 under the cap', async () => {
      const user = await signInNewUser(app);
      for (let i = 0; i < JOIN_CAP; i++) {
        await user.agent.post(`/rooms/not-an-id-${i}/join`).expect(404);
      }

      await user.agent.post('/rooms/not-an-id-last/join').expect(429);
    });
  });
});
