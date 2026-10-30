import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { appOptions, configureApp } from '../src/configure-app.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

const WEB_ORIGIN = 'http://localhost:3000';

type GithubProfile = {
  id: number;
  login: string;
  name: string | null;
  avatar_url: string;
  email: string | null;
};

const octocat: GithubProfile = {
  id: 583231,
  login: 'octocat',
  name: 'The Octocat',
  avatar_url: 'https://avatars.githubusercontent.com/u/583231',
  email: null,
};

const realFetch = globalThis.fetch;

// Fake only GitHub's three network calls; Better Auth's real flow runs.
function fakeGithub(profile: GithubProfile): void {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = input instanceof Request ? input.url : String(input);
    if (url.startsWith('https://github.com/login/oauth/access_token')) {
      return Response.json({
        access_token: 'gho_fake',
        token_type: 'bearer',
        scope: 'read:user,user:email',
      });
    }
    if (url === 'https://api.github.com/user') return Response.json(profile);
    if (url === 'https://api.github.com/user/emails') {
      return Response.json([
        {
          email: `${profile.login}@users.example`,
          primary: true,
          verified: true,
        },
      ]);
    }
    return realFetch(input, init);
  });
}

describe('GitHub sign-in and GET /me (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = configureApp(moduleRef.createNestApplication(appOptions));
    await app.init();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    // Deleting users cascades to Session and Account.
    await prisma.user.deleteMany();
    await prisma.verification.deleteMany();
    await prisma.rateLimit.deleteMany();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  /** Starts sign-in the way the browser does; returns the agent and GitHub URL. */
  async function startSignIn(ip = '203.0.113.10') {
    const agent = request.agent(app.getHttpServer());
    const res = await agent
      .post('/api/auth/sign-in/social')
      .set('Origin', WEB_ORIGIN)
      .set('X-Forwarded-For', ip)
      .send({ provider: 'github', callbackURL: '/' });
    return { agent, res };
  }

  /** Runs the whole GitHub round trip and returns the signed-in agent. */
  async function signInWithGithub(profile: GithubProfile) {
    const { agent, res } = await startSignIn();
    const state = new URL(res.body.url).searchParams.get('state');
    fakeGithub(profile);
    const callback = await agent
      .get('/api/auth/callback/github')
      .query({ code: 'fake-code', state });
    return { agent, callback };
  }

  it('starts sign-in with a GitHub authorize URL for this app', async () => {
    const { res } = await startSignIn();

    expect(res.status).toBe(200);
    const url = new URL(res.body.url);
    expect(url.origin + url.pathname).toBe(
      'https://github.com/login/oauth/authorize',
    );
    expect(url.searchParams.get('client_id')).toBe('e2e-client-id');
    expect(url.searchParams.get('redirect_uri')).toBe(
      `${WEB_ORIGIN}/api/auth/callback/github`,
    );
    expect(url.searchParams.get('scope')).toBe('read:user user:email');
    expect(url.searchParams.get('state')).toEqual(expect.any(String));
  });

  it('creates one user and one GitHub account on the first login', async () => {
    const { callback } = await signInWithGithub(octocat);

    expect(callback.status).toBe(302);
    expect(callback.headers['location']).toBe('/');
    const users = await prisma.user.findMany({ include: { accounts: true } });
    expect(users).toHaveLength(1);
    expect(users[0]).toMatchObject({
      displayName: 'The Octocat',
      avatarUrl: octocat.avatar_url,
      email: 'octocat@users.example',
      emailVerified: true,
    });
    expect(users[0]?.id).toMatch(/^c[a-z0-9]{24}$/); // Prisma cuid()
    expect(users[0]?.accounts).toMatchObject([
      { providerId: 'github', accountId: String(octocat.id) },
    ]);
  });

  it('uses the GitHub login when the profile has no name', async () => {
    const { agent } = await signInWithGithub({ ...octocat, name: null });

    const me = await agent.get('/me').expect(200);
    expect(me.body.displayName).toBe('octocat');
  });

  it('returns the same user on a repeat login and adds no rows', async () => {
    const first = await signInWithGithub(octocat);
    const firstMe = await first.agent.get('/me').expect(200);
    vi.restoreAllMocks();

    const second = await signInWithGithub(octocat);
    const secondMe = await second.agent.get('/me').expect(200);

    expect(secondMe.body.id).toBe(firstMe.body.id);
    expect(await prisma.user.count()).toBe(1);
    expect(await prisma.account.count()).toBe(1);
    expect(await prisma.session.count()).toBe(2);
  });

  it('answers GET /me with exactly id, displayName, and avatarUrl', async () => {
    const { agent } = await signInWithGithub(octocat);

    const me = await agent.get('/me').expect(200);
    expect(me.body).toEqual({
      id: expect.any(String),
      displayName: 'The Octocat',
      avatarUrl: octocat.avatar_url,
    });
  });

  it('answers GET /me with 401 without a session', async () => {
    await request(app.getHttpServer()).get('/me').expect(401);
  });

  it('answers GET /me with 401 after sign-out', async () => {
    const { agent } = await signInWithGithub(octocat);

    await agent
      .post('/api/auth/sign-out')
      .set('Origin', WEB_ORIGIN)
      .expect(200);
    await agent.get('/me').expect(401);
  });

  it('creates no rows when the user denies access on GitHub', async () => {
    const { agent, res } = await startSignIn();
    const state = new URL(res.body.url).searchParams.get('state');

    const callback = await agent
      .get('/api/auth/callback/github')
      .query({ error: 'access_denied', state });

    expect(callback.status).toBe(302);
    expect(callback.headers['location']).toContain('error=access_denied');
    expect(await prisma.user.count()).toBe(0);
  });

  it('rejects a callback from a browser that never started sign-in', async () => {
    const { res } = await startSignIn();
    const state = new URL(res.body.url).searchParams.get('state');
    fakeGithub(octocat);

    // No state cookie: a different browser replays the callback.
    const callback = await request(app.getHttpServer())
      .get('/api/auth/callback/github')
      .query({ code: 'fake-code', state });

    expect(callback.status).toBe(302);
    expect(callback.headers['location']).toContain('error=');
    expect(await prisma.user.count()).toBe(0);
  });

  it('limits sign-in to 10 requests per minute per IP', async () => {
    for (let i = 0; i < 10; i++) {
      const { res } = await startSignIn('198.51.100.20');
      expect(res.status).toBe(200);
    }

    const { res } = await startSignIn('198.51.100.20');
    expect(res.status).toBe(429);
    const other = await startSignIn('198.51.100.21');
    expect(other.res.status).toBe(200);
  });
});
