import { decodeCursor, encodeCursor } from './message-cursor.js';

const ID = 'cmessage00000000000000001';
const createdAt = new Date('2026-11-06T14:00:00.123Z');

function encodeRaw(text: string): string {
  return Buffer.from(text).toString('base64url');
}

describe('message cursor', () => {
  it('decodes what it encoded, keeping the milliseconds', () => {
    expect(decodeCursor(encodeCursor({ createdAt, id: ID }))).toEqual({
      createdAt,
      id: ID,
    });
  });

  it('makes a cursor that is safe in a URL', () => {
    expect(encodeCursor({ createdAt, id: ID })).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it.each([
    ['an empty string', ''],
    ['text that is not a cursor', 'not-a-cursor'],
    ['no separator', encodeRaw(`2026-11-06T14:00:00.123Z${ID}`)],
    ['no id', encodeRaw('2026-11-06T14:00:00.123Z|')],
    ['no timestamp', encodeRaw(`|${ID}`)],
    ['an extra part', encodeRaw(`2026-11-06T14:00:00.123Z|${ID}|x`)],
    ['a malformed id', encodeRaw('2026-11-06T14:00:00.123Z|not-a-cuid')],
    [
      'a timestamp with no milliseconds',
      encodeRaw(`2026-11-06T14:00:00Z|${ID}`),
    ],
    [
      'a month that does not exist',
      encodeRaw(`2026-13-01T00:00:00.000Z|${ID}`),
    ],
    ['a day that does not exist', encodeRaw(`2026-02-31T00:00:00.000Z|${ID}`)],
    [
      'year 0, which Postgres rejects',
      encodeRaw(`0000-01-01T00:00:00.000Z|${ID}`),
    ],
    ['a six-digit year', encodeRaw(`+010000-01-01T00:00:00.000Z|${ID}`)],
  ])('rejects %s', (_name, cursor) => {
    expect(decodeCursor(cursor)).toBeNull();
  });

  it('rejects a real cursor with junk that the decoder would skip', () => {
    const cursor = encodeCursor({ createdAt, id: ID });

    expect(decodeCursor(`${cursor}!`)).toBeNull();
  });
});
