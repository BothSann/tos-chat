import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { JoinRoomDto } from './join-room.dto.js';

/** Runs the same transform + validation the global ValidationPipe runs. */
function check(body: Record<string, unknown>) {
  const dto = plainToInstance(JoinRoomDto, body);
  const errors = validateSync(dto, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  return { dto, failed: errors.map((error) => error.property) };
}

describe('JoinRoomDto', () => {
  it('accepts an empty body', () => {
    expect(check({}).failed).toEqual([]);
  });

  it('has no minimum length, so a short wrong password is just wrong', () => {
    expect(check({ password: 'x' }).failed).toEqual([]);
  });

  it('keeps the password exactly as sent', () => {
    expect(check({ password: ' spaced ' }).dto.password).toBe(' spaced ');
  });

  it('rejects a password that is too long', () => {
    expect(check({ password: 'x'.repeat(129) }).failed).toEqual(['password']);
  });

  it('rejects a password that is not a string', () => {
    expect(check({ password: 123 }).failed).toEqual(['password']);
  });

  it('rejects unknown properties', () => {
    expect(check({ role: 'OWNER' }).failed).toEqual(['role']);
  });
});
