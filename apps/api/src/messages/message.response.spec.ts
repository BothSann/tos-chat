// @Type reads decorator metadata. Nest loads this for the app, but nothing in
// this spec imports Nest.
import 'reflect-metadata';
import { MessagePageResponse, MessageResponse } from './message.response.js';

describe('message responses', () => {
  const message = {
    id: 'cmessage1',
    roomId: 'croom1',
    content: 'hello',
    createdAt: new Date('2026-11-06T14:00:00.000Z'),
    author: { id: 'cuser1', displayName: 'Sam', avatarUrl: null },
  };
  const view = {
    id: 'cmessage1',
    roomId: 'croom1',
    content: 'hello',
    createdAt: '2026-11-06T14:00:00.000Z',
    author: { id: 'cuser1', displayName: 'Sam', avatarUrl: null },
  };

  it('maps a message to the MessageView fields with an ISO createdAt', () => {
    expect(MessageResponse.from(message)).toEqual(view);
  });

  it('drops fields outside the allowlist, even inside author', () => {
    const response = MessageResponse.from({
      ...message,
      authorId: 'cuser1',
      author: { ...message.author, email: 'sam@users.example' },
    } as typeof message);

    expect(response).toEqual(view);
    expect(JSON.stringify(response)).not.toContain('sam@users.example');
  });

  it('keeps a null nextCursor on the last page', () => {
    const page = MessagePageResponse.from({
      items: [message],
      nextCursor: null,
    });

    expect(page).toEqual({ items: [view], nextCursor: null });
  });

  it('keeps the nextCursor when an older page exists', () => {
    const page = MessagePageResponse.from({
      items: [message],
      nextCursor: 'abc',
    });

    expect(page.nextCursor).toBe('abc');
  });

  it('answers an empty page', () => {
    expect(MessagePageResponse.from({ items: [], nextCursor: null })).toEqual({
      items: [],
      nextCursor: null,
    });
  });
});
