import type { UserView } from '@tos-chat/shared';
import { Expose, plainToInstance } from 'class-transformer';

export interface SessionUser {
  id: string;
  name: string;
  image?: string | null;
}

export class UserResponse implements UserView {
  @Expose() id: string;
  @Expose() displayName: string;
  @Expose() avatarUrl: string | null;

  static from(user: SessionUser): UserResponse {
    return plainToInstance(
      UserResponse,
      {
        id: user.id,
        displayName: user.name,
        avatarUrl: user.image ?? null,
      },
      {
        excludeExtraneousValues: true,
      },
    );
  }
}
