import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreateRoomDto } from './create-room.dto.js';

/** Runs the same transform + validation the global ValidationPipe runs. */
function check(body: Record<string, unknown>) {
  const dto = plainToInstance(CreateRoomDto, body);
  const errors = validateSync(dto);
  return { dto, failed: errors.map((error) => error.property) };
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
});
