import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerLimitDetail } from '@nestjs/throttler';

interface TrackedRequest {
  user?: { id: string } | null;
  ip?: string;
}

@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  protected override async getTracker(req: TrackedRequest): Promise<string> {
    return req.user?.id ?? super.getTracker(req);
  }

  protected override async throwThrottlingException(
    context: ExecutionContext,
    detail: ThrottlerLimitDetail,
  ): Promise<void> {
    const { res } = this.getRequestResponse(context);
    this.setResponseHeader(res, 'Retry-After', detail.timeToBlockExpire);
    await super.throwThrottlingException(context, detail);
  }
}
