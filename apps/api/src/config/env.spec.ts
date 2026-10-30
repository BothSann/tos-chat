import { validateEnv } from './env.js';

const DATABASE_URL = 'postgresql://tos:tos@127.0.0.1:5432/tos_chat';
const required = {
  DATABASE_URL,
  BETTER_AUTH_SECRET: 'a-test-secret-that-is-at-least-32-chars',
  BETTER_AUTH_URL: 'http://localhost:3000',
  GITHUB_CLIENT_ID: 'client-id',
  GITHUB_CLIENT_SECRET: 'client-secret',
};

describe('validateEnv', () => {
  it('applies defaults when only the required variables are set', () => {
    expect(validateEnv(required)).toEqual({
      NODE_ENV: 'development',
      PORT: 4000,
      ...required,
    });
  });

  it('coerces PORT from the string an env file provides', () => {
    expect(validateEnv({ ...required, PORT: '4101' }).PORT).toBe(4101);
  });

  it('refuses to boot without DATABASE_URL', () => {
    const { DATABASE_URL: _, ...rest } = required;
    expect(() => validateEnv(rest)).toThrow(/DATABASE_URL/);
  });

  it('refuses a non-Postgres DATABASE_URL', () => {
    expect(() =>
      validateEnv({ ...required, DATABASE_URL: 'mysql://u:p@127.0.0.1/db' }),
    ).toThrow(/DATABASE_URL/);
  });

  it('refuses an unknown NODE_ENV', () => {
    expect(() => validateEnv({ ...required, NODE_ENV: 'staging' })).toThrow(
      /NODE_ENV/,
    );
  });

  it('refuses a PORT outside 1-65535', () => {
    expect(() => validateEnv({ ...required, PORT: '70000' })).toThrow(/PORT/);
  });

  it('refuses a BETTER_AUTH_SECRET shorter than 32 characters', () => {
    expect(() =>
      validateEnv({ ...required, BETTER_AUTH_SECRET: 'too-short' }),
    ).toThrow(/BETTER_AUTH_SECRET/);
  });

  it('refuses a BETTER_AUTH_URL that is not http(s)', () => {
    expect(() =>
      validateEnv({ ...required, BETTER_AUTH_URL: 'localhost:3000' }),
    ).toThrow(/BETTER_AUTH_URL/);
  });

  it.each(['GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET'] as const)(
    'refuses to boot without %s',
    (name) => {
      const { [name]: _, ...rest } = required;
      expect(() => validateEnv(rest)).toThrow(new RegExp(name));
    },
  );
});
