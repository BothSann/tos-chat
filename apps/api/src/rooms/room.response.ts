import type { RoomType, RoomView } from '@tos-chat/shared';
import { Expose, plainToInstance } from 'class-transformer';
import type { RoomForViewer } from './rooms.repository.js';

export class RoomResponse implements RoomView {
  @Expose() id: string;
  @Expose() name: string;
  @Expose() description: string | null;
  @Expose() type: RoomType;
  @Expose() ownerId: string;
  @Expose() createdAt: string;
  @Expose() isMember: boolean;

  static from(room: RoomForViewer): RoomResponse {
    return plainToInstance(
      RoomResponse,
      {
        ...room,
        createdAt: room.createdAt.toISOString(),
      },
      {
        excludeExtraneousValues: true,
      },
    );
  }
}
