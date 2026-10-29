import { validateEnv } from './env.js';

const DATABASE_URL = 'postgresql://tos:tos@127.0.0.1:5432/tos_chat';

describe('validateEnv', () => {
  it('applies defaults when only DATABASE_URL is set', () => {
    expect(validateEnv({ DATABASE_URL })).toEqual({
      NODE_ENV: 'development',
      PORT: 4000,
      DATABASE_URL,
    });
  });

  it('coerces PORT from the string an env file provides', () => {
    expect(validateEnv({ DATABASE_URL, PORT: '4101' }).PORT).toBe(4101);
  });

  it('refuses to boot without DATABASE_URL', () => {
    expect(() => validateEnv({})).toThrow(/DATABASE_URL/);
  });

  it('refuses a non-Postgres DATABASE_URL', () => {
    expect(() =>
      validateEnv({ DATABASE_URL: 'mysql://u:p@127.0.0.1/db' }),
    ).toThrow(/DATABASE_URL/);
  });

  it('refuses an unknown NODE_ENV', () => {
    expect(() => validateEnv({ DATABASE_URL, NODE_ENV: 'staging' })).toThrow(
      /NODE_ENV/,
    );
  });

  it('refuses a PORT outside 1-65535', () => {
    expect(() => validateEnv({ DATABASE_URL, PORT: '70000' })).toThrow(/PORT/);
  });
});
