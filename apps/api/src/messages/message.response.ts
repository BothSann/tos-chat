import type { MessagePageView, MessageView, UserView } from '@tos-chat/shared';
import { Expose, plainToInstance, Type } from 'class-transformer';
import type { Message } from './messages.repository.js';
import type { MessagePage } from './messages.service.js';

export class MessageAuthorResponse implements UserView {
  @Expose() id: string;
  @Expose() displayName: string;
  @Expose() avatarUrl: string | null;
}

export class MessageResponse implements MessageView {
  @Expose() id: string;
  @Expose() roomId: string;
  @Expose() content: string;
  @Expose() createdAt: string;

  @Expose()
  @Type(() => MessageAuthorResponse)
  author: MessageAuthorResponse;

  static from(message: Message): MessageResponse {
    return plainToInstance(
      MessageResponse,
      {
        ...message,
        createdAt: message.createdAt.toISOString(),
      },
      {
        excludeExtraneousValues: true,
      },
    );
  }
}

export class MessagePageResponse implements MessagePageView {
  @Expose()
  @Type(() => MessageResponse)
  items: MessageResponse[];

  @Expose() nextCursor: string | null;

  static from(page: MessagePage): MessagePageResponse {
    return plainToInstance(
      MessagePageResponse,
      {
        items: page.items.map((message) => MessageResponse.from(message)),
        nextCursor: page.nextCursor,
      },
      {
        excludeExtraneousValues: true,
      },
    );
  }
}
