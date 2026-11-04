import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreateRoomDto } from './create-room.dto.js';

/** Apply DTO transforms, then collect fields that fail validation. */
function check(body: Record<string, unknown>) {
  const dto = plainToInstance(CreateRoomDto, body);
  const failed = validateSync(dto).map((error) => error.property);
  return { dto, failed };
}

describe('CreateRoomDto', () => {
  it('accepts a name and trims both fields', () => {
    const { dto, failed } = check({
      name: '  general  ',
      description: ' Say hi ',
    });

    expect(failed).toEqual([]);
    expect(dto).toEqual({ name: 'general', description: 'Say hi' });
  });

  it.each([
    ['too short', 'ab'],
    ['too long', 'x'.repeat(41)],
    ['blank after trimming', '    '],
    ['not a string', 42],
    ['missing', undefined],
  ])('rejects a name that is %s', (_, name) => {
    expect(check({ name }).failed).toEqual(['name']);
  });

  it('accepts names of exactly 3 and 40 characters', () => {
    expect(check({ name: 'abc' }).failed).toEqual([]);
    expect(check({ name: 'x'.repeat(40) }).failed).toEqual([]);
  });

  it('treats a blank description as no description', () => {
    const { dto, failed } = check({ name: 'general', description: '   ' });

    expect(failed).toEqual([]);
    expect(dto.description).toBeUndefined();
  });

  it('rejects a description that is not a string', () => {
    expect(check({ name: 'general', description: 42 }).failed).toEqual([
      'description',
    ]);
  });

  it('rejects a description over 200 characters', () => {
    expect(
      check({ name: 'general', description: 'x'.repeat(201) }).failed,
    ).toEqual(['description']);
  });

  describe('type: @ValidateIf((_, value) => value !== undefined)', () => {
    // `_` is the whole DTO (unused here). `value` is the type field.
    // false = skip every validator on this field; true = run them.
    it('skips @IsIn when type is missing (undefined)', () => {
      expect(check({ name: 'general' }).failed).toEqual([]);
    });

    it('accepts type PUBLIC', () => {
      expect(check({ name: 'general', type: 'PUBLIC' }).failed).toEqual([]);
    });

    it('accepts type PRIVATE with a password', () => {
      expect(
        check({ name: 'general', type: 'PRIVATE', password: 'correct-horse' })
          .failed,
      ).toEqual([]);
    });

    // These values are not undefined, so @IsIn checks and rejects them.
    // Unlike @IsOptional(), this condition does not skip null.
    it.each([null, '', 'OTHER', 42])('rejects type %s', (type) => {
      expect(check({ name: 'general', type }).failed).toEqual(['type']);
    });
  });

  describe('password', () => {
    it('leaves type undefined when it is missing, and needs no password', () => {
      const { dto, failed } = check({ name: 'general' });

      expect(failed).toEqual([]);
      expect(dto.type).toBeUndefined();
    });

    it('accepts a private room with a password of 8 and of 128 characters', () => {
      for (const password of ['x'.repeat(8), 'x'.repeat(128)]) {
        expect(
          check({ name: 'secret', type: 'PRIVATE', password }).failed,
        ).toEqual([]);
      }
    });

    it.each([
      ['missing', undefined],
      ['null', null],
      ['too short', 'x'.repeat(7)],
      ['too long', 'x'.repeat(129)],
      ['not a string', 12345678],
    ])('rejects a private room whose password is %s', (_, password) => {
      expect(
        check({ name: 'secret', type: 'PRIVATE', password }).failed,
      ).toEqual(['password']);
    });

    it('does not trim a password, because spaces can be part of it', () => {
      const { dto, failed } = check({
        name: 'secret',
        type: 'PRIVATE',
        password: '  spaced out  ',
      });

      expect(failed).toEqual([]);
      expect(dto.password).toBe('  spaced out  ');
    });
  });
});
