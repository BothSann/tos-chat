import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  type Room,
  type RoomForViewer,
  RoomsRepository,
} from './rooms.repository.js';
import { CreateRoomDto } from './create-room.dto.js';
import { UpdateRoomDto } from './update-room.dto.js';
import { hash, verify } from 'argon2';
import { JoinRoomDto } from './join-room.dto.js';

function passwordOnPublicRoom(): UnprocessableEntityException {
  return new UnprocessableEntityException({
    message: 'Validation failed',
    fields: { password: ['password is only for private rooms'] },
  });
}

@Injectable()
export class RoomsService {
  constructor(private readonly rooms: RoomsRepository) {}

  async create(ownerId: string, dto: CreateRoomDto): Promise<RoomForViewer> {
    const type = dto.type ?? 'PUBLIC';
    if (type === 'PUBLIC' && dto.password !== undefined) {
      throw passwordOnPublicRoom();
    }

    const room = await this.rooms.createWithOwner({
      name: dto.name,
      description: dto.description ?? null,
      type,
      passwordHash:
        dto.password === undefined ? null : await hash(dto.password),
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

  private async findRoom(roomId: string): Promise<Room> {
    const room = await this.rooms.findById(roomId);

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    return room;
  }

  async assertMember(userId: string, roomId: string): Promise<void> {
    await this.findRoom(roomId);

    if (!(await this.rooms.isMember(userId, roomId))) {
      throw new ForbiddenException('Only room members can do this');
    }
  }

  private async findOwnedRoom(userId: string, roomId: string): Promise<Room> {
    const room = await this.findRoom(roomId);

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
    const owned = await this.findOwnedRoom(userId, roomId);
    if (owned.type === 'PUBLIC' && dto.password !== undefined) {
      throw passwordOnPublicRoom();
    }

    const room = await this.rooms.update(roomId, {
      name: dto.name,
      description: dto.description,
      passwordHash:
        dto.password === undefined ? undefined : await hash(dto.password),
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

  private async checkPassword(
    passwordHash: string | null,
    password: string | null | undefined,
  ): Promise<void> {
    const isRight =
      passwordHash !== null &&
      !!password &&
      (await verify(passwordHash, password));

    if (!isRight) {
      throw new ForbiddenException('Wrong room password');
    }
  }

  async join(
    userId: string,
    roomId: string,
    dto: JoinRoomDto,
  ): Promise<RoomForViewer> {
    const target = await this.rooms.findForJoin(roomId, userId);

    if (!target) {
      throw new NotFoundException('Room not found');
    }

    const { passwordHash, isMember, ...room } = target;
    if (!isMember) {
      if (room.type === 'PRIVATE') {
        await this.checkPassword(passwordHash, dto.password);
      }

      await this.rooms.addMember(userId, roomId);
    }

    return { ...room, isMember: true };
  }

  async leave(userId: string, roomId: string): Promise<void> {
    const room = await this.findRoom(roomId);

    if (room.ownerId === userId) {
      throw new ForbiddenException('Delete the room instead');
    }

    await this.rooms.removeMember(userId, roomId);
  }
}
