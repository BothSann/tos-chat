import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
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
});
