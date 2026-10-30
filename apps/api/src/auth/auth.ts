import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service.js';
import { Env } from '../config/env.js';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';

const DAY_IN_SECONDS = 60 * 60 * 24;

export function createAuth(
  prisma: PrismaService,
  config: ConfigService<Env, true>,
) {
  return betterAuth({
    baseURL: config.getOrThrow('BETTER_AUTH_URL', { infer: true }),
    secret: config.getOrThrow('BETTER_AUTH_SECRET', { infer: true }),
    database: prismaAdapter(prisma, { provider: 'postgresql' }),
    user: {
      fields: {
        name: 'displayName',
        image: 'avatarUrl',
      },
    },
    session: {
      expiresIn: 7 * DAY_IN_SECONDS,
      updateAge: DAY_IN_SECONDS,
      cookieCache: { enabled: true, maxAge: 5 * 60 },
    },
    socialProviders: {
      github: {
        clientId: config.getOrThrow('GITHUB_CLIENT_ID', { infer: true }),
        clientSecret: config.getOrThrow('GITHUB_CLIENT_SECRET', {
          infer: true,
        }),
      },
    },
    account: {
      encryptOAuthTokens: true,
    },
    rateLimit: {
      enabled: true,
      storage: 'database',
      window: 60,
      max: 100,
      customRules: { '/sign-in/*': { window: 60, max: 10 } },
    },
    advanced: {
      database: {
        generateId: false,
      },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;
