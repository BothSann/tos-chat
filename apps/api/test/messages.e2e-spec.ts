import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { appOptions, configureApp } from '../src/configure-app.js';
import { encodeCursor } from '../src/messages/message-cursor.js';
import { MessagesRepository } from '../src/messages/messages.repository.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { signInNewUser } from './sign-in.js';

/** A well-formed cuid that no row will ever have. */
const UNKNOWN_ID = 'cmissing0000000000000000x';
const START = Date.UTC(2026, 10, 6, 14);

/** A valid cuid that sorts by its number, so tests can state the exact order. */
function messageId(index: number): string {
  return `c${String(index).padStart(24, '0')}`;
}

describe('Message history (e2e)', () => {
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
    // Deleting users cascades to rooms, memberships, and messages.
    await prisma.user.deleteMany();
    await prisma.rateLimit.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  async function publicRoom() {
    const owner = await signInNewUser(app);
    const created = await owner.agent
      .post('/rooms')
      .send({ name: `history-${nextRoom++}` })
      .expect(201);
    return { owner, roomId: created.body.id as string };
  }

  /** Message 0 is the oldest. Each one is a second newer than the last. */
  async function seed(
    roomId: string,
    authorId: string,
    count: number,
    createdAt: (index: number) => Date = (index) =>
      new Date(START + index * 1000),
  ) {
    await prisma.message.createMany({
      data: Array.from({ length: count }, (_, index) => ({
        id: messageId(index),
        roomId,
        authorId,
        content: `message ${index}`,
        createdAt: createdAt(index),
      })),
    });
  }

  function contents(body: { items: { content: string }[] }): string[] {
    return body.items.map((item) => item.content);
  }

  /** `[n, n-1, ..., m]`, the order the API answers in. */
  function newestFirst(from: number, to: number): string[] {
    const expected: string[] = [];
    for (let index = from; index >= to; index--) {
      expected.push(`message ${index}`);
    }
    return expected;
  }

  describe('paging', () => {
    it('gives the newest 30, then the remaining 5 and no cursor', async () => {
      const { owner, roomId } = await publicRoom();
      await seed(roomId, owner.userId, 35);

      const first = await owner.agent
        .get(`/rooms/${roomId}/messages`)
        .expect(200);
      expect(contents(first.body)).toEqual(newestFirst(34, 5));
      expect(first.body.nextCursor).toEqual(expect.any(String));

      const second = await owner.agent
        .get(`/rooms/${roomId}/messages`)
        .query({ cursor: first.body.nextCursor })
        .expect(200);
      expect(contents(second.body)).toEqual(newestFirst(4, 0));
      expect(second.body.nextCursor).toBeNull();
    });

    it('allows a limit of 50', async () => {
      const { owner, roomId } = await publicRoom();
      await seed(roomId, owner.userId, 60);

      const page = await owner.agent
        .get(`/rooms/${roomId}/messages`)
        .query({ limit: 50 })
        .expect(200);

      expect(page.body.items).toHaveLength(50);
      expect(page.body.nextCursor).toEqual(expect.any(String));
    });

    it('returns each message once when every timestamp is the same', async () => {
      const { owner, roomId } = await publicRoom();
      await seed(roomId, owner.userId, 12, () => new Date(START));

      const seen: string[] = [];
      let cursor: string | null | undefined;
      do {
        const page = await owner.agent
          .get(`/rooms/${roomId}/messages`)
          .query({ limit: 5, ...(cursor ? { cursor } : {}) })
          .expect(200);
        seen.push(...contents(page.body));
        cursor = page.body.nextCursor as string | null;
      } while (cursor);

      expect(seen).toEqual(newestFirst(11, 0));
    });

    it('keeps working after the cursor message is hard-deleted', async () => {
      const { owner, roomId } = await publicRoom();
      await seed(roomId, owner.userId, 6);

      const first = await owner.agent
        .get(`/rooms/${roomId}/messages`)
        .query({ limit: 3 })
        .expect(200);
      // Message 3 is the oldest on this page, so the cursor points at it.
      await prisma.message.delete({ where: { id: messageId(3) } });

      const second = await owner.agent
        .get(`/rooms/${roomId}/messages`)
        .query({ limit: 3, cursor: first.body.nextCursor })
        .expect(200);

      expect(contents(second.body)).toEqual(newestFirst(2, 0));
    });

    it('gives no cursor when exactly limit messages are left', async () => {
      const { owner, roomId } = await publicRoom();
      await seed(roomId, owner.userId, 5);

      const page = await owner.agent
        .get(`/rooms/${roomId}/messages`)
        .query({ limit: 5 })
        .expect(200);

      expect(page.body.items).toHaveLength(5);
      expect(page.body.nextCursor).toBeNull();
    });

    it('answers a room with no messages', async () => {
      const { owner, roomId } = await publicRoom();

      const page = await owner.agent
        .get(`/rooms/${roomId}/messages`)
        .expect(200);

      expect(page.body).toEqual({ items: [], nextCursor: null });
    });

    it('does not shift older pages when a new message arrives', async () => {
      const { owner, roomId } = await publicRoom();
      await seed(roomId, owner.userId, 6);

      const first = await owner.agent
        .get(`/rooms/${roomId}/messages`)
        .query({ limit: 3 })
        .expect(200);
      await prisma.message.create({
        data: {
          roomId,
          authorId: owner.userId,
          content: 'brand new',
          createdAt: new Date(START + 60_000),
        },
      });

      const second = await owner.agent
        .get(`/rooms/${roomId}/messages`)
        .query({ limit: 3, cursor: first.body.nextCursor })
        .expect(200);

      expect(contents(second.body)).toEqual(newestFirst(2, 0));
    });

    it('never returns another room, even with its cursor', async () => {
      const { owner, roomId } = await publicRoom();
      const other = await publicRoom();
      await seed(other.roomId, other.owner.userId, 4);

      const otherPage = await other.owner.agent
        .get(`/rooms/${other.roomId}/messages`)
        .query({ limit: 2 })
        .expect(200);

      const page = await owner.agent
        .get(`/rooms/${roomId}/messages`)
        .query({ cursor: otherPage.body.nextCursor })
        .expect(200);

      expect(page.body).toEqual({ items: [], nextCursor: null });
    });
  });

  describe('response body', () => {
    it('gives exactly the MessageView fields, with no email', async () => {
      const { owner, roomId } = await publicRoom();
      await seed(roomId, owner.userId, 1);

      const page = await owner.agent
        .get(`/rooms/${roomId}/messages`)
        .expect(200);

      const author = await prisma.user.findUniqueOrThrow({
        where: { id: owner.userId },
      });
      expect(page.body.items).toEqual([
        {
          id: messageId(0),
          roomId,
          content: 'message 0',
          createdAt: new Date(START).toISOString(),
          author: {
            id: owner.userId,
            displayName: author.displayName,
            avatarUrl: author.avatarUrl,
          },
        },
      ]);
      expect(JSON.stringify(page.body)).not.toContain(author.email);
    });
  });

  describe('who can read', () => {
    it('lets a member who joined read', async () => {
      const { owner, roomId } = await publicRoom();
      await seed(roomId, owner.userId, 2);
      const member = await signInNewUser(app);
      await member.agent.post(`/rooms/${roomId}/join`).send({}).expect(200);

      const page = await member.agent
        .get(`/rooms/${roomId}/messages`)
        .expect(200);

      expect(page.body.items).toHaveLength(2);
    });

    it('refuses a non-member of a public room with 403', async () => {
      const { owner, roomId } = await publicRoom();
      await seed(roomId, owner.userId, 1);
      const stranger = await signInNewUser(app);

      const refused = await stranger.agent
        .get(`/rooms/${roomId}/messages`)
        .expect(403);

      expect(refused.body).toEqual({
        statusCode: 403,
        code: 'FORBIDDEN',
        message: 'Only room members can do this',
      });
    });

    it('refuses a non-member of a private room with 403', async () => {
      const owner = await signInNewUser(app);
      const created = await owner.agent
        .post('/rooms')
        .send({
          name: `history-${nextRoom++}`,
          type: 'PRIVATE',
          password: 'correct-horse',
        })
        .expect(201);
      const stranger = await signInNewUser(app);

      await stranger.agent
        .get(`/rooms/${created.body.id as string}/messages`)
        .expect(403);
    });

    it('refuses a member who left with 403', async () => {
      const { roomId } = await publicRoom();
      const member = await signInNewUser(app);
      await member.agent.post(`/rooms/${roomId}/join`).send({}).expect(200);
      await member.agent.post(`/rooms/${roomId}/leave`).expect(204);

      await member.agent.get(`/rooms/${roomId}/messages`).expect(403);
    });

    it.each([
      ['a room that does not exist', UNKNOWN_ID],
      ['a malformed room id', 'not-a-cuid'],
    ])('gives 404 for %s', async (_name, id) => {
      const user = await signInNewUser(app);

      const refused = await user.agent.get(`/rooms/${id}/messages`).expect(404);

      expect(refused.body).toEqual({
        statusCode: 404,
        code: 'NOT_FOUND',
        message: 'Room not found',
      });
    });

    it('gives 401 with no session', async () => {
      const { roomId } = await publicRoom();

      await request(app.getHttpServer())
        .get(`/rooms/${roomId}/messages`)
        .expect(401);
    });
  });

  describe('validation', () => {
    const ONE_ID = messageId(1);
    function rawCursor(text: string): string {
      return Buffer.from(text).toString('base64url');
    }

    it.each([
      ['limit', { limit: '51' }],
      ['limit', { limit: '0' }],
      ['limit', { limit: 'abc' }],
      ['limit', { limit: '' }],
      ['cursor', { cursor: 'not-a-cursor' }],
      ['cursor', { cursor: '' }],
      ['cursor', { cursor: rawCursor(`0000-01-01T00:00:00.000Z|${ONE_ID}`) }],
      ['cursor', { cursor: rawCursor(`2026-02-31T00:00:00.000Z|${ONE_ID}`) }],
      ['page', { page: '2' }],
    ])(
      'gives 422 with fields.%s for %o, and runs no query',
      async (field, query) => {
        const { owner, roomId } = await publicRoom();
        const findPage = vi.spyOn(app.get(MessagesRepository), 'findPage');

        const refused = await owner.agent
          .get(`/rooms/${roomId}/messages`)
          .query(query)
          .expect(422);

        expect(refused.body.code).toBe('VALIDATION_FAILED');
        expect(refused.body.fields[field]).toEqual(expect.any(Array));
        expect(findPage).not.toHaveBeenCalled();
        findPage.mockRestore();
      },
    );

    it.each([
      ['the latest date a cursor allows', '9999-12-31T23:59:59.999Z', 2],
      ['the earliest date a cursor allows', '1000-01-01T00:00:00.000Z', 0],
    ])('reaches Postgres safely with %s', async (_name, timestamp, count) => {
      const { owner, roomId } = await publicRoom();
      await seed(roomId, owner.userId, 2);

      const page = await owner.agent
        .get(`/rooms/${roomId}/messages`)
        .query({
          cursor: encodeCursor({ createdAt: new Date(timestamp), id: ONE_ID }),
        })
        .expect(200);

      expect(page.body.items).toHaveLength(count);
    });
  });

  describe('schema', () => {
    it('removes messages when their room is deleted', async () => {
      const { owner, roomId } = await publicRoom();
      await seed(roomId, owner.userId, 3);

      await owner.agent.delete(`/rooms/${roomId}`).expect(204);

      await expect(prisma.message.count({ where: { roomId } })).resolves.toBe(
        0,
      );
    });

    it('removes only that user’s messages when a user is deleted', async () => {
      const { owner, roomId } = await publicRoom();
      const member = await signInNewUser(app);
      await seed(roomId, owner.userId, 2);
      await prisma.message.create({
        data: { roomId, authorId: member.userId, content: 'from the member' },
      });

      await prisma.user.delete({ where: { id: member.userId } });

      await expect(
        prisma.message.count({ where: { authorId: member.userId } }),
      ).resolves.toBe(0);
      await expect(prisma.message.count({ where: { roomId } })).resolves.toBe(
        2,
      );
    });

    it('stores 2000 characters and refuses 2001', async () => {
      const { owner, roomId } = await publicRoom();
      const data = { roomId, authorId: owner.userId };

      await prisma.message.create({
        data: { ...data, content: 'x'.repeat(2000) },
      });
      // An emoji is one character to Postgres, though two UTF-16 units to JS.
      await prisma.message.create({
        data: { ...data, content: '😀'.repeat(2000) },
      });

      await expect(
        prisma.message.create({ data: { ...data, content: 'x'.repeat(2001) } }),
      ).rejects.toThrow();
    });
  });
});
