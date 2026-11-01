import { Injectable } from '@nestjs/common';
import { RoomForViewer, RoomsRepository } from './rooms.repository.js';
import { CreateRoomDto } from './create-room.dto.js';

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
}
