import {
  IsIn,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { Trim } from '../common/trim.decorator.js';
import type { RoomType } from '@tos-chat/shared';

const ROOM_TYPES: readonly RoomType[] = ['PRIVATE', 'PUBLIC'];

export class CreateRoomDto {
  @Trim()
  @IsString()
  @Length(3, 40)
  name: string;

  @Trim({ blankAs: undefined })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  @ValidateIf((_, value) => value !== undefined)
  @IsIn(ROOM_TYPES)
  type?: RoomType;

  @ValidateIf(
    (dto: CreateRoomDto, value) =>
      dto.type === 'PRIVATE' || value !== undefined,
  )
  @IsString()
  @Length(8, 128)
  password?: string;
}
