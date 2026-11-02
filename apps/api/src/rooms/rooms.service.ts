import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  type Room,
  type RoomForViewer,
  RoomsRepository,
} from './rooms.repository.js';
import { CreateRoomDto } from './create-room.dto.js';
import { UpdateRoomDto } from './update-room.dto.js';

@Injectable()
export class RoomsService {
  constructor(private readonly rooms: RoomsRepository) {}

  async create(ownerId: string, dto: CreateRoomDto): Promise<RoomForViewer> {
    const room = await this.rooms.createWithOwner({
      name: dto.name,
      description: dto.description ?? null,
      ownerId,
    });

    return {
      ...room,
      isMember: true,
    };
  }

  async list(viewerId: string): Promise<RoomForViewer[]> {
    return this.rooms.findAllForViewer(viewerId);
  }

  private async findOwnedRoom(userId: string, roomId: string): Promise<Room> {
    const room = await this.rooms.findById(roomId);

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    if (room.ownerId !== userId) {
      throw new ForbiddenException('Only the room owner can do this');
    }

    return room;
  }

  async update(
    userId: string,
    roomId: string,
    dto: UpdateRoomDto,
  ): Promise<RoomForViewer> {
    await this.findOwnedRoom(userId, roomId);

    const room = await this.rooms.update(roomId, {
      name: dto.name,
      description: dto.description,
    });

    return {
      ...room,
      isMember: true,
    };
  }

  async remove(userId: string, roomId: string): Promise<void> {
    await this.findOwnedRoom(userId, roomId);
    await this.rooms.delete(roomId);
  }
}
