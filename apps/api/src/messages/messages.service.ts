import { Injectable } from '@nestjs/common';
import { type Message, MessagesRepository } from './messages.repository.js';
import { RoomsService } from '../rooms/rooms.service.js';
import type { ListMessagesDto } from './list-messages.dto.js';
import { decodeCursor, encodeCursor } from './message-cursor.js';

export interface MessagePage {
  items: Message[];
  nextCursor: string | null;
}

@Injectable()
export class MessagesService {
  constructor(
    private readonly messages: MessagesRepository,
    private readonly rooms: RoomsService,
  ) {}

  async list(
    userId: string,
    roomId: string,
    { limit, cursor }: ListMessagesDto,
  ): Promise<MessagePage> {
    await this.rooms.assertMember(userId, roomId);

    const rows = await this.messages.findPage(
      roomId,
      limit + 1,
      cursor === undefined ? null : decodeCursor(cursor),
    );
    const items = rows.slice(0, limit);
    const oldest = items.at(-1);

    return {
      items,
      nextCursor: rows.length > limit && oldest ? encodeCursor(oldest) : null,
    };
  }
}
