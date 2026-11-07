import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { ListMessagesDto } from './list-messages.dto.js';
import { encodeCursor } from './message-cursor.js';

/** Runs the same transform + validation the global ValidationPipe runs. */
function check(query: Record<string, unknown>) {
  const dto = plainToInstance(ListMessagesDto, query);
  const errors = validateSync(dto, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  return { dto, failed: errors.map((error) => error.property) };
}

const CURSOR = encodeCursor({
  createdAt: new Date('2026-11-06T14:00:00.000Z'),
  id: 'cmessage00000000000000001',
});

describe('ListMessagesDto', () => {
  it('defaults limit to 30 and leaves cursor out', () => {
    const { dto, failed } = check({});

    expect(failed).toEqual([]);
    expect(dto.limit).toBe(30);
    expect(dto.cursor).toBeUndefined();
  });

  it('turns the limit from the query string into a number', () => {
    expect(check({ limit: '50' }).dto.limit).toBe(50);
  });

  it('accepts a real cursor', () => {
    expect(check({ cursor: CURSOR }).failed).toEqual([]);
  });

  it.each([
    ['over the maximum', '51'],
    ['zero', '0'],
    ['negative', '-1'],
    ['not a number', 'abc'],
    ['a fraction', '1.5'],
    ['empty', ''],
    ['sent twice', ['10', '20']],
  ])('rejects a limit that is %s', (_name, limit) => {
    expect(check({ limit }).failed).toEqual(['limit']);
  });

  it.each([
    ['malformed', 'not-a-cursor'],
    ['empty', ''],
    ['sent twice', [CURSOR, CURSOR]],
  ])('rejects a cursor that is %s', (_name, cursor) => {
    expect(check({ cursor }).failed).toEqual(['cursor']);
  });

  it('rejects unknown query params', () => {
    expect(check({ page: '2' }).failed).toEqual(['page']);
  });
});
