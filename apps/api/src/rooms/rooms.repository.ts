import { PrismaService } from '../prisma/prisma.service.js';
import { Injectable } from '@nestjs/common';

export interface Room {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  createdAt: Date;
}

export interface RoomForViewer extends Room {
  isMember: boolean;
}

export interface NewRoom {
  name: string;
  description: string | null;
  ownerId: string;
}

export interface RoomChanges {
  name?: string;
  description?: string | null;
}

const roomColumns = {
  id: true,
  name: true,
  description: true,
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
