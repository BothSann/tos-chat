import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { MessageCursor } from './message-cursor.js';

export interface MessageAuthor {
  id: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface Message {
  id: string;
  roomId: string;
  content: string;
  createdAt: Date;
  author: MessageAuthor;
}

const messageColumns = {
  id: true,
  roomId: true,
  content: true,
  createdAt: true,
  author: {
    select: {
      id: true,
      displayName: true,
      avatarUrl: true,
    },
  },
} as const;

@Injectable()
export class MessagesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findPage(
    roomId: string,
    take: number,
    before: MessageCursor | null,
  ): Promise<Message[]> {
    return this.prisma.message.findMany({
      where: {
        roomId,
        ...(before && {
          createdAt: { lte: before.createdAt },
          OR: [
            { createdAt: { lt: before.createdAt } },
            { createdAt: before.createdAt, id: { lt: before.id } },
          ],
        }),
      },
      orderBy: [
        {
          createdAt: 'desc',
        },
        {
          id: 'desc',
        },
      ],
      take,
      select: messageColumns,
    });
  }
}
