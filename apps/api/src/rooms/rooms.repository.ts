import type { RoomType } from '@tos-chat/shared';
import { PrismaService } from '../prisma/prisma.service.js';
import { Injectable } from '@nestjs/common';

export interface Room {
  id: string;
  name: string;
  description: string | null;
  type: RoomType;
  ownerId: string;
  createdAt: Date;
}

export interface RoomForViewer extends Room {
  isMember: boolean;
}

export interface RoomForJoin extends RoomForViewer {
  passwordHash: string | null;
}

export interface NewRoom {
  name: string;
  description: string | null;
  type: RoomType;
  passwordHash: string | null;
  ownerId: string;
}

export interface RoomChanges {
  name?: string;
  description?: string | null;
  passwordHash?: string | null;
}

const roomColumns = {
  id: true,
  name: true,
  description: true,
  type: true,
  ownerId: true,
  createdAt: true,
} as const;

@Injectable()
export class RoomsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createWithOwner(room: NewRoom): Promise<Room> {
    return this.prisma.room.create({
      data: {
        ...room,
        memberships: {
          create: {
            userId: room.ownerId,
            role: 'OWNER',
          },
        },
      },
      select: roomColumns,
    });
  }

  async findAllForViewer(viewerId: string): Promise<RoomForViewer[]> {
    const rows = await this.prisma.room.findMany({
      select: {
        ...roomColumns,
        memberships: {
          where: {
            userId: viewerId,
          },
          select: {
            userId: true,
          },
        },
      },
      orderBy: [
        {
          createdAt: 'asc',
        },
        {
          id: 'asc',
        },
      ],
    });

    return rows.map(({ memberships, ...room }) => ({
      ...room,
      isMember: memberships.length > 0,
    }));
  }

  async findById(id: string): Promise<Room | null> {
    return this.prisma.room.findUnique({
      where: { id },
      select: roomColumns,
    });
  }

  async findForJoin(id: string, userId: string): Promise<RoomForJoin | null> {
    const row = await this.prisma.room.findUnique({
      where: { id },
      select: {
        ...roomColumns,
        passwordHash: true,
        memberships: {
          where: {
            userId,
          },
          select: {
            userId: true,
          },
        },
      },
    });

    if (!row) return null;

    const { memberships, ...room } = row;
    return { ...room, isMember: memberships.length > 0 };
  }

  async isMember(userId: string, roomId: string): Promise<boolean> {
    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_roomId: { userId, roomId },
      },
      select: { userId: true },
    });

    return membership !== null;
  }

  async addMember(userId: string, roomId: string): Promise<void> {
    // `upsert` can throw P2002 when joins race. This insert ignores a duplicate.
    await this.prisma.membership.createMany({
      data: { userId, roomId, role: 'MEMBER' },
      skipDuplicates: true,
    });
  }

  async removeMember(userId: string, roomId: string): Promise<void> {
    await this.prisma.membership.deleteMany({
      where: { userId, roomId },
    });
  }

  async update(id: string, changes: RoomChanges): Promise<Room> {
    return this.prisma.room.update({
      where: { id },
      data: changes,
      select: roomColumns,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.room.delete({
      where: { id },
    });
  }
}
