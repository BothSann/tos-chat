import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { UserThrottlerGuard } from './user-throttler.guard.js';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60_000,
          limit: 100,
        },
        {
          name: 'joinRoom',
          ttl: 60_000,
          limit: Number.MAX_SAFE_INTEGER,
          setHeaders: false,
        },
      ],
      errorMessage: 'Too many requests',
    }),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: UserThrottlerGuard,
    },
  ],
})
export class ThrottlingModule {}
