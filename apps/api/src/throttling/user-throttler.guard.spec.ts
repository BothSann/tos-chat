import { Test } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import { UserThrottlerGuard } from './user-throttler.guard.js';

describe('UserThrottlerGuard', () => {
  let guard: UserThrottlerGuard;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot({
          throttlers: [{ ttl: 60_000, limit: 100 }],
        }),
      ],
      providers: [UserThrottlerGuard],
    }).compile();
    guard = moduleRef.get(UserThrottlerGuard);
  });

  it('tracks a signed-in request by user id', async () => {
    await expect(
      guard['getTracker']({ user: { id: 'user-1' }, ip: '203.0.113.9' }),
    ).resolves.toBe('user-1');
  });

  it('tracks an anonymous request by IP', async () => {
    await expect(
      guard['getTracker']({ user: null, ip: '203.0.113.9' }),
    ).resolves.toBe('203.0.113.9');
  });
});
