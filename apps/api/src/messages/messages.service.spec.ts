import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { RoomsService } from '../rooms/rooms.service.js';
import { decodeCursor, encodeCursor } from './message-cursor.js';
import { type Message, MessagesRepository } from './messages.repository.js';
import { MessagesService } from './messages.service.js';

function message(minute: number): Message {
  return {
    id: `cmessage${String(minute).padStart(17, '0')}`,
    roomId: 'croom1',
    content: `message ${minute}`,
    createdAt: new Date(Date.UTC(2026, 10, 6, 14, minute)),
    author: { id: 'cuser1', displayName: 'Sam', avatarUrl: null },
  };
}

describe('MessagesService', () => {
  const repository = { findPage: vi.fn() };
  const rooms = { assertMember: vi.fn() };
  let service: MessagesService;

  beforeEach(async () => {
    vi.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        MessagesService,
        { provide: MessagesRepository, useValue: repository },
        { provide: RoomsService, useValue: rooms },
      ],
    }).compile();
    service = moduleRef.get(MessagesService);
  });

  it('asks for one row more than the limit', async () => {
    repository.findPage.mockResolvedValue([]);

    await service.list('cuser1', 'croom1', { limit: 30 });

    expect(repository.findPage).toHaveBeenCalledWith('croom1', 31, null);
  });

  it('returns only limit rows, with a cursor at the oldest one', async () => {
    const [newest, oldest, extra] = [message(3), message(2), message(1)];
    repository.findPage.mockResolvedValue([newest, oldest, extra]);

    const page = await service.list('cuser1', 'croom1', { limit: 2 });

    expect(page.items).toEqual([newest, oldest]);
    expect(page.nextCursor).toBe(encodeCursor(oldest));
  });

  it('gives no cursor when exactly limit rows are left', async () => {
    repository.findPage.mockResolvedValue([message(2), message(1)]);

    const page = await service.list('cuser1', 'croom1', { limit: 2 });

    expect(page.items).toHaveLength(2);
    expect(page.nextCursor).toBeNull();
  });

  it('answers an empty room with an empty page', async () => {
    repository.findPage.mockResolvedValue([]);

    await expect(
      service.list('cuser1', 'croom1', { limit: 30 }),
    ).resolves.toEqual({ items: [], nextCursor: null });
  });

  it('passes the decoded cursor to the repository', async () => {
    repository.findPage.mockResolvedValue([]);
    const cursor = encodeCursor(message(5));

    await service.list('cuser1', 'croom1', { limit: 30, cursor });

    expect(repository.findPage).toHaveBeenCalledWith(
      'croom1',
      31,
      decodeCursor(cursor),
    );
  });

  it('checks membership for this user and room', async () => {
    repository.findPage.mockResolvedValue([]);

    await service.list('cuser1', 'croom1', { limit: 30 });

    expect(rooms.assertMember).toHaveBeenCalledWith('cuser1', 'croom1');
  });

  it.each([
    ['a non-member', new ForbiddenException()],
    ['a missing room', new NotFoundException()],
  ])('reads nothing for %s', async (_name, error) => {
    rooms.assertMember.mockRejectedValue(error);

    await expect(service.list('cuser1', 'croom1', { limit: 30 })).rejects.toBe(
      error,
    );
    expect(repository.findPage).not.toHaveBeenCalled();
  });
});
