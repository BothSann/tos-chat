import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { UpdateRoomDto } from './update-room.dto.js';

/** Runs the same transform + validation the global ValidationPipe runs. */
function check(body: Record<string, unknown>) {
  const dto = plainToInstance(UpdateRoomDto, body);
  const errors = validateSync(dto, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  return { dto, failed: errors.map((error) => error.property) };
}

describe('UpdateRoomDto', () => {
  it('accepts an empty body and leaves both fields undefined', () => {
    const { dto, failed } = check({});

    expect(failed).toEqual([]);
    expect(dto.name).toBeUndefined();
    expect(dto.description).toBeUndefined();
  });

  it('trims a new name with the same rules as create', () => {
    expect(check({ name: '  random  ' })).toMatchObject({
      dto: { name: 'random' },
      failed: [],
    });
    expect(check({ name: 'ab' }).failed).toEqual(['name']);
    expect(check({ name: 'x'.repeat(41) }).failed).toEqual(['name']);
    expect(check({ name: '   ' }).failed).toEqual(['name']);
  });

  it('rejects a null name, because a name cannot be cleared', () => {
    expect(check({ name: null }).failed).toEqual(['name']);
  });

  it.each([
    ['an empty string', ''],
    ['only spaces', '   '],
    ['null', null],
  ])(
    'turns a description of %s into null, which clears it',
    (_, description) => {
      const { dto, failed } = check({ description });

      expect(failed).toEqual([]);
      expect(dto.description).toBeNull();
    },
  );

  it('trims a new description and caps it at 200 characters', () => {
    expect(check({ description: ' New ' }).dto.description).toBe('New');
    expect(check({ description: 'x'.repeat(201) }).failed).toEqual([
      'description',
    ]);
  });

  it('rejects fields that are not part of a room update', () => {
    expect(check({ ownerId: 'cuser1' }).failed).toEqual(['ownerId']);
  });

  describe('password and type', () => {
    it('accepts a new password of 8 to 128 characters', () => {
      expect(check({ password: 'x'.repeat(8) }).failed).toEqual([]);
      expect(check({ password: 'x'.repeat(128) }).failed).toEqual([]);
    });

    it.each([
      ['null', null],
      ['empty', ''],
      ['too short', 'x'.repeat(7)],
      ['too long', 'x'.repeat(129)],
    ])('rejects a password that is %s', (_, password) => {
      expect(check({ password }).failed).toEqual(['password']);
    });

    it('does not accept type at all', () => {
      expect(check({ type: 'PRIVATE' }).failed).toEqual(['type']);
    });
  });
});
