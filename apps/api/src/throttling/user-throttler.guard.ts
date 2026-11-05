import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

interface TrackedRequest {
  user?: { id: string } | null;
  ip?: string;
}

@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  protected override async getTracker(req: TrackedRequest): Promise<string> {
    return req.user?.id ?? super.getTracker(req);
  }
}
