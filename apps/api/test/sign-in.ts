import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';

const WEB_ORIGIN = 'http://localhost:3000';
const realFetch = globalThis.fetch;
let nextUserId = 1;

/**
 * Signs a brand-new GitHub user in through Better Auth's real OAuth flow and
 * returns a supertest agent holding the session cookie. Only GitHub's own
 * HTTP calls are faked, so no test ever reaches github.com.
 */
export async function signInNewUser(app: INestApplication<App>) {
  const githubId = 900_000 + nextUserId++;
  const login = `user${githubId}`;
  const agent = request.agent(app.getHttpServer());

  const start = await agent
    .post('/api/auth/sign-in/social')
    .set('Origin', WEB_ORIGIN)
    // A distinct IP per sign-in keeps Better Auth's 10/min limit out of the way.
    .set('X-Forwarded-For', `198.51.100.${githubId % 250}`)
    .send({ provider: 'github', callbackURL: '/' })
    .expect(200);
  const state = new URL(start.body.url).searchParams.get('state');

  const fetchSpy = vi
    .spyOn(globalThis, 'fetch')
    .mockImplementation(async (input, init) => {
      const url = input instanceof Request ? input.url : String(input);
      if (url.startsWith('https://github.com/login/oauth/access_token')) {
        return Response.json({
          access_token: 'gho_fake',
          token_type: 'bearer',
        });
      }
      if (url === 'https://api.github.com/user') {
        return Response.json({
          id: githubId,
          login,
          name: login,
          avatar_url: null,
          email: null,
        });
      }
      if (url === 'https://api.github.com/user/emails') {
        return Response.json([
          { email: `${login}@users.example`, primary: true, verified: true },
        ]);
      }
      return realFetch(input, init);
    });
  try {
    await agent
      .get('/api/auth/callback/github')
      .query({ code: 'fake-code', state })
      .expect(302);
  } finally {
    fetchSpy.mockRestore();
  }

  const me = await agent.get('/me').expect(200);
  return { agent, userId: me.body.id as string };
}
