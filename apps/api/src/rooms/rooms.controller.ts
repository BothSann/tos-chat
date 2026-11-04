import {
  Body,
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { RoomsService } from './rooms.service.js';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
import { CreateRoomDto } from './create-room.dto.js';
import { RoomResponse } from './room.response.js';
import { ParseCuidPipe } from '../common/parse-cuid.pipe.js';
import { UpdateRoomDto } from './update-room.dto.js';
import { JoinRoomDto } from './join-room.dto.js';

@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Post()
  async create(
    @Session() session: UserSession,
    @Body() dto: CreateRoomDto,
  ): Promise<RoomResponse> {
    const room = await this.roomsService.create(session.user.id, dto);
    return RoomResponse.from(room);
  }

  @Get()
  async list(@Session() session: UserSession): Promise<RoomResponse[]> {
    const rooms = await this.roomsService.list(session.user.id);
    return rooms.map((room) => RoomResponse.from(room));
  }

  @Patch(':id')
  async update(
    @Session() session: UserSession,
    @Param('id', new ParseCuidPipe('Room')) id: string,
    @Body() dto: UpdateRoomDto,
  ): Promise<RoomResponse> {
    const room = await this.roomsService.update(session.user.id, id, dto);
    return RoomResponse.from(room);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Session() session: UserSession,
    @Param('id', new ParseCuidPipe('Room')) id: string,
  ): Promise<void> {
    await this.roomsService.remove(session.user.id, id);
  }

  @Post(':id/join')
  @HttpCode(HttpStatus.OK)
  async join(
    @Session() session: UserSession,
    @Param('id', new ParseCuidPipe('Room')) id: string,
    @Body() dto: JoinRoomDto,
  ): Promise<RoomResponse> {
    const room = await this.roomsService.join(session.user.id, id, dto);

    return RoomResponse.from(room);
  }

  @Post(':id/leave')
  @HttpCode(HttpStatus.NO_CONTENT)
  async leave(
    @Session() session: UserSession,
    @Param('id', new ParseCuidPipe('Room')) id: string,
  ): Promise<void> {
    await this.roomsService.leave(session.user.id, id);
  }
}
